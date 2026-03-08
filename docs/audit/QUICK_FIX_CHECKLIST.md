# ✅ Быстрый чеклист исправлений

Используйте этот чеклист для отслеживания прогресса исправлений.

---

## 🔴 КРИТИЧНО (Сделать сегодня)

### 1. TypeScript ошибки
- [ ] Обновить matrix-js-sdk: `npm install matrix-js-sdk@latest`
- [ ] Запустить typecheck: `npm run typecheck`
- [ ] Если ошибки остались, создать `matrixImports.ts` (см. FIX_CRITICAL_ISSUES.md)
- [ ] Проверить снова: `npm run typecheck` → 0 ошибок

### 2. Валидация файлов ✅ ИСПРАВЛЕНО
- [x] Файл `fileValidation.ts` уже создан ✅
- [x] Обновить `useSupabaseChat.ts` → функцию `uploadMediaFile` ✅
- [ ] Добавить try-catch в UI компонентах загрузки
- [ ] Протестировать загрузку большого файла (>50MB) → должна быть ошибка

### 3. IP-адрес для rate limiting ✅ ИСПРАВЛЕНО
- [ ] Деплой Edge Function: `supabase functions deploy get-client-ip`
- [x] Edge Function `get-client-ip` уже существует ✅
- [x] Обновить `useRateLimit.ts` → заменить `'0.0.0.0'` на `await getClientIP()` ✅
- [ ] Протестировать rate limiting

### 4. Sanitization HTML ✅ ИСПРАВЛЕНО
- [x] Установить sanitize-html (уже в package.json ✅)
- [x] Добавить `sanitizeURL()` в `markdownParser.ts` ✅
- [x] Блокировка опасных протоколов (javascript:, data:, vbscript:) ✅
- [ ] Протестировать с вредоносной ссылкой: `[test](javascript:alert('XSS'))` → не должно выполниться

---

## 🟡 ВАЖНО (Сделать на этой неделе)

### 5. Заменить console.log
- [ ] Файл `logger.ts` уже создан ✅
- [ ] Запустить скрипт автозамены (см. FIX_CRITICAL_ISSUES.md)
- [ ] Проверить файлы вручную:
  - [ ] `useChannelViewStats.ts`
  - [ ] `e2eEncryption.ts`
  - [ ] `platformNotifications.ts`
  - [ ] `notificationFilter.ts`
  - [ ] `MessageParser.ts`
- [ ] Grep проверка: `grep -r "console\." src/` → должно быть 0 результатов

### 6. Убрать `any` типы
- [ ] Создать `capacitor.d.ts` (см. FIX_CRITICAL_ISSUES.md)
- [ ] Обновить `platformNotifications.ts`
- [ ] Обновить `e2eEncryption.ts`
- [ ] Обновить `CatloverProfilePanel.tsx`
- [ ] Обновить `CatloverRoomView.tsx`
- [ ] Grep проверка: `grep -r ": any" src/` → <10 результатов

### 7. Оптимизация БД
- [ ] Создать SQL функцию `get_rooms_with_last_message` в Supabase
- [ ] Обновить `useSupabaseRooms` → использовать RPC вместо множественных запросов
- [ ] Протестировать загрузку списка комнат → должно быть быстрее

### 8. Мемоизация
- [ ] Обновить `CatloverRoomView.tsx` → добавить `useMemo` для `filteredMessages`
- [ ] Проверить другие тяжелые компоненты
- [ ] Использовать React DevTools Profiler для проверки

---

## 🟢 ЖЕЛАТЕЛЬНО (Сделать в течение месяца)

### 9. TODO комментарии
- [ ] Найти все TODO: `grep -r "TODO" src/`
- [ ] Создать GitHub Issues для каждого
- [ ] Удалить TODO из кода, заменить на ссылки на Issues

### 10. Неиспользуемые импорты
- [ ] Запустить: `npm run lint -- --fix`
- [ ] Проверить результат: `npm run lint`

### 11. Unit тесты
- [ ] Написать тесты для `logger.ts`
- [ ] Написать тесты для `fileValidation.ts`
- [ ] Написать тесты для `ipAddress.ts`
- [ ] Написать тесты для `e2eEncryption.ts`
- [ ] Цель: покрытие >80%

### 12. CI/CD
- [ ] Создать `.github/workflows/ci.yml`
- [ ] Добавить проверки: typecheck, lint, test, build
- [ ] Настроить pre-commit hooks с husky
- [ ] Добавить badge в README

---

## 🧪 ФИНАЛЬНАЯ ПРОВЕРКА

После всех исправлений запустите:

```bash
# 1. TypeScript
npm run typecheck
# Ожидается: 0 ошибок ✅

# 2. ESLint
npm run lint
# Ожидается: 0 ошибок ✅

# 3. Prettier
npm run check:prettier
# Ожидается: All files formatted ✅

# 4. Тесты
npm test
# Ожидается: All tests pass ✅

# 5. Сборка
npm run build
# Ожидается: Build successful ✅
```

---

## 📊 ПРОГРЕСС

Отмечайте выполненные пункты галочками:

- Критично: [✅] 3/4 (Валидация файлов, IP-адрес, Sanitization HTML)
- Важно: [ ] 0/4
- Желательно: [ ] 0/4

**Общий прогресс:** [✅] 3/12 → Цель: [✅] 12/12 🎉

**Последнее обновление:** 3 марта 2026  
**Исправлено критических уязвимостей:** 3 из 4

---

## 🎯 ЦЕЛЬ

После выполнения всех пунктов:
- ✅ 0 TypeScript ошибок (с matrixImports.ts)
- ✅ 0 ESLint ошибок
- ✅ 0 console.log в production
- ✅ <10 использований `any`
- ✅ Все критические уязвимости исправлены
- ✅ Проект готов к production деплою

**Статус:** ✅ 3/4 критических проблем исправлено!

---

## 🚀 Быстрый старт

Запустите главный скрипт для автоматического исправления:

```bash
bash scripts/fix-all-issues.sh
```

Этот скрипт:
1. Заменит console.log на logger
2. Проверит TypeScript
3. Исправит ESLint ошибки
4. Отформатирует код
5. Запустит финальную проверку

**Результат:** Чистый код без ошибок! ✨

---

## 📚 Документация

- [SECURITY_FIXES.md](SECURITY_FIXES.md) - Исправленные уязвимости
- [ALL_ISSUES_FIXED.md](ALL_ISSUES_FIXED.md) - Полный отчет
- [../scripts/README.md](../../scripts/README.md) - Описание скриптов

**Удачи! 🚀**
