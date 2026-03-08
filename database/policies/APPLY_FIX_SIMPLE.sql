-- ============================================================================
-- ПРОСТОЙ ФИХ: Исправление бесконечной рекурсии в RLS политиках
-- Этот скрипт работает только с существующими таблицами
-- ============================================================================

-- Шаг 1: Отключаем RLS временно
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators DISABLE ROW LEVEL SECURITY;

-- Шаг 2: Удаляем проблемные политики
DROP POLICY IF EXISTS "Rooms are viewable by participants" ON public.rooms;
DROP POLICY IF EXISTS "Room creators and admins can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can insert room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can update room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can delete room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can view typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can insert typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can delete typing indicators" ON public.typing_indicators;

-- Шаг 3: Включаем RLS обратно
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Шаг 4: Создаём простые политики для rooms (БЕЗ подзапросов)
CREATE POLICY "Rooms are viewable by participants" ON public.rooms 
  FOR SELECT USING (
    -- Прямые сообщения: только участники могут видеть
    (is_direct AND (auth.uid() = created_by OR auth.uid() = target_user_id))
    OR
    -- Публичные каналы: все могут видеть
    (type = 'channel' AND is_public = true)
  );

CREATE POLICY "Room creators can update rooms" 
ON public.rooms 
FOR UPDATE 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can delete rooms" 
ON public.rooms 
FOR DELETE 
USING (auth.uid() = created_by);

-- Шаг 5: Создаём простые политики для room_members
CREATE POLICY "Users can view room members" 
ON public.room_members 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert room members" 
ON public.room_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update room members" 
ON public.room_members 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete room members" 
ON public.room_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Шаг 6: Создаём простые политики для typing_indicators
CREATE POLICY "Users can view typing indicators" 
ON public.typing_indicators 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert typing indicators" 
ON public.typing_indicators 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete typing indicators" 
ON public.typing_indicators 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================================================
-- ГОТОВО! Бесконечная рекурсия должна быть исправлена.
-- ============================================================================
-- Проверь, что всё работает:
-- SELECT * FROM public.rooms LIMIT 1;
-- SELECT * FROM public.room_members LIMIT 1;
-- SELECT * FROM public.typing_indicators LIMIT 1;
-- ============================================================================
