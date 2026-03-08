-- ============================================================================
-- DEFINITIVE REPAIR & DEEP DIAGNOSTIC
-- ============================================================================

-- 1. FIX AUDIT LOG CONSTRAINTS (CASCADE)
DO $$
BEGIN
    DELETE FROM public.room_audit_log WHERE room_id NOT IN (SELECT id FROM public.rooms);
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_audit_log_room_id_fkey') THEN
        ALTER TABLE public.room_audit_log DROP CONSTRAINT room_audit_log_room_id_fkey;
    END IF;
    ALTER TABLE public.room_audit_log ADD CONSTRAINT room_audit_log_room_id_fkey 
    FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
END $$;

-- 2. ENSURE ROLES ARE CORRECT
-- If anyone has 'owner', change it to 'creator'
UPDATE public.room_members SET role = 'creator' WHERE role = 'owner';

-- 3. CLEAN UP DUPLICATE DIRECT ROOMS
WITH oldest_direct_rooms AS (
  SELECT MIN(created_at) as min_at, 
         LEAST(created_by, target_user_id) as u1, 
         GREATEST(created_by, target_user_id) as u2
  FROM public.rooms
  WHERE is_direct = true
  GROUP BY LEAST(created_by, target_user_id), GREATEST(created_by, target_user_id)
)
DELETE FROM public.rooms r
WHERE is_direct = true
  AND NOT EXISTS (
    SELECT 1 FROM oldest_direct_rooms o
    WHERE r.created_at = o.min_at
      AND LEAST(r.created_by, r.target_user_id) = o.u1
      AND GREATEST(r.created_by, r.target_user_id) = o.u2
  );

-- 4. ENSURE FULL MEMBERSHIP FOR DMs
-- Ensure creator is in the room
INSERT INTO public.room_members (room_id, user_id, role)
SELECT id, created_by, 'creator' FROM public.rooms WHERE is_direct = true
ON CONFLICT (room_id, user_id) DO UPDATE SET role = 'creator';

-- Ensure target is in the room
INSERT INTO public.room_members (room_id, user_id, role)
SELECT id, target_user_id, 'member' FROM public.rooms WHERE is_direct = true AND target_user_id IS NOT NULL
ON CONFLICT (room_id, user_id) DO NOTHING;

-- 5. REPAIR get_my_room_ids (Make sure it's STABLE and SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_my_room_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT room_id FROM public.room_members WHERE user_id = auth.uid();
$$;

-- 6. DEEP DIAGNOSTIC OUTPUT
SELECT '=== USERS ===' as section;
SELECT id, username FROM public.users WHERE username IN ('Fox', 'Mini Fox');

SELECT '=== RELEVANT ROOMS ===' as section;
SELECT 
    r.id, 
    u1.username as creator, 
    u2.username as target, 
    r.is_direct,
    r.created_at,
    (SELECT count(*) FROM public.room_members rm WHERE rm.room_id = r.id) as mem_count,
    (SELECT count(*) FROM public.messages m WHERE m.room_id = r.id) as msg_count
FROM public.rooms r
LEFT JOIN public.users u1 ON r.created_by = u1.id
LEFT JOIN public.users u2 ON r.target_user_id = u2.id
WHERE 
    r.created_by IN (SELECT id FROM public.users WHERE username IN ('Fox', 'Mini Fox'))
    OR r.target_user_id IN (SELECT id FROM public.users WHERE username IN ('Fox', 'Mini Fox'))
ORDER BY r.created_at;

SELECT '=== RELEVANT MEMBERSHIPS ===' as section;
SELECT 
    rm.room_id,
    u.username,
    rm.role,
    rm.joined_at
FROM public.room_members rm
JOIN public.users u ON rm.user_id = u.id
WHERE u.username IN ('Fox', 'Mini Fox')
ORDER BY rm.room_id, u.username;

SELECT '=== RECENT MESSAGES IN DMs ===' as section;
SELECT 
    m.id,
    m.room_id,
    u.username as sender,
    substring(m.content for 20) as preview,
    m.created_at
FROM public.messages m
JOIN public.users u ON m.user_id = u.id
WHERE m.room_id IN (SELECT id FROM public.rooms WHERE is_direct = true)
ORDER BY m.created_at DESC
LIMIT 10;
