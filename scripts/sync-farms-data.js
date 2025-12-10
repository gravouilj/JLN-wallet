#!/usr/bin/env node

/**
 * Script de synchronisation manuelle des données blockchain vers farms.json
 * Utilisation: node scripts/sync-farms-data.js
 */

import { ChronikClient } from 'chronik-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHRONIK_URL = 'https://chronik.fabien.cash';
const FARMS_JSON_PATH = path.join(__dirname, '../src/data/farms.json');

async function syncTokenData(tokenId, chronik) {
  try {
    console.log(`🔄 Synchronisation ${tokenId.substring(0, 8)}...`);
    
    // Récupérer les données blockchain
    const tokenData = await chronik.token(tokenId);
    
    // Circulating supply
    let circulatingSupply = 0n;
    const utxosData = await chronik.tokenId(tokenId).utxos();
    circulatingSupply = utxosData.utxos
      .filter(utxo => !utxo.token?.isMintBaton)
      .reduce((sum, utxo) => sum + BigInt(utxo.token?.atoms || 0), 0n);
    
    // Genesis supply
    let genesisSupply = 0n;
    const genesisTx = await chronik.tx(tokenId);
    for (const output of genesisTx.outputs) {
      if (output.token && !output.token.isMintBaton) {
        genesisSupply += BigInt(output.token.atoms || 0);
      }
    }
    
    const decimals = tokenData.genesisInfo?.decimals || 0;
    const isActive = circulatingSupply > 0n;
    const isFixed = !tokenData.genesisInfo?.authPubkey || tokenData.genesisInfo.authPubkey === '';
    const isDeleted = isFixed && !isActive && genesisSupply > 0n;
    
    return {
      circulatingSupply: circulatingSupply.toString(),
      genesisSupply: genesisSupply.toString(),
      isActive,
      isDeleted,
      decimals,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Erreur sync ${tokenId.substring(0, 8)}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Démarrage synchronisation farms.json...\n');
  
  // Charger farms.json
  const farmsData = JSON.parse(fs.readFileSync(FARMS_JSON_PATH, 'utf8'));
  console.log(`📁 ${farmsData.length} fermes trouvées\n`);
  
  // Initialiser Chronik
  const chronik = new ChronikClient(CHRONIK_URL);
  
  // Synchroniser chaque ferme
  for (const farm of farmsData) {
    if (!farm.tokenId) {
      console.log(`⚠️  ${farm.name}: Pas de tokenId`);
      continue;
    }
    
    const dynamicData = await syncTokenData(farm.tokenId, chronik);
    
    if (dynamicData) {
      farm._dynamicData = {
        _note: "Données automatiquement synchronisées depuis la blockchain",
        ...dynamicData
      };
      
      console.log(`✅ ${farm.name}:`);
      console.log(`   Supply: ${dynamicData.circulatingSupply} / ${dynamicData.genesisSupply}`);
      console.log(`   Status: ${dynamicData.isActive ? '🟢 Actif' : dynamicData.isDeleted ? '🗑️ Supprimé' : '⚫ Inactif'}`);
      console.log(`   Décimales: ${dynamicData.decimals}`);
      console.log(`   Mise à jour: ${dynamicData.lastUpdated}\n`);
    }
  }
  
  // Sauvegarder farms.json mis à jour
  fs.writeFileSync(FARMS_JSON_PATH, JSON.stringify(farmsData, null, 2), 'utf8');
  console.log(`💾 farms.json mis à jour avec succès !`);
}

main().catch(console.error);
