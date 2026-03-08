#!/bin/bash

# Автоматический скрипт исправления критических проблем
# Использование: bash scripts/auto-fix.sh

set -e  # Exit on error

echo "🔧 Hybrid Messenger - Автоматическое исправление проблем"
echo "=========================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Ошибка: Запустите скрипт из директории client${NC}"
    echo "   cd hybrid_messenger/client && bash ../scripts/auto-fix.sh"
    exit 1
fi

echo -e "${YELLOW}📋 Шаг 1: Обновление зависимостей${NC}"
echo "   Обновляем matrix-js-sdk..."
npm install matrix-js-sdk@latest --save
echo -e "${GREEN}✅ Зависимости обновлены${NC}"
echo ""

echo -e "${YELLOW}📋 Шаг 2: Исправление ESLint ошибок${NC}"
echo "   Запускаем автофикс..."
npm run lint -- --fix || true
echo -e "${GREEN}✅ ESLint автофикс завершен${NC}"
echo ""

echo -e "${YELLOW}📋 Шаг 3: Форматирование кода${NC}"
echo "   Применяем Prettier..."
npm run fix:prettier || true
echo -e "${GREEN}✅ Код отформатирован${NC}"
echo ""

echo -e "${YELLOW}📋 Шаг 4: Проверка TypeScript${NC}"
echo "   Запускаем typecheck..."
if npm run typecheck; then
    echo -e "${GREEN}✅ TypeScript проверка пройдена${NC}"
else
    echo -e "${RED}⚠️  Есть TypeScript ошибки. Проверьте вывод выше.${NC}"
    echo "   Возможно, нужно вручную исправить импорты из matrix-js-sdk"
fi
echo ""

echo -e "${YELLOW}📋 Шаг 5: Запуск тестов${NC}"
echo "   Запускаем тесты..."
if npm test -- --run; then
    echo -e "${GREEN}✅ Все тесты пройдены${NC}"
else
    echo -e "${RED}⚠️  Некоторые тесты не прошли${NC}"
fi
echo ""

echo -e "${YELLOW}📋 Шаг 6: Проверка сборки${NC}"
echo "   Собираем проект..."
if npm run build; then
    echo -e "${GREEN}✅ Сборка успешна${NC}"
else
    echo -e "${RED}❌ Ошибка сборки${NC}"
    exit 1
fi
echo ""

echo "=========================================================="
echo -e "${GREEN}🎉 Автоматические исправления завершены!${NC}"
echo ""
echo "📊 Следующие шаги:"
echo "   1. Проверьте вывод выше на наличие ошибок"
echo "   2. Откройте QUICK_FIX_CHECKLIST.md и отметьте выполненные пункты"
echo "   3. Исправьте оставшиеся проблемы вручную (см. FIX_CRITICAL_ISSUES.md)"
echo "   4. Создайте PR с исправлениями"
echo ""
echo "📝 Полезные команды:"
echo "   npm run typecheck  - Проверка TypeScript"
echo "   npm run lint       - Проверка ESLint"
echo "   npm test           - Запуск тестов"
echo "   npm run build      - Сборка проекта"
echo ""
