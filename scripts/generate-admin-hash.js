#!/usr/bin/env node

/**
 * Script pour générer le hash SHA-256 d'une adresse wallet eCash
 * Utilisé pour configurer VITE_ADMIN_HASH dans .env.local
 * 
 * Usage: node scripts/generate-admin-hash.js <votre-adresse-ecash>
 * 
 * Exemple:
 * node scripts/generate-admin-hash.js ecash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy
 * 
 * Le hash généré doit être ajouté dans .env.local :
 * VITE_ADMIN_HASH=<hash-généré>
 */

const crypto = require('crypto');

// Récupérer l'adresse depuis les arguments
const address = process.argv[2];

if (!address) {
  console.error('❌ Erreur: Veuillez fournir une adresse eCash');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/generate-admin-hash.js <adresse-ecash>');
  console.log('');
  console.log('Exemple:');
  console.log('  node scripts/generate-admin-hash.js ecash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy');
  process.exit(1);
}

// Générer le hash SHA-256
const hash = crypto.createHash('sha256').update(address).digest('hex');

console.log('');
console.log('✅ Hash généré avec succès !');
console.log('');
console.log('📋 Adresse wallet:');
console.log('  ' + address);
console.log('');
console.log('🔐 Hash SHA-256:');
console.log('  ' + hash);
console.log('');
console.log('📝 Ajoutez cette ligne dans votre fichier .env.local :');
console.log('');
console.log('  VITE_ADMIN_HASH=' + hash);
console.log('');
console.log('⚠️  Important:');
console.log('  - Ne partagez JAMAIS ce hash publiquement');
console.log('  - Ne le committez PAS dans Git');
console.log('  - Redémarrez le serveur après modification du .env.local');
console.log('');
