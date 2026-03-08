#!/usr/bin/env node

/**
 * Проверка оставшихся проблем в коде
 * Использование: node scripts/check-issues.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, '../client/src');

console.log('🔍 Проверка оставшихся проблем в коде\n');
console.log('========================================\n');

// Check 1: Console statements
console.log('1️⃣  Проверка console statements...');
try {
  const result = execSync(`grep -r "console\\." ${srcDir} --include="*.ts" --include="*.tsx" | grep -v ".test." | wc -l`, { encoding: 'utf8' });
  const count = parseInt(result.trim());
  
  if (count === 0) {
    console.log('   ✅ Не найдено console statements\n');
  } else {
    console.log(`   ⚠️  Найдено ${count} console statements`);
    console.log('   Запустите: node scripts/replace-console.js\n');
  }
} catch (err) {
  console.log('   ℹ️  Не удалось проверить (возможно, Windows)\n');
}

// Check 2: Any types
console.log('2️⃣  Проверка использования any...');
try {
  const result = execSync(`grep -r ": any" ${srcDir} --include="*.ts" --include="*.tsx" | wc -l`, { encoding: 'utf8' });
  const count = parseInt(result.trim());
  
  if (count < 10) {
    console.log(`   ✅ Найдено ${count} использований any (приемлемо)\n`);
  } else {
    console.log(`   ⚠️  Найдено ${count} использований any`);
    console.log('   Рекомендуется заменить на правильные типы\n');
  }
} catch (err) {
  console.log('   ℹ️  Не удалось проверить (возможно, Windows)\n');
}

// Check 3: TODO comments
console.log('3️⃣  Проверка TODO комментариев...');
try {
  const result = execSync(`grep -r "TODO\\|FIXME\\|HACK" ${srcDir} --include="*.ts" --include="*.tsx" | wc -l`, { encoding: 'utf8' });
  const count = parseInt(result.trim());
  
  if (count === 0) {
    console.log('   ✅ Не найдено TODO комментариев\n');
  } else {
    console.log(`   ℹ️  Найдено ${count} TODO комментариев`);
    console.log('   Создайте Issues для них и удалите из кода\n');
  }
} catch (err) {
  console.log('   ℹ️  Не удалось проверить (возможно, Windows)\n');
}

// Check 4: TypeScript errors
console.log('4️⃣  Проверка TypeScript ошибок...');
try {
  execSync('npm run typecheck', { cwd: path.join(__dirname, '../client'), stdio: 'ignore' });
  console.log('   ✅ Нет TypeScript ошибок\n');
} catch (err) {
  console.log('   ❌ Есть TypeScript ошибки');
  console.log('   Запустите: npm run typecheck для деталей\n');
}

// Check 5: ESLint errors
console.log('5️⃣  Проверка ESLint ошибок...');
try {
  execSync('npm run lint', { cwd: path.join(__dirname, '../client'), stdio: 'ignore' });
  console.log('   ✅ Нет ESLint ошибок\n');
} catch (err) {
  console.log('   ⚠️  Есть ESLint ошибки');
  console.log('   Запустите: npm run lint -- --fix для автоисправления\n');
}

// Check 6: Tests
console.log('6️⃣  Проверка тестов...');
try {
  execSync('npm test -- --run', { cwd: path.join(__dirname, '../client'), stdio: 'ignore' });
  console.log('   ✅ Все тесты пройдены\n');
} catch (err) {
  console.log('   ⚠️  Некоторые тесты не прошли');
  console.log('   Запустите: npm test для деталей\n');
}

console.log('========================================\n');
console.log('📊 Проверка завершена!\n');
console.log('📝 Следующие шаги:');
console.log('   1. Исправьте найденные проблемы');
console.log('   2. Запустите этот скрипт снова для проверки');
console.log('   3. Откройте QUICK_FIX_CHECKLIST.md и отметьте выполненное');
console.log('');
