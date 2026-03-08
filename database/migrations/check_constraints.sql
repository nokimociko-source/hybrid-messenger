-- CHECK CONSTRAINTS DIAGNOSTIC
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.room_members'::regclass;
