-- ============================================
-- Call History Schema
-- ============================================
-- Таблица для хранения истории звонков

CREATE TABLE IF NOT EXISTS public.call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status TEXT NOT NULL CHECK (status IN ('missed', 'answered', 'rejected', 'ended')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- Duration in seconds
  participants UUID[] DEFAULT '{}', -- Array of user IDs who joined
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_call_history_room_id ON public.call_history(room_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_caller_id ON public.call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_started_at ON public.call_history(started_at DESC);

-- Enable RLS
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Users can view call history for rooms they're members of
DROP POLICY IF EXISTS "Users can view call history for their rooms" ON public.call_history;
CREATE POLICY "Users can view call history for their rooms"
  ON public.call_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = call_history.room_id 
      AND user_id = auth.uid()
    )
  );

-- Users can insert call history
DROP POLICY IF EXISTS "Users can create call history" ON public.call_history;
CREATE POLICY "Users can create call history"
  ON public.call_history FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

-- Users can update their own call history
DROP POLICY IF EXISTS "Users can update their call history" ON public.call_history;
CREATE POLICY "Users can update their call history"
  ON public.call_history FOR UPDATE
  USING (auth.uid() = caller_id);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;

-- Notify Supabase to reload schema
NOTIFY pgrst, 'reload schema';
