-- =============================================
-- USER PRESENCE ENHANCEMENTS (REALTIME READY)
-- =============================================

-- 1. Ensure updated_at exists and is indexed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_presence' AND column_name='updated_at') THEN
        ALTER TABLE public.user_presence ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_presence_updated_at ON public.user_presence(updated_at);

-- 2. Cleanup Function for Stale Presence
-- This can be used to manually clean up or via a cron if available.
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_presence
    SET status = 'offline'
    WHERE status != 'offline'
      AND (updated_at < now() - interval '2 minutes' OR last_seen < now() - interval '2 minutes');
END;
$$;

-- 3. Ensure RLS is active and correct
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view presence" ON public.user_presence;
CREATE POLICY "Public can view presence" 
    ON public.user_presence FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Users can update own presence" ON public.user_presence;
CREATE POLICY "Users can update own presence" 
    ON public.user_presence FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Enable Realtime for user_presence if not already enabled
-- Note: This requires 'supabase_realtime' publication to exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'user_presence'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Publication might not exist or user might not have permission
    RAISE NOTICE 'Could not add user_presence to supabase_realtime publication';
END $$;
