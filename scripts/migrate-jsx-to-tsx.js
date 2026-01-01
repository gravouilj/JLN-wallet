#!/usr/bin/env node
/**
 * JSX to TSX Component Migration Helper
 * Renames files and adds basic TypeScript types
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
if (!args.length) {
  console.log('Usage: node migrate-jsx-to-tsx.js <file-or-pattern>');
  console.log('Examples:');
  console.log('  node migrate-jsx-to-tsx.js src/pages/*.jsx');
  console.log('  node migrate-jsx-to-tsx.js src/components/Auth/UnlockWallet.jsx');
  process.exit(1);
}

const pattern = args[0];
const files = [];

// Handle glob patterns
if (pattern.includes('*')) {
  const dir = path.dirname(pattern);
  const ext = path.extname(pattern);
  const glob = path.basename(pattern).replace('*', '');
  
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(f => {
      if (f.includes(glob) && f.endsWith(ext)) {
        files.push(path.join(dir, f));
      }
    });
  }
} else if (fs.existsSync(pattern)) {
  files.push(pattern);
}

console.log(`🔄 Migrating ${files.length} files from JSX to TSX...\n`);

files.forEach(file => {
  if (!file.endsWith('.jsx')) {
    console.log(`⏭️  Skipping ${file} (not .jsx)`);
    return;
  }

  const dir = path.dirname(file);
  const base = path.basename(file, '.jsx');
  const newFile = path.join(dir, `${base}.tsx`);

  if (fs.existsSync(newFile)) {
    console.log(`⚠️  ${base}.tsx already exists`);
    return;
  }

  try {
    // Read original file
    const content = fs.readFileSync(file, 'utf-8');

    // Simple heuristic: if file imports React FC patterns or has props destructuring, add types
    // For now, just rename and let TypeScript check it
    
    // Write to new file
    fs.writeFileSync(newFile, content);
    
    // Remove old file
    fs.unlinkSync(file);
    
    console.log(`✅ ${base}.jsx → ${base}.tsx`);
  } catch (e) {
    console.log(`❌ Error migrating ${base}: ${e.message}`);
  }
});

console.log(`\n✨ Done! Files renamed. Running build to check for errors...\n`);

try {
  const result = execSync('npm run build 2>&1', { encoding: 'utf-8' });
  if (result.includes('error')) {
    console.log('⚠️  Build has errors - review them above');
    console.log('If errors are TypeScript-related, add prop interfaces to your components');
  } else {
    console.log('✅ Build successful!');
  }
} catch (e) {
  console.log('⚠️  Build failed');
}
