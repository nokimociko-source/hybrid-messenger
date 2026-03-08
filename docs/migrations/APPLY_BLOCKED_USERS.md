# Применение миграции: Черный список пользователей

## Описание
Добавляет функционал блокировки пользователей (черный список) с полным UI управлением.

## Что добавляется

### База данных
- Таблица `blocked_users` для хранения заблокированных пользователей
- RLS политики для безопасного доступа
- Функция `is_user_blocked()` для проверки блокировки
- Триггер автоматического удаления чатов при блокировке

### UI компоненты
- `BlockedUsersModal` - модальное окно управления черным списком
- Интеграция в `PrivacySettings` с отображением количества заблокированных

## Шаги применения

### 1. Применить SQL миграцию

**Рекомендуется использовать безопасную версию** (можно запускать повторно):

```bash
# Через psql
psql -h <your-supabase-host> -U postgres -d postgres -f blocked_users_safe_migration.sql
```

Или через Supabase Dashboard:
1. Откройте SQL Editor
2. Скопируйте содержимое `blocked_users_safe_migration.sql`
3. Выполните запрос

**Альтернатива** (если база чистая):
```bash
psql -h <your-supabase-host> -U postgres -d postgres -f blocked_users_schema.sql
```

### Если получаете ошибку "политика уже существует"

Используйте безопасную миграцию `blocked_users_safe_migration.sql` - она автоматически удаляет старые политики перед созданием новых.

### 2. Проверить создание таблицы

```sql
-- Проверка структуры таблицы
SELECT * FROM blocked_users LIMIT 1;

-- Проверка RLS политик
SELECT * FROM pg_policies WHERE tablename = 'blocked_users';

-- Проверка функции
SELECT is_user_blocked('user-id-1', 'user-id-2');
```

### 3. Перезапустить приложение

```bash
cd hybrid_messenger/client
npm run dev
```

## Функционал

### Для пользователей

1. **Открыть черный список**:
   - Настройки → Конфиденциальность → "Заблокированные пользователи"

2. **Заблокировать пользователя**:
   - Нажать кнопку "Добавить"
   - Ввести имя пользователя в поиск
   - Выбрать пользователя из результатов
   - Подтвердить блокировку

3. **Разблокировать пользователя**:
   - Открыть черный список
   - Нажать "Разблокировать" рядом с пользователем
   - Подтвердить действие

### Что происходит при блокировке

- ✅ Заблокированный пользователь не может отправлять сообщения
- ✅ Прямые чаты автоматически удаляются
- ✅ Заблокированный не видит ваш онлайн-статус
- ✅ Вы не получаете уведомления от заблокированного
- ✅ Заблокированный не может добавить вас в группы

## Безопасность

- RLS политики гарантируют, что пользователи видят только свой черный список
- Нельзя заблокировать самого себя (CHECK constraint)
- Нельзя добавить одного пользователя дважды (UNIQUE constraint)
- Все операции логируются с timestamp

## Дополнительные возможности

### Проверка блокировки в коде

```typescript
// Проверить, заблокирован ли пользователь
const { data, error } = await supabase
    .rpc('is_user_blocked', {
        p_user_id: currentUserId,
        p_blocked_user_id: targetUserId
    });

if (data) {
    console.log('Пользователь заблокирован');
}
```

### Получить список заблокированных

```typescript
const { data, error } = await supabase
    .from('blocked_users')
    .select(`
        id,
        blocked_user_id,
        blocked_at,
        user:users!blocked_users_blocked_user_id_fkey (
            id,
            username,
            avatar_url
        )
    `)
    .eq('user_id', currentUserId);
```

## Откат миграции

Если нужно откатить изменения:

```sql
-- Удалить триггер
DROP TRIGGER IF EXISTS trigger_user_blocked ON blocked_users;
DROP FUNCTION IF EXISTS handle_user_blocked();

-- Удалить функцию проверки
DROP FUNCTION IF EXISTS is_user_blocked(UUID, UUID);

-- Удалить таблицу
DROP TABLE IF EXISTS blocked_users CASCADE;
```

## Статус
✅ Готово к использованию
