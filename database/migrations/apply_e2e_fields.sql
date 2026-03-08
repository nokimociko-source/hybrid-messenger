-- ============================================
-- Добавление полей для E2E шифрования
-- ============================================

-- Сначала проверим структуру таблицы users
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Добавляем поле public_key если его нет
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Добавляем поле key_type
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS key_type TEXT DEFAULT 'ecdh_p256';

-- Комментарии к полям
COMMENT ON COLUMN public.users.public_key IS 'Публичный ключ пользователя для E2E шифрования (base64)';
COMMENT ON COLUMN public.users.key_type IS 'Тип ключа шифрования: ecdh_p256, rsa_2048, nacl_box';

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_public_key ON public.users(public_key) WHERE public_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_key_type ON public.users(key_type);

-- Проверка результата
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name IN ('public_key', 'key_type')
ORDER BY column_name;

-- Показать пример данных
SELECT 
    id, 
    username, 
    key_type,
    CASE 
        WHEN public_key IS NOT NULL THEN LEFT(public_key, 20) || '...'
        ELSE NULL 
    END as public_key_preview
FROM public.users
LIMIT 5;
