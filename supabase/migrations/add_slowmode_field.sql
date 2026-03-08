-- ============================================
-- Добавление поля slowmode_interval в таблицу rooms
-- ============================================
-- Slowmode (медленный режим) ограничивает частоту отправки сообщений
-- Значение в секундах (например, 30 = можно отправлять 1 сообщение в 30 секунд)
-- NULL или 0 = slowmode отключен

-- Добавляем поле slowmode_interval
ALTER TABLE public.rooms 
  ADD COLUMN IF NOT EXISTS slowmode_interval INTEGER DEFAULT 0;

-- Комментарий к полю
COMMENT ON COLUMN public.rooms.slowmode_interval IS 'Интервал между сообщениями в секундах (0 = отключен)';

-- Constraint для валидации (от 0 до 1 часа)
ALTER TABLE public.rooms 
  DROP CONSTRAINT IF EXISTS rooms_slowmode_interval_check;

ALTER TABLE public.rooms 
  ADD CONSTRAINT rooms_slowmode_interval_check 
  CHECK (slowmode_interval >= 0 AND slowmode_interval <= 3600);

-- Индекс для быстрого поиска комнат с активным slowmode
CREATE INDEX IF NOT EXISTS idx_rooms_slowmode 
  ON public.rooms(slowmode_interval) 
  WHERE slowmode_interval > 0;

-- Функция для проверки можно ли отправить сообщение (учитывает slowmode)
CREATE OR REPLACE FUNCTION public.can_send_message(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_slowmode_interval INTEGER;
  v_last_message_time TIMESTAMPTZ;
  v_time_since_last_message INTERVAL;
  v_is_admin BOOLEAN;
BEGIN
  -- Проверяем является ли пользователь админом или создателем
  SELECT EXISTS(
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id 
      AND user_id = p_user_id 
      AND role IN ('creator', 'admin')
  ) INTO v_is_admin;

  -- Админы не подчиняются slowmode
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  -- Получаем интервал slowmode для комнаты
  SELECT slowmode_interval INTO v_slowmode_interval
  FROM public.rooms
  WHERE id = p_room_id;

  -- Если slowmode отключен (0 или NULL)
  IF v_slowmode_interval IS NULL OR v_slowmode_interval = 0 THEN
    RETURN TRUE;
  END IF;

  -- Получаем время последнего сообщения пользователя в этой комнате
  SELECT created_at INTO v_last_message_time
  FROM public.messages
  WHERE room_id = p_room_id AND user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Если это первое сообщение пользователя
  IF v_last_message_time IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Вычисляем время с последнего сообщения
  v_time_since_last_message := NOW() - v_last_message_time;

  -- Проверяем прошло ли достаточно времени
  RETURN EXTRACT(EPOCH FROM v_time_since_last_message) >= v_slowmode_interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий к функции
COMMENT ON FUNCTION public.can_send_message IS 'Проверяет может ли пользователь отправить сообщение с учетом slowmode (админы не ограничены)';

-- Уведомление Supabase о перезагрузке схемы
NOTIFY pgrst, 'reload schema';
