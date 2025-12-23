import crypto from 'crypto';
import process from 'process';

const address = process.argv[2];

if (!address) {
  console.error('❌ Erreur: Veuillez fournir une adresse eCash');
  console.log('Usage: node scripts/generate-admin-hash.js <adresse>');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(address).digest('hex');

console.log(`
✅ Hash généré :
${hash}

📝 À mettre dans .env.local :
VITE_ADMIN_HASH=${hash}
`);