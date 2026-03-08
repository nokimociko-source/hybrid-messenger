-- Добавление поля key_type для указания типа ключа шифрования
-- Это позволяет поддерживать разные алгоритмы шифрования

-- Добавляем поле key_type в таблицу users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS key_type TEXT DEFAULT 'ecdh_p256';

-- Комментарий к полю
COMMENT ON COLUMN public.users.key_type IS 'Тип ключа шифрования: ecdh_p256, rsa_2048, nacl_box';

-- Обновляем существующие записи (если есть старые RSA ключи)
UPDATE public.users 
SET key_type = 'rsa_2048' 
WHERE public_key IS NOT NULL AND key_type IS NULL;

-- Индекс для быстрого поиска по типу ключа
CREATE INDEX IF NOT EXISTS idx_users_key_type ON public.users(key_type);
