-- ============================================================
-- FORCE POSTGREST SCHEMA CACHE RELOAD
-- Run this in Supabase SQL Editor if 400 errors persist
-- ============================================================

-- Method 1: Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';

-- Method 2: Check if the FK constraint is registered correctly
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS references_table,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.room_members'::regclass
  AND contype = 'f'
  AND confrelid = 'public.users'::regclass
ORDER BY conname;

-- If you still see 400 errors after running this:
-- Go to Supabase Dashboard → Settings → API → Click SAVE
-- This forces PostgREST to pick up the new schema.
