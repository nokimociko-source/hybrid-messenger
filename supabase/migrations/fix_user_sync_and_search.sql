-- =============================================
-- USER SYNC & SEARCH FIX (ROBUST VERSION)
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Improved User Sync Trigger with Collision Handling
-- If username exists, it appends a short suffix to ensure UNIQUE constraint is satisfied.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_username TEXT;
  v_base_username TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Determine base username
  v_base_username := COALESCE(
    new.raw_user_meta_data->>'username', 
    split_part(new.email, '@', 1),
    'user'
  );
  v_username := v_base_username;

  -- Handle collision loop (up to 10 attempts)
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = v_username AND id != new.id) AND v_counter < 10 LOOP
    v_counter := v_counter + 1;
    v_username := v_base_username || v_counter;
  END LOOP;

  -- Final fallback if 10 collisions
  IF v_counter >= 10 THEN
    v_username := v_base_username || '_' || substr(new.id::text, 1, 5);
  END IF;

  INSERT INTO public.users (id, username, avatar_url)
  VALUES (new.id, v_username, new.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url;
  
  RETURN new;
END;
$$;

-- 2. Manual Sync for Existing Users (with collision handling)
DO $$
DECLARE
  r RECORD;
  v_username TEXT;
  v_base_username TEXT;
  v_counter INTEGER;
BEGIN
  FOR r IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
    -- Logic similar to trigger
    v_base_username := COALESCE(
      r.raw_user_meta_data->>'username', 
      split_part(r.email, '@', 1),
      'user'
    );
    v_username := v_base_username;
    v_counter := 0;

    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = v_username AND id != r.id) AND v_counter < 10 LOOP
      v_counter := v_counter + 1;
      v_username := v_base_username || v_counter;
    END LOOP;

    IF v_counter >= 10 THEN
      v_username := v_base_username || '_' || substr(r.id::text, 1, 5);
    END IF;

    INSERT INTO public.users (id, username, avatar_url)
    VALUES (r.id, v_username, r.raw_user_meta_data->>'avatar_url')
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- 3. Robust Search function (Email, ID, Username)
CREATE OR REPLACE FUNCTION public.search_users(search_query TEXT)
RETURNS TABLE(id UUID, username TEXT, avatar_url TEXT, about TEXT) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.avatar_url, u.about
  FROM public.users u
  LEFT JOIN auth.users au ON u.id = au.id
  WHERE u.username ILIKE '%' || search_query || '%'
     OR au.email ILIKE '%' || search_query || '%'
     OR u.id::text = search_query;
END;
$$;

-- 4. Reload PostgREST Cache
NOTIFY pgrst, 'reload schema';

-- 5. Verification: List current public users
SELECT id, username, status FROM public.users LIMIT 10;

-- Robust function to start or find a direct chat
CREATE OR REPLACE FUNCTION public.start_direct_chat(p_target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room_id UUID;
    v_current_user_id UUID := auth.uid();
BEGIN
    -- 1. Try to find existing direct room
    SELECT id INTO v_room_id
    FROM public.rooms
    WHERE is_direct = true
      AND (
        (created_by = v_current_user_id AND target_user_id = p_target_user_id)
        OR (created_by = p_target_user_id AND target_user_id = v_current_user_id)
      )
    LIMIT 1;

    IF v_room_id IS NOT NULL THEN
        RETURN v_room_id;
    END IF;

    -- 2. Create new room
    INSERT INTO public.rooms (name, type, is_direct, created_by, target_user_id)
    VALUES ('Direct', 'direct', true, v_current_user_id, p_target_user_id)
    RETURNING id INTO v_room_id;

    -- 3. Add members (using ON CONFLICT DO NOTHING to prevent 409s)
    INSERT INTO public.room_members (room_id, user_id, role)
    VALUES (v_room_id, v_current_user_id, 'member')
    ON CONFLICT (room_id, user_id) DO NOTHING;

    IF v_current_user_id != p_target_user_id THEN
        INSERT INTO public.room_members (room_id, user_id, role)
        VALUES (v_room_id, p_target_user_id, 'member')
        ON CONFLICT (room_id, user_id) DO NOTHING;
    END IF;

    RETURN v_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_direct_chat(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
