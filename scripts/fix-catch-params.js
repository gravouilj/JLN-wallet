#!/usr/bin/env node
/**
 * Auto-fix remaining no-unused-vars for catch and arrow params
 * Patterns: catch(e), catch(err), => (e), => (err) que ne sont pas utilisés
 */

import fs from 'fs';
import path from 'path';

const replacePatterns = [
  // catch (e) => catch (_e)
  { pattern: /catch\s*\(\s*e\s*\)/g, replacement: 'catch (_e)' },
  // catch (err) => catch (_err)
  { pattern: /catch\s*\(\s*err\s*\)/g, replacement: 'catch (_err)' },
  // catch (error) => catch (_error)
  { pattern: /catch\s*\(\s*error\s*\)/g, replacement: 'catch (_error)' },
  // Arrow: (e) => { if not using e
  // This is trickier - only do simple case
];

const files = [
  'src/utils/profilPersistence.js',
  'src/components/TokenDetailsCard.jsx',
  'src/components/Auth/UnlockWallet.jsx',
  'src/components/TicketSystem/ProfileMiniCard.jsx',
  'src/components/TicketSystem/TicketDetailModal.jsx',
  'src/components/Admin/AdminSettings.jsx',
  'src/components/Admin/AdminStats.jsx',
  'src/components/Admin/AdminTicketSystem.jsx',
];

console.log('🔧 Fixing catch parameters...\n');

let fixed = 0;

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    
    replacePatterns.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      const count = ((original.match(/catch\s*\(\s*(e|err|error)\s*\)/g) || []).length);
      console.log(`✅ ${path.basename(filePath)}: ${count} fixed`);
      fixed += count;
    }
  } catch (e) {
    console.log(`❌ Error in ${filePath}: ${e.message}`);
  }
});

console.log(`\n✅ Fixed ${fixed} catch parameters!`);
console.log('\n📊 Rerun ESLint to see improvements');
