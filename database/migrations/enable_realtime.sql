-- =============================================
-- ENABLE REALTIME FOR CRITICAL TABLES
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Ensure the publication exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Add tables to the publication (idempotent)
DO $$
DECLARE
    t text;
    tables_to_add text[] := ARRAY['rooms', 'messages', 'room_members', 'users'];
BEGIN
    FOREACH t IN ARRAY tables_to_add LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- 3. Verify
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
