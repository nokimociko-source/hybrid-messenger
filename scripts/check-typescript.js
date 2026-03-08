#!/usr/bin/env node

/**
 * Проверка TypeScript ошибок и автоматическое исправление
 * Использование: node scripts/check-typescript.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '../client');

console.log('🔍 Проверка TypeScript...\n');

try {
  // Запускаем typecheck
  execSync('npm run typecheck', {
    cwd: clientDir,
    stdio: 'inherit'
  });
  
  console.log('\n✅ TypeScript проверка пройдена! Ошибок не найдено.');
  process.exit(0);
  
} catch (error) {
  console.log('\n⚠️  Найдены TypeScript ошибки.');
  console.log('\n📝 Рекомендации по исправлению:\n');
  
  console.log('1. Обновите matrix-js-sdk:');
  console.log('   cd client && npm install matrix-js-sdk@latest\n');
  
  console.log('2. Используйте централизованные импорты:');
  console.log('   import { MatrixClient, createClient } from \'../utils/matrixImports\';\n');
  
  console.log('3. Проверьте файл matrixImports.ts:');
  console.log('   client/src/app/utils/matrixImports.ts\n');
  
  console.log('4. Запустите typecheck снова:');
  console.log('   cd client && npm run typecheck\n');
  
  process.exit(1);
}
