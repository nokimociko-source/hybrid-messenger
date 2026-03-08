#!/usr/bin/env node

/**
 * Автоматическая замена console.log/warn/error на logger
 * Использование: node scripts/fix-console-logs.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../client/src');
const loggerImport = "import { logger } from '../utils/logger';";

// Счетчики
let filesProcessed = 0;
let filesModified = 0;
let replacements = 0;

/**
 * Проверяет, нужно ли обрабатывать файл
 */
function shouldProcessFile(filePath) {
  // Пропускаем node_modules, dist, тесты
  if (filePath.includes('node_modules') || 
      filePath.includes('/dist/') ||
      filePath.includes('.test.') ||
      filePath.includes('.spec.')) {
    return false;
  }
  
  // Обрабатываем только .ts и .tsx файлы
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
}

/**
 * Получает правильный путь для импорта logger
 */
function getLoggerImportPath(filePath) {
  const relativePath = path.relative(path.dirname(filePath), path.join(srcDir, 'app/utils/logger.ts'));
  return relativePath.replace(/\\/g, '/').replace('.ts', '');
}

/**
 * Обрабатывает один файл
 */
function processFile(filePath) {
  filesProcessed++;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Проверяем, есть ли console.log/warn/error
  const hasConsole = /console\.(log|warn|error|debug|info)\(/.test(content);
  
  if (!hasConsole) {
    return; // Нет console - пропускаем
  }
  
  // Проверяем, есть ли уже импорт logger
  const hasLoggerImport = /import.*logger.*from.*logger/.test(content);
  
  // Заменяем console на logger
  let fileReplacements = 0;
  
  content = content.replace(/console\.log\(/g, () => {
    fileReplacements++;
    return 'logger.info(';
  });
  
  content = content.replace(/console\.warn\(/g, () => {
    fileReplacements++;
    return 'logger.warn(';
  });
  
  content = content.replace(/console\.error\(/g, () => {
    fileReplacements++;
    return 'logger.error(';
  });
  
  content = content.replace(/console\.debug\(/g, () => {
    fileReplacements++;
    return 'logger.debug(';
  });
  
  content = content.replace(/console\.info\(/g, () => {
    fileReplacements++;
    return 'logger.info(';
  });
  
  // Добавляем импорт logger, если его нет
  if (!hasLoggerImport && fileReplacements > 0) {
    const loggerPath = getLoggerImportPath(filePath);
    const importStatement = `import { logger } from '${loggerPath}';\n`;
    
    // Находим место для вставки импорта (после других импортов)
    const importRegex = /^import .+;$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      // Вставляем после последнего импорта
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length + 1;
      
      content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
    } else {
      // Вставляем в начало файла
      content = importStatement + '\n' + content;
    }
  }
  
  // Сохраняем файл, если были изменения
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    replacements += fileReplacements;
    
    console.log(`✅ ${path.relative(srcDir, filePath)}: ${fileReplacements} замен`);
  }
}

/**
 * Рекурсивно обходит директорию
 */
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (shouldProcessFile(filePath)) {
      try {
        processFile(filePath);
      } catch (error) {
        console.error(`❌ Ошибка в ${filePath}:`, error.message);
      }
    }
  }
}

// Запуск
console.log('🔍 Поиск console.log в проекте...\n');

try {
  walkDir(srcDir);
  
  console.log('\n📊 Результаты:');
  console.log(`   Файлов обработано: ${filesProcessed}`);
  console.log(`   Файлов изменено: ${filesModified}`);
  console.log(`   Всего замен: ${replacements}`);
  
  if (filesModified > 0) {
    console.log('\n✅ Готово! Проверьте изменения и запустите typecheck.');
  } else {
    console.log('\n✨ Все чисто! console.log не найдены.');
  }
} catch (error) {
  console.error('\n❌ Ошибка:', error.message);
  process.exit(1);
}
