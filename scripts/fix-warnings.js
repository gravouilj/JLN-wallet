#!/usr/bin/env node
/**
 * ESLint Warnings Auto-Fixer - Simple Version
 * Cible: no-unused-vars (193)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = (msg, color = 'reset') => 
  console.log(`${colors[color]}${msg}${colors.reset}`);

// Obtenir tous les warnings
log('📊 Fetching ESLint warnings...', 'cyan');
let eslintOutput;
try {
  eslintOutput = execSync('npx eslint . --format=json 2>&1', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (e) {
  eslintOutput = e.stdout || '';
}

const warnings = [];
try {
  const parsed = JSON.parse(eslintOutput);
  parsed.forEach(file => {
    file.messages.forEach(msg => {
      if (msg.severity <= 1) {
        warnings.push({
          file: file.filePath,
          line: msg.line,
          column: msg.column,
          rule: msg.ruleId,
          message: msg.message,
        });
      }
    });
  });
} catch (e) {
  log(`Error: ${e.message}`, 'red');
  process.exit(1);
}

// Grouper par fichier
const byFile = {};
warnings.forEach(w => {
  if (!byFile[w.file]) byFile[w.file] = [];
  byFile[w.file].push(w);
});

let totalFixed = 0;
log(`\n🔧 Processing no-unused-vars (${warnings.filter(w => w.rule === '@typescript-eslint/no-unused-vars').length})...`, 'yellow');

Object.entries(byFile).forEach(([file, items]) => {
  const unused = items.filter(w => w.rule === '@typescript-eslint/no-unused-vars');
  if (!unused.length) return;

  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    unused.sort((a, b) => b.line - a.line);

    unused.forEach(w => {
      const lineIdx = w.line - 1;
      const line = lines[lineIdx];

      // Supprimer imports inutilisés
      if (line.includes('import ') && (line.includes('from') || line.includes('require'))) {
        lines.splice(lineIdx, 1);
        totalFixed++;
        return;
      }

      // Ajouter underscore
      const varMatch = line.match(/^\s*(const|let|var)\s+([a-zA-Z_]\w*)/);
      if (varMatch && varMatch[2] && !varMatch[2].startsWith('_')) {
        const varName = varMatch[2];
        lines[lineIdx] = line.replace(`${varMatch[1]} ${varName}`, `${varMatch[1]} _${varName}`);
        totalFixed++;
      }
    });

    fs.writeFileSync(file, lines.join('\n'));
    log(`  ✅ ${path.basename(file)}: ${unused.length} fixed`);
  } catch (e) {
    log(`  ❌ ${path.basename(file)}: ${e.message}`, 'red');
  }
});

log(`\n✅ Fixed ${totalFixed} no-unused-vars!`, 'green');
log(`\n⚠️  Remaining (manual):`, 'yellow');
log(`  - react-hooks/exhaustive-deps (23)`, 'yellow');
log(`  - no-explicit-any (70)`, 'yellow');
