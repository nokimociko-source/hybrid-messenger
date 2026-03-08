#!/usr/bin/env node

/**
 * Автоматическая замена console.log/error/warn на logger
 * Использование: node scripts/replace-console.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../client/src');
let filesModified = 0;
let totalReplacements = 0;

// Recursively find all TypeScript files
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and dist
      if (file !== 'node_modules' && file !== 'dist') {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      // Skip test files
      if (!file.includes('.test.')) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

// Replace console statements in a file
function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let replacements = 0;

  // Count console statements
  const errorCount = (content.match(/console\.error\(/g) || []).length;
  const warnCount = (content.match(/console\.warn\(/g) || []).length;
  const logCount = (content.match(/console\.log\(/g) || []).length;

  if (errorCount + warnCount + logCount === 0) {
    return; // No console statements
  }

  // Replace console.error
  if (content.includes('console.error')) {
    content = content.replace(/console\.error\(/g, 'logger.error(');
    modified = true;
    replacements += errorCount;
  }

  // Replace console.warn
  if (content.includes('console.warn')) {
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    modified = true;
    replacements += warnCount;
  }

  // Replace console.log
  if (content.includes('console.log')) {
    content = content.replace(/console\.log\(/g, 'logger.info(');
    modified = true;
    replacements += logCount;
  }

  if (modified) {
    // Add import if not present
    const hasLoggerImport = 
      content.includes("from './utils/logger'") ||
      content.includes("from '../utils/logger'") ||
      content.includes("from '../../utils/logger'") ||
      content.includes("from '../../../utils/logger'");

    if (!hasLoggerImport) {
      // Calculate relative path to logger
      const relativePath = path.relative(path.dirname(filePath), path.join(srcDir, 'app/utils'));
      const importPath = relativePath.replace(/\\/g, '/') + '/logger';
      
      // Add import at the top (after other imports)
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }

      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, `import { logger } from '${importPath}';`);
        content = lines.join('\n');
      } else {
        // No imports found, add at the top
        content = `import { logger } from '${importPath}';\n\n` + content;
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    totalReplacements += replacements;
    
    const relPath = path.relative(srcDir, filePath);
    console.log(`✅ ${relPath} (${replacements} replacements)`);
  }
}

// Main execution
console.log('🔍 Поиск файлов с console statements...\n');

const tsFiles = findTsFiles(srcDir);
console.log(`📁 Найдено ${tsFiles.length} TypeScript файлов\n`);

console.log('🔧 Замена console на logger...\n');

tsFiles.forEach(replaceInFile);

console.log('\n========================================');
console.log(`✅ Готово!`);
console.log(`📊 Статистика:`);
console.log(`   - Файлов изменено: ${filesModified}`);
console.log(`   - Всего замен: ${totalReplacements}`);
console.log('========================================\n');

if (filesModified > 0) {
  console.log('📝 Следующие шаги:');
  console.log('   1. Проверьте изменения: git diff');
  console.log('   2. Запустите проверки: npm run typecheck && npm run lint');
  console.log('   3. Закоммитьте изменения: git add . && git commit -m "Replace console with logger"');
  console.log('');
}
