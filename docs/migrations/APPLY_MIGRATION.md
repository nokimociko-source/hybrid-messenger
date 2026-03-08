# Застосування міграції для медіа-улучшень

## Проблема

Помилка: `Could not find the 'media_group_id' column of 'messages' in the schema cache`

Це означає, що нові колонки ще не додані до таблиці `messages` в базі даних.

## Рішення

### Варіант 1: Через Supabase Dashboard (рекомендовано)

1. Відкрийте Supabase Dashboard: https://app.supabase.com
2. Виберіть ваш проект
3. Перейдіть в розділ **SQL Editor**
4. Створіть новий запит
5. Скопіюйте вміст файлу `apply_media_enhancements.sql`
6. Вставте в редактор
7. Натисніть **Run** або `Ctrl+Enter`

### Варіант 2: Через Supabase CLI

```bash
cd hybrid_messenger
supabase db push --file apply_media_enhancements.sql
```

Або:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" < apply_media_enhancements.sql
```

### Варіант 3: Через міграції Supabase

```bash
cd hybrid_messenger

# Створити нову міграцію
supabase migration new add_media_enhancements

# Скопіювати вміст apply_media_enhancements.sql в створений файл
# Файл буде в supabase/migrations/

# Застосувати міграцію
supabase db push
```

## Що додається до БД

### Нові колонки в таблиці `messages`:

```sql
- media_group_id TEXT          -- ID альбому (рядок)
- media_order INTEGER           -- Порядок в альбомі (0-9)
- is_compressed BOOLEAN         -- Чи стиснуте зображення
- original_width INTEGER        -- Оригінальна ширина
- original_height INTEGER       -- Оригінальна висота
```

### Нова таблиця `link_previews`:

```sql
- id UUID                       -- Унікальний ID
- url TEXT                      -- URL для превью
- title TEXT                    -- Заголовок
- description TEXT              -- Опис
- image_url TEXT                -- URL зображення
- provider TEXT                 -- Провайдер (youtube, twitter, etc.)
- embed_html TEXT               -- HTML для вбудовування
- favicon_url TEXT              -- URL favicon
- site_name TEXT                -- Назва сайту
- created_at TIMESTAMP          -- Дата створення
- expires_at TIMESTAMP          -- Дата закінчення
```

### Індекси:

- `idx_messages_media_group` - для швидкого пошуку альбомів
- `idx_link_previews_url` - для швидкого пошуку превью
- `idx_link_previews_expires` - для очищення застарілих превью

### Функції:

- `cleanup_expired_link_previews()` - очищення застарілих превью
- `get_album_messages(p_group_id)` - отримання всіх повідомлень альбому

## Перевірка

Після застосування міграції перевірте:

```sql
-- Перевірка колонок
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('media_group_id', 'media_order', 'is_compressed', 'original_width', 'original_height');

-- Перевірка таблиці link_previews
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'link_previews'
);
```

Очікуваний результат:
```
column_name       | data_type
------------------+-----------
media_group_id    | text
media_order       | integer
is_compressed     | boolean
original_width    | integer
original_height   | integer

exists
--------
t
```

## Troubleshooting

### Помилка: "relation already exists"

Це нормально, якщо ви вже застосовували міграцію раніше. Скрипт використовує `IF NOT EXISTS`, тому він безпечний для повторного запуску.

### Помилка: "permission denied"

Переконайтеся, що ви використовуєте користувача з правами `postgres` або `service_role`.

### Помилка: "column already exists"

Це означає, що колонки вже додані. Можете пропустити цей крок.

### Кеш не оновлюється

Після застосування міграції Supabase автоматично оновить кеш схеми через `NOTIFY pgrst, 'reload schema'`.

Якщо це не спрацювало, перезапустіть PostgREST:
1. Supabase Dashboard → Settings → API
2. Натисніть "Restart API"

Або зачекайте 1-2 хвилини - кеш оновиться автоматично.

## Після застосування

1. Перезавантажте сторінку в браузері (`Ctrl+R` або `F5`)
2. Спробуйте відправити 2-3 зображення
3. Перевірте, що вони відображаються як альбом

## Rollback (якщо потрібно)

Якщо щось пішло не так, можна відкотити зміни:

```sql
-- Видалити колонки
ALTER TABLE public.messages 
  DROP COLUMN IF EXISTS media_group_id,
  DROP COLUMN IF EXISTS media_order,
  DROP COLUMN IF EXISTS is_compressed,
  DROP COLUMN IF EXISTS original_width,
  DROP COLUMN IF EXISTS original_height;

-- Видалити таблицю
DROP TABLE IF EXISTS public.link_previews CASCADE;

-- Видалити функції
DROP FUNCTION IF EXISTS public.cleanup_expired_link_previews();
DROP FUNCTION IF EXISTS public.get_album_messages(TEXT);

-- Оновити кеш
NOTIFY pgrst, 'reload schema';
```
