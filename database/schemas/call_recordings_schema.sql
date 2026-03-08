-- Таблица для хранения записей звонков
CREATE TABLE IF NOT EXISTS public.call_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    duration INTEGER, -- Длительность в секундах
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_call_recordings_room_id ON public.call_recordings(room_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_by ON public.call_recordings(created_by);
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_at ON public.call_recordings(created_at DESC);

-- RLS политики
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

-- Участники комнаты могут просматривать записи
CREATE POLICY "Room members can view recordings"
ON public.call_recordings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.room_members
        WHERE room_id = call_recordings.room_id
        AND user_id = auth.uid()
    )
);

-- Участники комнаты могут создавать записи
CREATE POLICY "Room members can create recordings"
ON public.call_recordings
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.room_members
        WHERE room_id = call_recordings.room_id
        AND user_id = auth.uid()
    )
    AND created_by = auth.uid()
);

-- Создатель записи может удалять
CREATE POLICY "Creator can delete recordings"
ON public.call_recordings
FOR DELETE
USING (created_by = auth.uid());

-- Комментарии
COMMENT ON TABLE public.call_recordings IS 'Записи групповых звонков';
COMMENT ON COLUMN public.call_recordings.room_id IS 'ID комнаты, в которой был звонок';
COMMENT ON COLUMN public.call_recordings.file_url IS 'URL файла записи в Storage';
COMMENT ON COLUMN public.call_recordings.file_name IS 'Имя файла записи';
COMMENT ON COLUMN public.call_recordings.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN public.call_recordings.duration IS 'Длительность записи в секундах';
COMMENT ON COLUMN public.call_recordings.created_by IS 'Пользователь, который начал запись';
COMMENT ON COLUMN public.call_recordings.created_at IS 'Время создания записи';
