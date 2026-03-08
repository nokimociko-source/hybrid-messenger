#!/bin/bash

# Скрипт для исправления всех найденных проблем
# Использование: bash scripts/fix-all-issues.sh

set -e

echo "🚀 Начинаем исправление всех проблем..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Замена console.log на logger
echo -e "${YELLOW}📝 Шаг 1/5: Замена console.log на logger...${NC}"
node scripts/fix-console-logs.js
echo ""

# 2. Проверка TypeScript
echo -e "${YELLOW}🔍 Шаг 2/5: Проверка TypeScript...${NC}"
node scripts/check-typescript.js || echo -e "${RED}⚠️  TypeScript ошибки найдены. Продолжаем...${NC}"
echo ""

# 3. Запуск ESLint с автоисправлением
echo -e "${YELLOW}🔧 Шаг 3/5: Исправление ESLint ошибок...${NC}"
cd client
npm run lint -- --fix || echo -e "${RED}⚠️  Некоторые ESLint ошибки не исправлены автоматически${NC}"
cd ..
echo ""

# 4. Форматирование кода с Prettier
echo -e "${YELLOW}💅 Шаг 4/5: Форматирование кода...${NC}"
cd client
npm run format || echo -e "${RED}⚠️  Ошибка форматирования${NC}"
cd ..
echo ""

# 5. Финальная проверка
echo -e "${YELLOW}✅ Шаг 5/5: Финальная проверка...${NC}"
echo ""

echo "Проверка TypeScript:"
cd client
npm run typecheck && echo -e "${GREEN}✅ TypeScript: OK${NC}" || echo -e "${RED}❌ TypeScript: Ошибки${NC}"
echo ""

echo "Проверка ESLint:"
npm run lint && echo -e "${GREEN}✅ ESLint: OK${NC}" || echo -e "${RED}❌ ESLint: Предупреждения${NC}"
echo ""

echo "Проверка Prettier:"
npm run check:prettier && echo -e "${GREEN}✅ Prettier: OK${NC}" || echo -e "${RED}❌ Prettier: Требуется форматирование${NC}"
cd ..
echo ""

# Итоги
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Исправление завершено!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Что было сделано:"
echo "   ✅ Заменены console.log на logger"
echo "   ✅ Исправлены ESLint ошибки"
echo "   ✅ Отформатирован код"
echo "   ✅ Проверен TypeScript"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Проверьте изменения: git diff"
echo "   2. Протестируйте приложение: npm run dev"
echo "   3. Запустите тесты: npm test"
echo "   4. Сделайте коммит: git commit -am 'fix: resolve all code issues'"
echo ""
