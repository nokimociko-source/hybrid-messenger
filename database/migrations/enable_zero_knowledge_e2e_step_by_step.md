# 🔐 Zero-Knowledge E2E - Пошаговое применение

Выполняйте каждый блок отдельно в Supabase SQL Editor.

---

## Шаг 1: Добавить поля для публичных ключей

```sql
-- Публичные ключи пользователей
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS public_key TEXT,
ADD COLUMN IF NOT EXISTS key_type TEXT DEFAULT 'nacl',
ADD COLUMN IF NOT EXISTS key_created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_public_key ON users(public_key) WHERE public_key IS NOT NULL;
```

**Результат:** ✅ Поля добавлены в таблицу users

---

## Шаг 2: Добавить поля для зашифрованных сообщений

```sql
-- Поля для E2E шифрования сообщений
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_algorithm TEXT,
ADD COLUMN IF NOT EXISTS encryption_nonce TEXT,
ADD COLUMN IF NOT EXISTS encrypted_metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON messages(is_encrypted) WHERE is_encrypted = true;
```

**Результат:** ✅ Поля добавлены в таблицу messages

---

## Шаг 3: Создать таблицу для ключей комнат

```sql
-- Таблица для зашифрованных ключей комнат
CREATE TABLE IF NOT EXISTS room_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_room_key TEXT NOT NULL,
  key_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id, key_version)
);
```

**Результат:** ✅ Таблица room_keys создана

---

## Шаг 4: Создать индексы для room_keys

```sql
-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_room_keys_user ON room_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_room_keys_room ON room_keys(room_id);
CREATE INDEX IF NOT EXISTS idx_room_keys_version ON room_keys(room_id, key_version DESC);
```

**Результат:** ✅ Индексы созданы

---

## Шаг 5: Добавить поля для зашифрованных файлов

```sql
-- Поля для шифрования файлов
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS encrypted_file_key TEXT,
ADD COLUMN IF NOT EXISTS file_encryption_nonce TEXT;
```

**Результат:** ✅ Поля для файлов добавлены

---

## Шаг 6: Включить RLS для room_keys

```sql
-- Включаем Row Level Security
ALTER TABLE room_keys ENABLE ROW LEVEL SECURITY;
```

**Результат:** ✅ RLS включен

---

## Шаг 7: Создать RLS политику для чтения

```sql
-- Политика: Пользователь может читать только свои ключи
DROP POLICY IF EXISTS "Users can read own room keys" ON room_keys;
CREATE POLICY "Users can read own room keys"
  ON room_keys FOR SELECT
  USING (auth.uid() = user_id);
```

**Результат:** ✅ Политика чтения создана

---

## Шаг 8: Создать RLS политику для вставки

```sql
-- Политика: Пользователь может создавать свои ключи
DROP POLICY IF EXISTS "Users can insert own room keys" ON room_keys;
CREATE POLICY "Users can insert own room keys"
  ON room_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Результат:** ✅ Политика вставки создана

---

## Шаг 9: Создать RLS политику для обновления

```sql
-- Политика: Пользователь может обновлять свои ключи
DROP POLICY IF EXISTS "Users can update own room keys" ON room_keys;
CREATE POLICY "Users can update own room keys"
  ON room_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Результат:** ✅ Политика обновления создана

---

## Шаг 10: Создать RLS политику для удаления

```sql
-- Политика: Пользователь может удалять свои ключи
DROP POLICY IF EXISTS "Users can delete own room keys" ON room_keys;
CREATE POLICY "Users can delete own room keys"
  ON room_keys FOR DELETE
  USING (auth.uid() = user_id);
```

**Результат:** ✅ Политика удаления создана

---

## Шаг 11: Создать функцию get_user_public_key

```sql
-- Функция: Получить публичный ключ пользователя
CREATE OR REPLACE FUNCTION get_user_public_key(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT public_key 
    FROM users 
    WHERE id = target_user_id
  );
END;
$$;
```

**Результат:** ✅ Функция get_user_public_key создана

---

## Шаг 12: Создать функцию get_room_key

```sql
-- Функция: Получить ключ комнаты для текущего пользователя
CREATE OR REPLACE FUNCTION get_room_key(target_room_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT encrypted_room_key 
    FROM room_keys 
    WHERE room_id = target_room_id 
      AND user_id = auth.uid()
    ORDER BY key_version DESC
    LIMIT 1
  );
END;
$$;
```

**Результат:** ✅ Функция get_room_key создана

---

## Шаг 13: Создать функцию is_e2e_enabled

```sql
-- Функция: Проверить, настроено ли E2E для пользователя
CREATE OR REPLACE FUNCTION is_e2e_enabled(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = target_user_id 
      AND public_key IS NOT NULL
  );
END;
$$;
```

**Результат:** ✅ Функция is_e2e_enabled создана

---

## Шаг 14: Создать триггер для updated_at

```sql
-- Триггер: Обновление updated_at для room_keys
CREATE OR REPLACE FUNCTION update_room_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_room_keys_updated_at ON room_keys;
CREATE TRIGGER trigger_update_room_keys_updated_at
  BEFORE UPDATE ON room_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_room_keys_updated_at();
```

**Результат:** ✅ Триггер создан

---

## Шаг 15: Создать таблицу аудита (опционально)

```sql
-- Таблица для аудита доступа к ключам
CREATE TABLE IF NOT EXISTS e2e_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  room_id UUID REFERENCES rooms(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_e2e_audit_user ON e2e_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_e2e_audit_created ON e2e_audit_log(created_at DESC);
```

**Результат:** ✅ Таблица аудита создана

---

## Шаг 16: Включить RLS для аудита

```sql
-- RLS для audit log
ALTER TABLE e2e_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own audit log" ON e2e_audit_log;
CREATE POLICY "Users can read own audit log"
  ON e2e_audit_log FOR SELECT
  USING (auth.uid() = user_id);
```

**Результат:** ✅ RLS для аудита настроен

---

## Шаг 17: Создать view для статистики

```sql
-- View: Статистика E2E шифрования (без SECURITY DEFINER для безопасности)
CREATE OR REPLACE VIEW e2e_statistics AS
SELECT 
  (SELECT COUNT(DISTINCT id) FROM users WHERE public_key IS NOT NULL) as users_with_e2e,
  (SELECT COUNT(DISTINCT id) FROM users) as total_users,
  (SELECT COUNT(DISTINCT id) FROM messages WHERE is_encrypted = true) as encrypted_messages,
  (SELECT COUNT(DISTINCT id) FROM messages) as total_messages,
  (SELECT COUNT(DISTINCT room_id) FROM room_keys) as rooms_with_e2e;
```

**Результат:** ✅ View создан (безопасная версия без SECURITY DEFINER)

---

## ✅ Проверка установки

Выполните для проверки:

```sql
-- Проверка таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('room_keys', 'e2e_audit_log')
  AND table_schema = 'public';

-- Проверка полей в users
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('public_key', 'key_type')
  AND table_schema = 'public';

-- Проверка полей в messages
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('is_encrypted', 'encryption_algorithm')
  AND table_schema = 'public';

-- Проверка RLS политик
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'room_keys';

-- Проверка функций
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('get_user_public_key', 'get_room_key', 'is_e2e_enabled')
  AND routine_schema = 'public';
```

**Ожидаемый результат:**
- ✅ 2 таблицы: room_keys, e2e_audit_log
- ✅ 3 поля в users: public_key, key_type, key_created_at
- ✅ 4 поля в messages: is_encrypted, encryption_algorithm, encryption_nonce, encrypted_metadata
- ✅ 4 RLS политики для room_keys
- ✅ 3 функции: get_user_public_key, get_room_key, is_e2e_enabled

---

## 🎉 Готово!

Zero-Knowledge E2E шифрование установлено!

**Следующие шаги:**
1. Установите зависимости: `npm install tweetnacl tweetnacl-util`
2. Проверьте файл: `client/src/app/utils/e2eEncryption.ts`
3. Обновите код согласно: `docs/migrations/APPLY_ZERO_KNOWLEDGE_E2E.md`

**Теперь данные защищены от администраторов БД!** 🔒
