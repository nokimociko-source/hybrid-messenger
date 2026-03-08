# Применение всех миграций БД

## 📋 Список миграций

Все необходимые миграции уже созданы и готовы к применению:

### 1. ✅ E2E Шифрование
**Файл:** `apply_e2e_fields.sql`
**Что добавляет:**
- Поле `public_key` в таблицу `users` (для хранения публичного ключа ECDH)
- Поле `key_type` в таблицу `users` (тип ключа: ecdh_p256, rsa_2048, nacl_box)
- Индексы для быстрого поиска

### 2. ✅ Медиа-улучшения
**Файл:** `apply_media_enhancements.sql`
**Что добавляет:**
- Поле `media_group_id` в таблицу `messages` (для группировки медиа в альбомы)
- Поле `media_order` (порядок в альбоме)
- Поля `is_compressed`, `original_width`, `original_height` (метаданные медиа)
- Таблица `link_previews` (кеширование превью ссылок)
- Функция `get_media_album()` (получение всех медиа из альбома)
- Функция `cleanup_expired_link_previews()` (очистка старых превью)

### 3. ✅ Система банов
**Файл:** `add_ban_fields_to_room_members.sql`
**Что добавляет:**
- Поле `is_banned` в таблицу `room_members`
- Поле `banned_at` (дата бана)
- Поле `banned_by` (кто забанил)
- Поле `ban_reason` (причина бана)
- Поле `ban_expires_at` (дата окончания бана, NULL = навсегда)
- Функция `auto_unban_expired()` (автоматический разбан по истечении срока)

### 4. ✅ Slowmode (Медленный режим)
**Файл:** `add_slowmode_field.sql`
**Что добавляет:**
- Поле `slowmode_interval` в таблицу `rooms` (интервал между сообщениями в секундах)
- Функция `can_send_message()` (проверка можно ли отправить сообщение с учетом slowmode)
- Админы и создатели не подчиняются slowmode

### 5. ✅ История звонков
**Файл:** `call_history_schema.sql`
**Что добавляет:**
- Таблица `call_history` (история всех звонков)
- Поля: `caller_id`, `call_type`, `status`, `duration`, `participants`
- RLS политики для безопасности

## 🚀 Как применить

### Вариант 1: Через Supabase Dashboard (Рекомендуется)

1. Откройте Supabase Dashboard
2. Перейдите в **SQL Editor**
3. Создайте новый запрос
4. Скопируйте содержимое каждого файла по очереди:
   ```
   apply_e2e_fields.sql
   apply_media_enhancements.sql
   add_ban_fields_to_room_members.sql
   add_slowmode_field.sql
   call_history_schema.sql
   ```
5. Выполните каждый запрос (кнопка **Run**)

### Вариант 2: Через psql (Локально)

```bash
# E2E шифрование
psql -U your_user -d your_database -f apply_e2e_fields.sql

# Медиа-улучшения
psql -U your_user -d your_database -f apply_media_enhancements.sql

# Система банов
psql -U your_user -d your_database -f add_ban_fields_to_room_members.sql

# Slowmode
psql -U your_user -d your_database -f add_slowmode_field.sql

# История звонков
psql -U your_user -d your_database -f call_history_schema.sql
```

### Вариант 3: Одним файлом

Можно объединить все миграции в один файл и выполнить за раз:

```bash
cat apply_e2e_fields.sql \
    apply_media_enhancements.sql \
    add_ban_fields_to_room_members.sql \
    add_slowmode_field.sql \
    call_history_schema.sql > all_migrations.sql

psql -U your_user -d your_database -f all_migrations.sql
```

## ✅ Проверка применения

После применения миграций проверьте что всё работает:

```sql
-- Проверка E2E полей
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('public_key', 'key_type');

-- Проверка медиа полей
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('media_group_id', 'media_order', 'is_compressed');

-- Проверка таблицы link_previews
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = 'link_previews'
);

-- Проверка полей банов
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'room_members' 
  AND column_name IN ('is_banned', 'banned_at', 'ban_reason');

-- Проверка slowmode
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rooms' 
  AND column_name = 'slowmode_interval';

-- Проверка таблицы call_history
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = 'call_history'
);
```

## 🔄 Откат миграций (если нужно)

Если что-то пошло не так, можно откатить изменения:

```sql
-- Откат E2E
ALTER TABLE public.users DROP COLUMN IF EXISTS public_key;
ALTER TABLE public.users DROP COLUMN IF EXISTS key_type;

-- Откат медиа
ALTER TABLE public.messages DROP COLUMN IF EXISTS media_group_id;
ALTER TABLE public.messages DROP COLUMN IF EXISTS media_order;
ALTER TABLE public.messages DROP COLUMN IF EXISTS is_compressed;
DROP TABLE IF EXISTS public.link_previews CASCADE;

-- Откат банов
ALTER TABLE public.room_members DROP COLUMN IF EXISTS is_banned;
ALTER TABLE public.room_members DROP COLUMN IF EXISTS banned_at;
ALTER TABLE public.room_members DROP COLUMN IF EXISTS banned_by;
ALTER TABLE public.room_members DROP COLUMN IF EXISTS ban_reason;
ALTER TABLE public.room_members DROP COLUMN IF EXISTS ban_expires_at;

-- Откат slowmode
ALTER TABLE public.rooms DROP COLUMN IF EXISTS slowmode_interval;
DROP FUNCTION IF EXISTS public.can_send_message;

-- Откат истории звонков
DROP TABLE IF EXISTS public.call_history CASCADE;
```

## 📝 Примечания

- Все миграции используют `IF NOT EXISTS` / `IF EXISTS`, поэтому безопасно запускать их повторно
- Миграции не удаляют существующие данные
- RLS политики настроены для безопасности
- Realtime подписки добавлены для всех новых таблиц

## 🎯 Что дальше?

После применения миграций:
1. Перезапустите клиентское приложение
2. Проверьте что E2E шифрование работает
3. Протестируйте отправку медиа-альбомов
4. Проверьте систему банов в настройках группы
5. Включите slowmode в настройках комнаты
6. Проверьте историю звонков
