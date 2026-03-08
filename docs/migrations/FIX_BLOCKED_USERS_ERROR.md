# Исправление ошибки "политика уже существует"

## Проблема
```
ОШИБКА: 42710: политика «...» для таблицы «...» уже существует
```

## Решение

### Вариант 1: Использовать безопасную миграцию (РЕКОМЕНДУЕТСЯ)

Запустите `blocked_users_safe_migration.sql` вместо обычного скрипта:

```sql
-- Скопируйте и выполните в Supabase SQL Editor
-- Содержимое файла: blocked_users_safe_migration.sql
```

Этот скрипт:
- ✅ Удаляет старые политики перед созданием новых
- ✅ Использует `IF NOT EXISTS` для всех объектов
- ✅ Можно запускать повторно без ошибок
- ✅ Проверяет существование constraints перед добавлением

### Вариант 2: Удалить существующие политики вручную

Если хотите использовать оригинальный скрипт, сначала удалите старые политики:

```sql
-- Удалить все политики для blocked_users
DROP POLICY IF EXISTS "Users can view their own blocked list" ON blocked_users;
DROP POLICY IF EXISTS "Users can block others" ON blocked_users;
DROP POLICY IF EXISTS "Users can unblock others" ON blocked_users;

-- Теперь можно запустить blocked_users_schema.sql
```

### Вариант 3: Полная очистка и пересоздание

Если нужно начать с чистого листа:

```sql
-- ВНИМАНИЕ: Это удалит все данные!
DROP TRIGGER IF EXISTS trigger_user_blocked ON blocked_users;
DROP FUNCTION IF EXISTS handle_user_blocked();
DROP FUNCTION IF EXISTS is_user_blocked(UUID, UUID);
DROP TABLE IF EXISTS blocked_users CASCADE;

-- Теперь запустите любой из скриптов миграции
```

## Проверка успешности

После применения миграции проверьте:

```sql
-- Проверка таблицы
SELECT COUNT(*) FROM blocked_users;

-- Проверка политик
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'blocked_users';

-- Проверка функции
SELECT is_user_blocked(
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
);
```

Должно вернуть:
- 3 политики (view, insert, delete)
- Функция работает (возвращает false для несуществующих пользователей)

## Рекомендация

Всегда используйте `blocked_users_safe_migration.sql` для продакшена - он безопасен для повторного запуска и не вызовет ошибок.
