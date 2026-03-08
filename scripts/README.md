# Scripts

Утилиты для автоматизации и проверки кода.

## Доступные скрипты

### fix-all-issues.sh ⭐ ГЛАВНЫЙ СКРИПТ
Автоматическое исправление всех проблем в проекте.

**Использование:**
```bash
bash scripts/fix-all-issues.sh
```

**Что делает:**
1. Заменяет console.log на logger
2. Проверяет TypeScript
3. Исправляет ESLint ошибки
4. Форматирует код с Prettier
5. Запускает финальную проверку

**Результат:**  
✅ Чистый код без ошибок

---

### fix-console-logs.js
Автоматическая замена console.log/warn/error на logger.

**Использование:**
```bash
node scripts/fix-console-logs.js
```

**Что делает:**
- Находит все console.log/warn/error
- Заменяет на logger.info/warn/error
- Добавляет импорт logger
- Сохраняет изменения

**Результат:**  
✅ Централизованное логирование

---

### check-typescript.js
Проверка TypeScript ошибок с рекомендациями.

**Использование:**
```bash
node scripts/check-typescript.js
```

**Что делает:**
- Запускает typecheck
- Показывает ошибки
- Дает рекомендации по исправлению

**Результат:**  
✅ Список ошибок и способы их исправления

---

### auto-fix.sh (УСТАРЕЛ)
Старый скрипт автоисправления.

**Рекомендация:** Используйте `fix-all-issues.sh` вместо этого.

---

### check-issues.js
Проверка кода на наличие проблем.

**Использование:**
```bash
cd client
node ../scripts/check-issues.js
```

**Проверяет:**
- TypeScript ошибки
- ESLint предупреждения
- Использование console.log
- Отсутствие типов

---

### replace-console.js (УСТАРЕЛ)
Старый скрипт замены console.log.

**Рекомендация:** Используйте `fix-console-logs.js` вместо этого.

---

## 🚀 Быстрый старт

### Исправить все проблемы сразу:
```bash
bash scripts/fix-all-issues.sh
```

### Только заменить console.log:
```bash
node scripts/fix-console-logs.js
```

### Только проверить TypeScript:
```bash
node scripts/check-typescript.js
```

---

## 📊 Порядок исправлений

Рекомендуемый порядок для ручного исправления:

1. **Запустите главный скрипт:**
   ```bash
   bash scripts/fix-all-issues.sh
   ```

2. **Проверьте изменения:**
   ```bash
   git diff
   ```

3. **Протестируйте:**
   ```bash
   cd client
   npm run dev
   ```

4. **Сделайте коммит:**
   ```bash
   git add .
   git commit -m "fix: resolve all code issues"
   ```

---

## 🔧 Требования

- Node.js 18+
- npm или yarn
- Bash (для .sh скриптов)

---

## 📝 Логи

Все скрипты выводят подробные логи:
- ✅ Зеленый = успех
- ⚠️  Желтый = предупреждение
- ❌ Красный = ошибка

---

## См. также

- [docs/audit/](../docs/audit/) - Результаты аудита кода
- [docs/audit/SECURITY_FIXES.md](../docs/audit/SECURITY_FIXES.md) - Исправленные уязвимости
- [docs/audit/QUICK_FIX_CHECKLIST.md](../docs/audit/QUICK_FIX_CHECKLIST.md) - Чеклист исправлений
