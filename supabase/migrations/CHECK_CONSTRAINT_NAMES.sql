-- Run this to find the EXACT foreign key names in your database
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.room_members'::regclass
  AND contype = 'f'
ORDER BY conname;
