-- ============================================================================
-- FINAL MEGA-FIX & HEALTH CHECK
-- ============================================================================
-- Execute this script to fix ALL schema issues once and for all.

-- 1. BASE SCHEMA & CONSTRAINTS
-- ============================================================================

-- Ensure room_members has the EXACT foreign key name the code expects
ALTER TABLE public.room_members DROP CONSTRAINT IF EXISTS room_members_user_id_fkey;
ALTER TABLE public.room_members ADD CONSTRAINT room_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Ensure rooms table has all required columns
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'community',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_message_id UUID,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_message_preview TEXT;

-- Update rooms type constraint
DO $$ 
BEGIN
    ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_type_check;
    ALTER TABLE public.rooms ADD CONSTRAINT rooms_type_check CHECK (type IN ('direct', 'community', 'channel'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. TABLES FOR RPC FUNCTIONS
-- ============================================================================

-- Table for tracking message views (REQUIRED for record_message_view RPC)
CREATE TABLE IF NOT EXISTS public.message_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, user_id)
);


-- 3. FUNCTIONS (RPC)
-- ============================================================================

-- record_message_view
CREATE OR REPLACE FUNCTION public.record_message_view(p_message_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.message_views (message_id, user_id)
  VALUES (p_message_id, p_user_id)
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- check_channel_post_permission
CREATE OR REPLACE FUNCTION public.user_has_permission(p_room_id UUID, p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_permissions JSONB;
  v_room_type TEXT;
  v_created_by UUID;
  v_target_user_id UUID;
BEGIN
  -- Get room details first
  SELECT type, created_by, target_user_id INTO v_room_type, v_created_by, v_target_user_id 
  FROM public.rooms WHERE id = p_room_id;

  -- Handle direct chats automatically
  IF v_room_type = 'direct' THEN
    IF p_user_id = v_created_by OR p_user_id = v_target_user_id THEN
      RETURN TRUE;
    END IF;
  END IF;

  SELECT role, permissions INTO v_role, v_permissions FROM public.room_members WHERE room_id = p_room_id AND user_id = p_user_id;
  IF v_role IN ('creator', 'admin') THEN RETURN TRUE; END IF;
  RETURN COALESCE((v_permissions->>p_permission)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_channel_post_permission(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_room_type TEXT;
  v_user_role TEXT;
BEGIN
  SELECT type INTO v_room_type FROM public.rooms WHERE id = p_room_id;
  IF v_room_type IS NULL OR v_room_type != 'channel' THEN
    RETURN public.user_has_permission(p_room_id, p_user_id, 'can_send_messages');
  END IF;
  SELECT role INTO v_user_role FROM public.room_members WHERE room_id = p_room_id AND user_id = p_user_id;
  RETURN v_user_role IN ('creator', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- search_users
CREATE OR REPLACE FUNCTION public.search_users(search_query TEXT)
RETURNS TABLE(id UUID, username TEXT, avatar_url TEXT, about TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.avatar_url, u.about
  FROM public.users u
  WHERE u.username ILIKE '%' || search_query || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. RELOAD & HEALTH CHECK
-- ============================================

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verification Query (Check if everything is ready)
SELECT 
    (SELECT count(*) FROM pg_proc WHERE proname = 'record_message_view') as has_record_view_func,
    (SELECT count(*) FROM pg_proc WHERE proname = 'check_channel_post_permission') as has_post_perm_func,
    (SELECT count(*) FROM pg_constraint WHERE conname = 'room_members_user_id_fkey') as has_correct_fkey,
    (SELECT count(*) FROM information_schema.tables WHERE table_name = 'message_views') as has_message_views_table;

DO $$
BEGIN
  RAISE NOTICE 'Fix applied. If errors persist, please manually reload PostgREST in Supabase Dashboard (Settings -> API -> Save).';
END $$;
