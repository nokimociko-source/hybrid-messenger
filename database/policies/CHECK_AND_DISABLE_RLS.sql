-- ============================================================================
-- ПРОВЕРКА И ОТКЛЮЧЕНИЕ RLS
-- ============================================================================

-- Проверяем статус RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('rooms', 'room_members', 'typing_indicators', 'messages', 'users');

-- Отключаем RLS на всех таблицах (если ещё включена)
ALTER TABLE IF EXISTS public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.typing_indicators DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- Проверяем результат
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('rooms', 'room_members', 'typing_indicators', 'messages', 'users');

-- ============================================================================
-- Если rowsecurity = false для всех таблиц - RLS отключена успешно!
-- ============================================================================
