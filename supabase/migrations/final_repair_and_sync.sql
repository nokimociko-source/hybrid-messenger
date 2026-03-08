-- ============================================================================
-- FINAL CLEANUP AND DIAGNOSTIC REPAIR
-- =============================================

-- 1. FIX AUDIT LOG FK (Clean up orphans and make it CASCADE)
DO $$
BEGIN
    -- Clean up orphan records first (ones pointing to non-existent rooms)
    -- This is required before we can re-create the FK constraint
    DELETE FROM public.room_audit_log 
    WHERE room_id NOT IN (SELECT id FROM public.rooms);

    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'room_audit_log_room_id_fkey'
    ) THEN
        ALTER TABLE public.room_audit_log 
        DROP CONSTRAINT room_audit_log_room_id_fkey;
    END IF;

    ALTER TABLE public.room_audit_log 
    ADD CONSTRAINT room_audit_log_room_id_fkey 
    FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
END $$;

-- 2. CLEAN UP ALL DUPLICATES (Now with CASCADE support)
WITH oldest_rooms AS (
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
    SELECT 1 FROM oldest_rooms o
    WHERE r.created_at = o.min_at
      AND LEAST(r.created_by, r.target_user_id) = o.u1
      AND GREATEST(r.created_by, r.target_user_id) = o.u2
  );

-- 3. ENFORCE UNIQUENESS
DROP INDEX IF EXISTS unique_direct_chat_pair;
CREATE UNIQUE INDEX unique_direct_chat_pair 
ON public.rooms (
  LEAST(created_by, target_user_id), 
  GREATEST(created_by, target_user_id)
) 
WHERE (is_direct = true AND target_user_id IS NOT NULL);

-- 4. FIX MISSING MEMBERSHIPS
-- Ensure BOTH users are members of EVERY direct chat they are part of
INSERT INTO public.room_members (room_id, user_id, role)
SELECT id, created_by, 'creator' FROM public.rooms WHERE is_direct = true
ON CONFLICT DO NOTHING;

INSERT INTO public.room_members (room_id, user_id, role)
SELECT id, target_user_id, 'member' FROM public.rooms WHERE is_direct = true AND target_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';

-- 6. DIAGNOSTIC OUTPUT (Check results)
SELECT 
    r.id, 
    u1.username as creator, 
    u2.username as target, 
    r.created_at,
    (SELECT count(*) FROM public.room_members rm WHERE rm.room_id = r.id) as member_count
FROM public.rooms r
LEFT JOIN public.users u1 ON r.created_by = u1.id
LEFT JOIN public.users u2 ON r.target_user_id = u2.id
WHERE r.is_direct = true;
