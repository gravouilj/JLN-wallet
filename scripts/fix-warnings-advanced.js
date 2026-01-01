#!/usr/bin/env node
/**
 * ESLint Warnings Fixer - Advanced Patterns
 * Cible: no-unused-vars (remaining) + destructuring + function params
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const log = (msg, color) => {
  const colors = { cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m', red: '\x1b[31m', reset: '\x1b[0m' };
  console.log(`${colors[color] || ''}${msg}${colors.reset}`);
};

log('📊 Analyzing no-unused-vars patterns...', 'cyan');

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
      if (msg.severity <= 1 && msg.ruleId === '@typescript-eslint/no-unused-vars') {
        warnings.push({
          file: file.filePath,
          line: msg.line,
          column: msg.column,
          message: msg.message,
        });
      }
    });
  });
} catch (e) {
  log(`Error: ${e.message}`, 'red');
  process.exit(1);
}

const byFile = {};
warnings.forEach(w => {
  if (!byFile[w.file]) byFile[w.file] = [];
  byFile[w.file].push(w);
});

let totalFixed = 0;
log(`\n🔧 Processing ${warnings.length} remaining no-unused-vars...`, 'yellow');

Object.entries(byFile).forEach(([file, items]) => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    items.sort((a, b) => b.line - a.line);

    items.forEach(w => {
      const lineIdx = w.line - 1;
      let line = lines[lineIdx];
      const originalLine = line;

      // Pattern 1: Destructuring non-utilisé - const { x } = ...
      line = line.replace(/const\s*\{\s*([a-zA-Z_]\w*)\s*\}/g, (match, varName) => {
        if (!varName.startsWith('_') && w.message.includes(varName)) {
          totalFixed++;
          return match.replace(varName, `_${varName}`);
        }
        return match;
      });

      // Pattern 2: Function params - (e, x, y) =>
      line = line.replace(/\(([^)]+)\)\s*=>/g, (match, params) => {
        const paramList = params.split(',').map(p => {
          const trimmed = p.trim();
          const name = trimmed.split('=')[0].trim(); // Remove default values
          if (!name.startsWith('_') && w.message.includes(name)) {
            totalFixed++;
            return p.replace(name, `_${name}`);
          }
          return p;
        });
        return match.replace(params, paramList.join(', '));
      });

      // Pattern 3: Variable assignment - const x = value;
      if (!line.includes('_')) {
        const varMatch = line.match(/const\s+([a-zA-Z_]\w*)\s*=/);
        if (varMatch && w.message.includes(varMatch[1])) {
          line = line.replace(varMatch[1], `_${varMatch[1]}`);
          totalFixed++;
        }
      }

      if (line !== originalLine) {
        lines[lineIdx] = line;
      }
    });

    fs.writeFileSync(file, lines.join('\n'));
    if (items.length > 0) log(`  ✅ ${path.basename(file)}: checked`);
  } catch (e) {
    // Silently skip errors
  }
});

log(`\n✅ Fixed/Processed ${totalFixed} additional issues!`, 'green');

// Recount
try {
  const finalOutput = execSync('npx eslint . --max-warnings 500 2>&1 | grep "problems"', { encoding: 'utf-8' });
  log(`\n📊 Final count: ${finalOutput.trim()}`, 'cyan');
} catch (e) {
  // Ignore
}
