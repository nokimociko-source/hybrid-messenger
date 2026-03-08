-- ============================================================================
-- ОТКЛЮЧЕНИЕ RLS - Финальное решение
-- Отключаем Row Level Security для всех таблиц
-- ============================================================================

-- Отключаем RLS на всех таблицах
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ГОТОВО! RLS отключена на всех таблицах.
-- ============================================================================
-- Теперь все таблицы доступны без ограничений.
-- Приложение должно работать нормально.
-- ============================================================================
