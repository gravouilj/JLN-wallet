/**
 * Test script pour vérifier la connexion Chronik
 */

import { ChronikClient } from 'chronik-client';

const CHRONIK_URLS = [
  'https://chronik.be.cash/xec',
  'https://chronik.pay2.house/xec'
];

async function testChronikConnection() {
  console.log('🧪 Testing Chronik connection...\n');

  for (const url of CHRONIK_URLS) {
    try {
      console.log(`📡 Testing ${url}...`);
      const client = new ChronikClient(url);
      
      const startTime = Date.now();
      const info = await client.blockchainInfo();
      const duration = Date.now() - startTime;
      
      console.log(`✅ SUCCESS! Connected in ${duration}ms`);
      console.log(`   Block height: ${info.tipHeight}`);
      console.log(`   Tip hash: ${info.tipHash.substring(0, 16)}...`);
      console.log('');
    } catch (err) {
      console.error(`❌ FAILED: ${err.message}`);
      console.log('');
    }
  }
}

testChronikConnection().catch(console.error);
