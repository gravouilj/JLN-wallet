/**
 * Professional eCash Wallet Service - HYBRID APPROACH
 * Uses ecashaddrjs for address encoding (reliable)
 * Uses ecash-lib v4.5.2 for cryptography and transactions
 * 
 * References:
 * - https://github.com/Bitcoin-ABC/ecashaddrjs
 * - https://github.com/bitcoin-abc/bitcoin-abc/tree/main/modules/ecash-lib
 * - https://www.npmjs.com/package/ecash-lib
 */

import chronikManager from './chronikClient';
import {
  Ecc,
  Script,
  TxBuilder,
  P2PKHSignatory,
  fromHex,
  toHex,
  shaRmd160,
  ALL_BIP143,
} from 'ecash-lib';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import * as ecashaddr from 'ecashaddrjs'; // Import global pour gérer CommonJS/ESM

/**
 * Encode pubkey hash to eCash address using ecashaddrjs (reliable)
 * @param {Uint8Array} pkh - 20-byte public key hash
 * @returns {string} eCash address (ecash:qp...)
 */
function encodeCashAddress(pkh) {
  // On cherche la fonction : elle peut s'appeler 'encode' ou 'encodeCashAddress' selon la version
  const encoder = ecashaddr.encode || ecashaddr.encodeCashAddress || ecashaddr.default?.encode;
  
  if (!encoder) {
    console.error("DEBUG ECASHADDR:", ecashaddr);
    throw new Error("Impossible de trouver la fonction d'encodage dans ecashaddrjs");
  }
  
  return encoder('ecash', 'p2pkh', pkh);
}

/**
 * Decode eCash address to get pkh using ecashaddrjs
 * @param {string} addressString - eCash address (ecash:qp...)
 * @returns {Uint8Array} 20-byte public key hash
 */
function decodeCashAddress(addressString) {
  // Idem pour le décodage
  const decoder = ecashaddr.decode || ecashaddr.decodeCashAddress || ecashaddr.default?.decode;
  
  if (!decoder) {
    throw new Error("Impossible de trouver la fonction de décodage");
  }
  
  const { hash } = decoder(addressString, true);
  return hash;
}

/**
 * eCash Wallet Class
 * Hybrid implementation: ecashaddrjs for addresses, ecash-lib for transactions
 */
export class EcashWallet {
  constructor(mnemonic) {
    console.log('🏗️ EcashWallet constructor called');
    this.mnemonic = mnemonic;
    
    // Utiliser le gestionnaire Chronik centralisé (singleton)
    this.chronikManager = chronikManager;
    
    // Cache simple pour réduire les appels API
    this.balanceCache = null;
    this.balanceCacheTime = 0;
    this.tokenInfoCache = new Map(); // Map<tokenId, {info, timestamp}>
    this.CACHE_TTL = 10000; // 10 secondes
    
    // 1. Dérivation (Standard eCash)
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const derivedKey = hdKey.derive("m/44'/1899'/0'/0/0");
    
    this.sk = derivedKey.privateKey;
    this.pk = derivedKey.publicKey;
    
    // 2. Setup ecash-lib (Pour les transactions)
    this.ecc = new Ecc();
    this.pkh = shaRmd160(this.pk);
    this.p2pkh = Script.p2pkh(this.pkh); // Script pour signer
    
    // 3. Setup Adresse UI (Avec ecashaddrjs - Pour l'affichage)
    // C'est ici que ça plantait avant. Maintenant c'est solide.
    this.addressStr = encodeCashAddress(this.pkh);
    
    console.log("✅ Wallet Address:", this.addressStr);
  }

  /**
   * Get wallet address (string)
   */
  getAddress() {
    return this.addressStr;
  }

  /**
   * Get private key as hex
   */
  getPrivateKeyHex() {
    return toHex(this.sk);
  }

  /**
   * Get public key as hex
   */
  getPublicKeyHex() {
    return toHex(this.pk);
  }

  /**
   * Get XEC balance and detailed UTXO info
   */
  async getBalance(forceRefresh = false) {
    try {
      const now = Date.now();
      
      // Return cached balance if available and fresh
      if (
        !forceRefresh &&
        this.balanceCache &&
        now - this.balanceCacheTime < this.CACHE_TTL
      ) {
        console.log('💰 Using cached balance (age:', Math.round((now - this.balanceCacheTime) / 1000), 's)');
        return this.balanceCache;
      }
      
      // Get Chronik client from manager
      const chronik = await this.chronikManager.getClient();
      
      console.log('💰 Fetching UTXOs...');
      
      // Query UTXOs from Chronik
      const utxos = await chronik.script('p2pkh', toHex(this.pkh)).utxos();
      
      // DEBUG: Log raw structure with BigInt converted to string
      console.log('🔍 RAW UTXOS:', JSON.stringify(utxos, (k, v) => 
        typeof v === 'bigint' ? v.toString() : v
      ));
      
      let totalSats = 0n;
      let spendableSats = 0n; // XEC purs uniquement (sans token dust)
      let pureXecUtxos = [];
      let tokenUtxos = [];
      
      // PARSING DÉFENSIF: Support à la fois Chronik v2 et v3
      for (const utxo of utxos.utxos) {
        // 1. Parsing XEC (Blindé)
        // On cherche 'sats' OU 'value' OU on met 0
        let amountVal = utxo.sats !== undefined ? utxo.sats : utxo.value;
        const sats = BigInt(amountVal || 0);
        
        totalSats += sats;
        
        // 2. Parsing Token (Blindé)
        if (utxo.token) {
          // On cherche 'atoms' OU 'amount'
          let tokenAmountVal = utxo.token.atoms !== undefined ? utxo.token.atoms : utxo.token.amount;
          // On normalise pour l'usage interne
          utxo.token.atoms = BigInt(tokenAmountVal || 0);
          tokenUtxos.push({ ...utxo, sats }); // Store normalized sats as BigInt
        } else {
          spendableSats += sats; // Seulement les UTXOs sans token
          pureXecUtxos.push({ ...utxo, sats }); // Store normalized sats as BigInt
        }
      }
      
      // Conversion BigInt → Number pour React
      const spendableXec = Number(spendableSats) / 100; // XEC purs
      const totalXec = Number(totalSats) / 100; // XEC totaux (purs + token dust)
      
      const tokenDustXec = totalXec - spendableXec; // Token dust en XEC
      
      const result = {
        balance: spendableXec, // Number (XEC spendable, sans token dust)
        totalBalance: totalXec, // Number (XEC total, incluant token dust)
        balanceSats: spendableSats, // BigInt (XEC spendable en satoshis)
        totalBalanceSats: totalSats, // BigInt (XEC total en satoshis)
        balanceBreakdown: {
          spendableBalance: spendableXec, // XEC spendable
          totalBalance: totalXec,         // XEC total
          tokenDustValue: tokenDustXec,   // Token dust en XEC
          pureXecUtxos: pureXecUtxos.length,
          tokenUtxos: tokenUtxos.length
        },
        utxos: {
          pureXec: pureXecUtxos,
          token: tokenUtxos
        }
      };
      
      console.log('✅ Balance calculated:', {
        spendableXec: spendableXec + ' XEC',
        totalXec: totalXec + ' XEC',
        spendableSats: spendableSats.toString() + ' sats',
        totalSats: totalSats.toString() + ' sats',
        pureXecUtxos: pureXecUtxos.length,
        tokenUtxos: tokenUtxos.length
      });
      
      // Update cache
      this.balanceCache = result;
      this.balanceCacheTime = now;
      
      return result;
    } catch (error) {
      console.error('❌ Error getting balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get detailed balance (for useEcashBalance compatibility)
   */
  async getDetailedBalance() {
    return this.getBalance();
  }

  /**
   * Get token balance and info for a specific token ID
   */
  async getTokenBalance(tokenId) {
    try {
      const chronik = await this.chronikManager.getClient();
      
      const scriptUtxos = await chronik.script('p2pkh', toHex(this.pkh)).utxos();
      
      let tokenAmount = 0n;
      const tokenUtxos = [];
      
      for (const utxo of scriptUtxos.utxos) {
        if (utxo.token && utxo.token.tokenId === tokenId) {
          // PARSING DÉFENSIF: Support 'atoms' OU 'amount'
          let tokenAmountVal = utxo.token.atoms !== undefined ? utxo.token.atoms : utxo.token.amount;
          const atoms = BigInt(tokenAmountVal || 0);
          tokenAmount += atoms;
          
          // Parsing XEC de l'UTXO (sats OU value)
          let satsVal = utxo.sats !== undefined ? utxo.sats : utxo.value;
          
          tokenUtxos.push({
            outpoint: utxo.outpoint,
            sats: BigInt(satsVal || 0), // Utilise la valeur parsée
            tokenAmount: atoms, // Utilise atoms parsé (BigInt)
            tokenId: utxo.token.tokenId,
            blockHeight: utxo.blockHeight,
          });
        }
      }
      
      return {
        tokenId: tokenId,
        balance: tokenAmount.toString(), // String (safe pour React)
        utxos: tokenUtxos
      };
    } catch (error) {
      console.error('❌ Error getting token balance:', error);
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  /**
   * Get token info (genesis info)
   */
  async getTokenInfo(tokenId, forceRefresh = false) {
    try {
      const now = Date.now();
      
      // Check cache first
      const cached = this.tokenInfoCache.get(tokenId);
      if (
        !forceRefresh &&
        cached &&
        now - cached.timestamp < this.CACHE_TTL
      ) {
        console.log('🪙 Using cached token info for', tokenId.substring(0, 8), '... (age:', Math.round((now - cached.timestamp) / 1000), 's)');
        return cached.info;
      }
      
      // Get Chronik client from manager
      const chronik = await this.chronikManager.getClient();
      
      const tokenInfo = await chronik.token(tokenId);
      const result = {
        tokenId: tokenId,
        tokenType: tokenInfo.tokenType,
        genesisInfo: tokenInfo.genesisInfo,
        timeFirstSeen: tokenInfo.timeFirstSeen,
        block: tokenInfo.block,
      };
      
      // Update cache
      this.tokenInfoCache.set(tokenId, {
        info: result,
        timestamp: now
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error getting token info:', error);
      throw new Error(`Failed to get token info: ${error.message}`);
    }
  }

  /**
   * Send XEC to an address (International Version with Sanitization)
   */
  async sendXec(toAddress, amountXec) {
    try {
      const chronik = await this.chronikManager.getClient();
      
      console.log(`🚀 REÇU Brut : "${amountXec}" (Type: ${typeof amountXec})`);

      // 1. NETTOYAGE UNIVERSEL (Sanitization)
      // Etape A : Conversion en String pure
      let cleanStr = String(amountXec).trim();
      
      // Etape B : Suppression des espaces (ex: "1 000" -> "1000")
      cleanStr = cleanStr.replace(/\s/g, '');
      
      // Etape C : Remplacement Virgule par Point (ex: "10,5" -> "10.5")
      cleanStr = cleanStr.replace(',', '.');
      
      console.log(`🧹 Nettoyé pour calcul : "${cleanStr}"`);

      const amountNum = Number(cleanStr);

      // Validation stricte
      if (isNaN(amountNum)) {
        throw new Error(`Montant invalide. Impossible de lire : "${amountXec}"`);
      }

      // 2. CONVERSION ET CALCULS
      // Math.round gère les décimales flottantes (ex: 10.555 -> 1056 sats)
      const satsToSend = BigInt(Math.round(amountNum * 100));
      const DUST_LIMIT = 546n;
      const FEE_FIXED = 300n; // 3 XEC

      if (satsToSend < DUST_LIMIT) {
        throw new Error("Montant trop faible (Min 5.46 XEC).");
      }

      // 3. PRÉPARATION
      const decoded = decodeCashAddress(toAddress);
      
      // CORRECTION CRITIQUE : Conversion String Hex -> Uint8Array
      // Si c'est une string (40 chars), on la convertit. Sinon on la garde.
      const pkh = typeof decoded === 'string' ? fromHex(decoded) : decoded;
      
      const targetScript = Script.p2pkh(pkh);
      
      const balanceData = await this.getBalance();
      const utxos = balanceData.utxos.pureXec;

      if (utxos.length === 0) throw new Error("Portefeuille vide.");

      let inputSats = 0n;
      const inputs = [];
      
      for (const utxo of utxos) {
        inputSats += utxo.sats;
        inputs.push({
          input: {
            prevOut: { txid: utxo.outpoint.txid, outIdx: utxo.outpoint.outIdx },
            signData: { sats: utxo.sats, outputScript: this.p2pkh }
          },
          signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
      }

      console.log(`💰 Solde Dispo: ${Number(inputSats)/100} XEC`);

      // 4. VÉRIFICATION
      if (inputSats < (satsToSend + FEE_FIXED)) {
        const missing = Number(satsToSend + FEE_FIXED - inputSats) / 100;
        throw new Error(`Fonds insuffisants. Manque ${missing.toFixed(2)} XEC.`);
      }

      // 5. CALCUL CHANGE
      const changeSats = inputSats - satsToSend - FEE_FIXED;
      
      // 6. OUTPUTS
      const outputs = [
        { sats: satsToSend, script: targetScript }
      ];

      if (changeSats > DUST_LIMIT) {
        outputs.push({ sats: changeSats, script: this.p2pkh });
      }

      // 7. SIGNATURE
      const txBuild = new TxBuilder({ inputs, outputs });
      const tx = txBuild.sign({ feePerKb: 1000n, dustSats: DUST_LIMIT });
      
      console.log("📡 Diffusion...");
      const response = await chronik.broadcastTx(tx.toHex());
      console.log("✅ SUCCÈS TXID:", response.txid);
      
      return { txid: response.txid };

    } catch (err) {
      console.error("❌ Erreur sendXec:", err);
      throw err;
    }
  }

  /**
   * Construit le script GENESIS pour ALP
   */
  _buildAlpGenesis(ticker, name, url, decimals, authPubkey) {
    const lokadId = '414c5000'; // ALP
    const tokenType = '01';     // Standard
    const action = '47454e45534953'; // 'GENESIS' en hex
    
    // Encodage des champs string en Hex
    const strToHex = (str) => Buffer.from(str || '').toString('hex');
    
    // Helper pour construire les pushdata correctement
    const toPush = (hexStr) => {
      const len = hexStr.length / 2;
      if (len === 0) return '4c00'; // Push empty
      if (len <= 75) return len.toString(16).padStart(2, '0') + hexStr;
      return '4c' + len.toString(16).padStart(2, '0') + hexStr; // OP_PUSHDATA1
    };

    // Construction du script OP_RETURN (limite ~220 bytes)
    let script = '6a'; // OP_RETURN
    script += toPush(lokadId);
    script += toPush(tokenType);
    script += toPush(action);
    script += toPush(strToHex(ticker));
    script += toPush(strToHex(name));
    script += toPush(strToHex(url));
    script += toPush(decimals.toString(16).padStart(2, '0')); // 1 byte
    script += toPush(''); // Data arbitraire (vide)
    script += toPush(authPubkey); // Auth Pubkey (pour reminter plus tard)
    
    return new Script(fromHex(script));
  }

  /**
   * Construit le script OP_RETURN pour Token (Supporte SLP et ALP)
   */
  _buildTokenScript(protocol, tokenId, amount1, amount2 = 0n) {
    // Détection du protocole
    const isAlp = protocol && protocol.toUpperCase() === 'ALP';
    // LOKAD ID : ALP = 414c5000 | SLP = 534c5000
    const lokadId = isAlp ? '414c5000' : '534c5000'; 
    const tokenType = '01';
    const action = '53454e44'; // 'SEND'
    
    const toHex64 = (n) => n.toString(16).padStart(16, '0');
    
    let scriptHex = '6a' + // OP_RETURN
      '04' + lokadId + 
      '01' + tokenType + 
      '04' + action + 
      '20' + tokenId + 
      '08' + toHex64(amount1); // Montant destinataire
    
    if (amount2 > 0n) {
      scriptHex += '08' + toHex64(amount2); // Montant change
    }
    
    return new Script(fromHex(scriptHex));
  }

  /**
   * Envoi universel de Tokens (Compatible ALP/SLP et Décimales)
   */
  async sendToken(tokenId, toAddress, amountToken, decimals = 0, protocol = 'SLP') {
    try {
      await this.chronikInitPromise;
      
      const safeProtocol = (protocol && protocol.toUpperCase() === 'ALP') ? 'ALP' : 'SLP';
      console.log(`🚀 Envoi ${safeProtocol} ${tokenId}: ${amountToken} (Dec: ${decimals})`);

      // 1. Conversion Montant (String -> Atoms)
      let cleanStr = String(amountToken).replace(',', '.').trim();
      const amountNum = Number(cleanStr);
      if (isNaN(amountNum)) throw new Error("Montant token invalide");
      
      // Gestion des décimales (ex: 1.50 EVA avec 2 décimales = 150 atoms)
      const sendAtoms = BigInt(Math.round(amountNum * (10 ** decimals)));

      if (sendAtoms <= 0n) throw new Error("Le montant doit être positif");

      // 2. Préparation
      // Utilise le helper decodeCashAddress existant dans le fichier
      const decoded = decodeCashAddress(toAddress);
      const pkh = typeof decoded === 'string' ? fromHex(decoded) : decoded;
      const targetScript = Script.p2pkh(pkh);
      
      // 3. Récupération des données
      const tokenData = await this.getTokenBalance(tokenId);
      const balanceData = await this.getBalance();
      
      if (BigInt(tokenData.balance) < sendAtoms) {
        throw new Error(`Solde ${safeProtocol} insuffisant.`);
      }

      // 4. Sélection Inputs TOKEN
      let inputAtoms = 0n;
      const inputs = [];
      
      for (const utxo of tokenData.utxos) {
        inputAtoms += utxo.tokenAmount;
        inputs.push({
          input: {
            prevOut: { txid: utxo.outpoint.txid, outIdx: utxo.outpoint.outIdx },
            signData: { sats: utxo.sats, outputScript: this.p2pkh }
          },
          signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
        if (inputAtoms >= sendAtoms) break;
      }

      // 5. Sélection Inputs XEC (Frais)
      const FEE_FIXED = 1000n; // 10 XEC de frais (Large sécurité pour tx complexe)
      const DUST_COST = 546n * 2n; // 2 Outputs potentiels (Dest + Change Token)
      const REQUIRED_XEC = FEE_FIXED + DUST_COST;
      
      let inputSatsXec = 0n;
      const xecUtxos = balanceData.utxos.pureXec;
      
      for (const utxo of xecUtxos) {
        inputSatsXec += utxo.sats;
        inputs.push({
          input: {
            prevOut: { txid: utxo.outpoint.txid, outIdx: utxo.outpoint.outIdx },
            signData: { sats: utxo.sats, outputScript: this.p2pkh }
          },
          signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
        if (inputSatsXec >= REQUIRED_XEC) break;
      }

      if (inputSatsXec < REQUIRED_XEC) throw new Error("Pas assez de XEC pour payer les frais (Gaz)");

      // 6. Outputs
      const outputs = [];
      const changeAtoms = inputAtoms - sendAtoms;
      
      // A. OP_RETURN
      const opReturnScript = this._buildTokenScript(safeProtocol, tokenId, sendAtoms, changeAtoms);
      outputs.push({ sats: 0n, script: opReturnScript });

      // B. Destinataire Token
      outputs.push({ sats: 546n, script: targetScript });

      // C. Change Token
      if (changeAtoms > 0n) {
        outputs.push({ sats: 546n, script: this.p2pkh });
      }

      // D. Change XEC
      let totalSatsIn = 0n;
      inputs.forEach(i => totalSatsIn += i.input.signData.sats);
      
      let currentOutputsCost = 0n;
      outputs.forEach(o => currentOutputsCost += o.sats);
      
      const changeXec = totalSatsIn - currentOutputsCost - FEE_FIXED;
      
      if (changeXec > 546n) {
        outputs.push({ sats: changeXec, script: this.p2pkh });
      }

      // 7. Sign & Broadcast
      const txBuild = new TxBuilder({ inputs, outputs });
      const tx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });
      
      console.log("📡 Diffusion Token Tx...");
      const response = await chronik.broadcastTx(tx.toHex());
      console.log("✅ SUCCÈS TXID:", response.txid);
      return { txid: response.txid };

    } catch (err) {
      console.error("❌ Erreur SendToken:", err);
      throw err;
    }
  }

  /**
   * Get max sendable XEC amount (balance - fees)
   */
  async getMaxSendAmount() {
    try {
      const balanceData = await this.getBalance();
      const balanceSats = balanceData.balanceSats;
      
      // Estimate fee (rough estimate: 250 bytes * 1 sat/byte)
      const estimatedFee = 250n;
      const maxSendSats = balanceSats - estimatedFee;
      
      if (maxSendSats < 546n) {
        return 0;
      }
      
      return Number(maxSendSats) / 100; // Convert to XEC
    } catch (error) {
      console.error('❌ Error calculating max send:', error);
      return 0;
    }
  }

  /**
   * Créer un nouveau jeton (Token Genesis)
   * @param {Object} params - { name, ticker, url, decimals, quantity, isFixedSupply }
   */
  async createToken(params) {
    try {
      const chronik = await this.chronikManager.getClient();
      
      const { name, ticker, url, decimals, quantity, isFixedSupply = false } = params;
      console.log(`🚀 Création Jeton: ${name} (${isFixedSupply ? 'Offre Fixe' : 'Offre Variable'})`);

      // 1. Préparation
      const balanceData = await this.getBalance();
      const xecUtxos = balanceData.utxos.pureXec;
      
      // Frais un peu plus élevés pour une Genesis
      const FEE_FIXED = 2000n; // 20 XEC
      const DUST_LIMIT = 546n;
      
      // 2. Sélection Inputs (XEC uniquement)
      let inputSats = 0n;
      const inputs = [];
      
      for (const utxo of xecUtxos) {
        inputSats += utxo.sats;
        inputs.push({
          input: {
            prevOut: { txid: utxo.outpoint.txid, outIdx: utxo.outpoint.outIdx },
            signData: { sats: utxo.sats, outputScript: this.p2pkh }
          },
          signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
      }

      if (inputSats < FEE_FIXED + DUST_LIMIT) {
        throw new Error("Pas assez de XEC pour créer le jeton (min ~25 XEC)");
      }

      // 3. Outputs
      const outputs = [];
      
      // A. OP_RETURN Genesis (Index 0)
      const genesisScript = this._buildAlpGenesis(ticker, name, url, decimals, toHex(this.pk));
      outputs.push({ sats: 0n, script: genesisScript });

      // B. Mint initial - Les jetons arrivent sur ton wallet (Index 1)
      const initialQty = BigInt(quantity) * (10n ** BigInt(decimals));
      outputs.push({ sats: DUST_LIMIT, script: this.p2pkh });
      
      // C. Mint Baton (Index 2) - Seulement si Offre Variable
      // Le Mint Baton permet de créer plus de jetons plus tard
      // Si Offre Fixe, on ne crée PAS ce output
      if (!isFixedSupply) {
        console.log("✅ Création du Mint Baton (Offre Variable)");
        outputs.push({ sats: DUST_LIMIT, script: this.p2pkh });
      } else {
        console.log("🔒 Offre Fixe - Pas de Mint Baton (Offre bloquée à jamais)");
      }

      // D. Change XEC
      // Calcul du coût total des outputs (inclut le Mint Baton si créé)
      const outputCost = outputs.reduce((acc, out) => acc + out.sats, 0n);
      const changeXec = inputSats - FEE_FIXED - outputCost;
      
      if (changeXec > DUST_LIMIT) {
        outputs.push({ sats: changeXec, script: this.p2pkh });
      }

      // 4. Sign & Broadcast
      const txBuild = new TxBuilder({ inputs, outputs });
      const tx = txBuild.sign({ feePerKb: 1000n, dustSats: DUST_LIMIT });
      
      const response = await chronik.broadcastTx(tx.toHex());
      console.log("🎉 Token Créé ! TXID:", response.txid);
      return { 
        txid: response.txid, 
        ticker, 
        name,
        isFixedSupply 
      };

    } catch (err) {
      console.error("❌ Erreur CreateToken:", err);
      throw err;
    }
  }

  /**
   * List all eTokens in wallet
   */
  async listETokens() {
    try {
      const chronik = await this.chronikManager.getClient();
      
      const scriptUtxos = await chronik.script('p2pkh', toHex(this.pkh)).utxos();
      
      const tokenMap = new Map();
      
      for (const utxo of scriptUtxos.utxos) {
        if (utxo.token) {
          const tokenId = utxo.token.tokenId;
          const amount = BigInt(utxo.token.amount);
          
          if (tokenMap.has(tokenId)) {
            tokenMap.set(tokenId, tokenMap.get(tokenId) + amount);
          } else {
            tokenMap.set(tokenId, amount);
          }
        }
      }
      
      // Get token info for each
      const tokens = [];
      for (const [tokenId, balance] of tokenMap.entries()) {
        try {
          const info = await this.getTokenInfo(tokenId);
          tokens.push({
            tokenId,
            balance: balance.toString(),
            ...info,
          });
        } catch (err) {
          console.warn(`Could not fetch info for token ${tokenId}`);
          tokens.push({
            tokenId,
            balance: balance.toString(),
          });
        }
      }
      
      return tokens;
    } catch (error) {
      console.error('❌ Error listing tokens:', error);
      throw new Error(`Failed to list tokens: ${error.message}`);
    }
  }

  /**
   * Get all token IDs for which this wallet has mint batons
   * Mint batons are UTXOs with baton category flag
   * @returns {Promise<string[]>} Array of tokenIds where user has mint authority
   */
  async getMintBatons() {
    try {
      const chronik = await this.chronikManager.getClient();
      
      const scriptUtxos = await chronik.script('p2pkh', toHex(this.pkh)).utxos();
      const mintBatonTokenIds = [];
      
      for (const utxo of scriptUtxos.utxos) {
        // Check if this UTXO has the mint baton flag
        if (utxo.token && utxo.token.isMintBaton === true) {
          mintBatonTokenIds.push(utxo.token.tokenId);
        }
      }
      
      console.log(`🔑 Mint batons trouvés (${mintBatonTokenIds.length}):`, mintBatonTokenIds);
      return mintBatonTokenIds;
    } catch (error) {
      console.error('❌ Error fetching mint batons:', error);
      throw new Error(`Failed to fetch mint batons: ${error.message}`);
    }
  }
}

/**
 * Generate a new BIP39 mnemonic
 */
export function generateMnemonic() {
  return bip39.generateMnemonic(wordlist);
}

/**
 * Validate a BIP39 mnemonic
 */
export function validateMnemonic(mnemonic) {
  return bip39.validateMnemonic(mnemonic, wordlist);
}

/**
 * Create wallet from mnemonic (v4.5.2 compatible)
 * No need for initWasm - auto-loaded since v2.0.0
 */
export async function createWallet(mnemonic) {
  console.log('🏗️ createWallet called with mnemonic:', mnemonic ? 'EXISTS' : 'NULL');
  
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }
  
  // Create wallet instance
  console.log('🔨 Creating EcashWallet instance...');
  const wallet = new EcashWallet(mnemonic);
  
  console.log('⏳ Waiting for WASM initialization...');
  // Wait for WASM initialization if needed (backward compatibility)
  await wallet.initPromise;
  
  console.log('✅ Wallet created, address:', wallet.address);
  return wallet;
}