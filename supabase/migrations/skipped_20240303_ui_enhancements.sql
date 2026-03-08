-- Migration: UI and Functionality Enhancements
-- Date: 2024-03-03

-- 1. Add background columns to rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS background_url TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS background_config JSONB DEFAULT '{}'::jsonb;

-- 2. Add comments toggle to rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT FALSE;

-- 3. Update room type constraint to include 'group' and ensure 'channel' exists
-- (Some migrations might have used 'community' but the UI expects 'group' or 'channel')
DO $$ 
BEGIN
    ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_type_check;
    ALTER TABLE public.rooms ADD CONSTRAINT rooms_type_check CHECK (type IN ('direct', 'community', 'channel', 'group'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
