-- DIAGNOSTIC SQL
-- Check users
SELECT id, username FROM public.users WHERE username IN ('Fox', 'Mini Fox');

-- Check rooms for these users
SELECT 
  r.id as room_id, 
  r.name, 
  r.is_direct, 
  r.created_by,
  u1.username as creator,
  r.target_user_id,
  u2.username as target
FROM public.rooms r
LEFT JOIN public.users u1 ON r.created_by = u1.id
LEFT JOIN public.users u2 ON r.target_user_id = u2.id
WHERE 
  r.created_by IN (SELECT id FROM public.users WHERE username IN ('Fox', 'Mini Fox'))
  OR r.target_user_id IN (SELECT id FROM public.users WHERE username IN ('Fox', 'Mini Fox'));

-- Check memberships for these users
SELECT 
  rm.room_id,
  r.name as room_name,
  u.username,
  rm.role
FROM public.room_members rm
JOIN public.users u ON rm.user_id = u.id
JOIN public.rooms r ON rm.room_id = r.id
WHERE u.username IN ('Fox', 'Mini Fox');

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('rooms', 'room_members', 'messages');
