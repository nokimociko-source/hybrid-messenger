-- ============================================================================
-- FIX DIRECT CHAT DUPLICATES AND ENFORCE UNIQUENESS
-- ============================================================================

-- Disable triggers to avoid audit log FK violations during cleanup
SET session_replication_role = 'replica';

-- 1. Clean up duplicate "Saved Messages" (self-chats)
-- Keep only the oldest room for each user
DELETE FROM public.rooms r1
WHERE r1.is_direct = true
  AND r1.created_by = r1.target_user_id
  AND r1.created_at > (
    SELECT MIN(r2.created_at)
    FROM public.rooms r2
    WHERE r2.created_by = r1.created_by
      AND r2.is_direct = true
      AND r2.target_user_id = r2.created_by
  );

-- 2. Clean up duplicate direct chats between different users
DELETE FROM public.rooms r1
WHERE r1.is_direct = true
  AND r1.created_by != r1.target_user_id
  AND r1.created_at > (
    SELECT MIN(r2.created_at)
    FROM public.rooms r2
    WHERE r2.is_direct = true
      AND (
        (r2.created_by = r1.created_by AND r2.target_user_id = r1.target_user_id) OR
        (r2.created_by = r1.target_user_id AND r2.target_user_id = r1.created_by)
      )
  );

-- Re-enable triggers
SET session_replication_role = 'origin';

-- 3. Add unique constraint (Index) for direct chat pairs
-- Use LEAST/GREATEST to ensure (A, B) and (B, A) are treated as the same pair
DROP INDEX IF EXISTS unique_direct_chat_pair;
CREATE UNIQUE INDEX unique_direct_chat_pair 
ON public.rooms (
  LEAST(created_by, target_user_id), 
  GREATEST(created_by, target_user_id)
) 
WHERE (is_direct = true AND target_user_id IS NOT NULL);

-- 4. Update the start_direct_chat RPC to be more robust
CREATE OR REPLACE FUNCTION public.start_direct_chat(p_target_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_room_id UUID;
    v_my_id UUID;
BEGIN
    v_my_id := auth.uid();
    IF v_my_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 1. Try to find existing room using the same LEAST/GREATEST logic
    SELECT id INTO v_room_id
    FROM public.rooms
    WHERE is_direct = true
      AND (
        (created_by = v_my_id AND target_user_id = p_target_user_id) OR
        (created_by = p_target_user_id AND target_user_id = v_my_id)
      )
    LIMIT 1;

    IF v_room_id IS NOT NULL THEN
        -- Ensure we are in room_members (just in case)
        INSERT INTO public.room_members (room_id, user_id, role)
        VALUES (v_room_id, v_my_id, 'member')
        ON CONFLICT DO NOTHING;
        
        RETURN v_room_id;
    END IF;

    -- 2. Try to insert new room, catch unique constraint violation
    BEGIN
        INSERT INTO public.rooms (name, type, is_direct, created_by, target_user_id, is_encrypted)
        VALUES ('Direct', 'direct', true, v_my_id, p_target_user_id, true)
        RETURNING id INTO v_room_id;
    EXCEPTION WHEN unique_violation THEN
        -- Someone else created it in parallel! Find it again.
        SELECT id INTO v_room_id
        FROM public.rooms
        WHERE is_direct = true
          AND (
            (created_by = v_my_id AND target_user_id = p_target_user_id) OR
            (created_by = p_target_user_id AND target_user_id = v_my_id)
          )
        LIMIT 1;
    END;

    -- 3. Add members
    IF v_room_id IS NOT NULL THEN
        INSERT INTO public.room_members (room_id, user_id, role)
        VALUES (v_room_id, v_my_id, 'creator')
        ON CONFLICT DO NOTHING;

        IF v_my_id != p_target_user_id THEN
            INSERT INTO public.room_members (room_id, user_id, role)
            VALUES (v_room_id, p_target_user_id, 'member')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
