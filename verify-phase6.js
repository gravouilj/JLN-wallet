#!/usr/bin/env node

/**
 * Verification script for Phase 6 refactoring
 * Checks that all new imports are correct and files exist
 */

const fs = require('fs');
const path = require('path');

const checks = [
  {
    name: 'useWalletScan hook',
    path: './src/hooks/useWalletScan.ts',
    shouldExport: ['useWalletScan']
  },
  {
    name: 'WalletComponents',
    path: './src/components/ClientWallet/WalletComponents.tsx',
    shouldExport: [
      'TokenBalanceCard',
      'ReceiveZone',
      'GasIndicator',
      'ProfileDropdown',
      'TabButton',
      'TokenList'
    ]
  },
  {
    name: 'SendTokenForm',
    path: './src/components/ClientWallet/SendTokenForm.tsx',
    shouldExport: ['SendTokenForm']
  },
  {
    name: 'validation utilities',
    path: './src/utils/validation.ts',
    shouldExport: [
      'isValidXECAddress',
      'isValidAmount',
      'formatAddress',
      'sanitizeInput',
      'amountToBigInt',
      'bigIntToAmount'
    ]
  },
  {
    name: 'ClientWalletPageV2',
    path: './src/pages/ClientWalletPageV2.tsx',
    shouldExport: ['default']
  }
];

console.log('\n🔍 Phase 6 Refactoring Verification\n');
console.log('════════════════════════════════════════\n');

let allPassed = true;

checks.forEach((check) => {
  const fullPath = path.join(__dirname, check.path);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${check.name}`);
    console.log(`   File not found: ${check.path}\n`);
    allPassed = false;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const missing = [];

  check.shouldExport.forEach((exportName) => {
    const exportPattern = exportName === 'default'
      ? /^export default\s+/m
      : new RegExp(`export\\s+(const|function|class)\\s+${exportName}\\b`, 'm');

    if (!exportPattern.test(content)) {
      missing.push(exportName);
    }
  });

  if (missing.length === 0) {
    console.log(`✅ ${check.name}`);
    console.log(`   ✓ File exists: ${check.path}`);
    console.log(`   ✓ Exports: ${check.shouldExport.join(', ')}\n`);
  } else {
    console.log(`❌ ${check.name}`);
    console.log(`   ✓ File exists: ${check.path}`);
    console.log(`   ✗ Missing exports: ${missing.join(', ')}\n`);
    allPassed = false;
  }
});

// Check hooks/index.js exports useWalletScan
const hooksIndexPath = path.join(__dirname, './src/hooks/index.js');
const hooksIndexContent = fs.readFileSync(hooksIndexPath, 'utf8');
if (!hooksIndexContent.includes('useWalletScan')) {
  console.log(`❌ Hooks index export`);
  console.log(`   useWalletScan not exported from src/hooks/index.js\n`);
  allPassed = false;
} else {
  console.log(`✅ Hooks index export`);
  console.log(`   ✓ useWalletScan exported from src/hooks/index.js\n`);
}

console.log('════════════════════════════════════════\n');

if (allPassed) {
  console.log('✅ All checks passed! Ready for build.\n');
  console.log('Next steps:');
  console.log('  1. npm run build          # TypeScript check');
  console.log('  2. npm test               # E2E tests');
  console.log('  3. git add . && git commit -m "refactor: Phase 6 complete"\n');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please fix issues above.\n');
  process.exit(1);
}
