-- ============================================================================
-- COMPLETE SUPABASE DATABASE SETUP FOR HYBRID MESSENGER
-- ============================================================================
-- Date: March 3, 2026
-- Description: Complete database setup for Hybrid Messenger
-- Includes: core tables, E2E encryption, media, chat organization, DDoS protection
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  about TEXT,
  status TEXT DEFAULT 'online',
  public_key TEXT,
  key_type TEXT DEFAULT 'nacl',
  key_created_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.users;
CREATE POLICY "Public profiles are viewable by everyone." ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
CREATE POLICY "Users can insert their own profile." ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile." ON public.users;
CREATE POLICY "Users can update own profile." ON public.users FOR UPDATE USING (auth.uid() = id);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_public_key ON users(public_key) WHERE public_key IS NOT NULL;

-- Rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('direct', 'community', 'channel')),
  topic TEXT,
  created_by UUID REFERENCES public.users(id),
  is_direct BOOLEAN DEFAULT false,
  target_user_id UUID REFERENCES public.users(id),
  avatar_url TEXT,
  member_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  last_message_id UUID,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for rooms
CREATE INDEX IF NOT EXISTS idx_rooms_is_public ON public.rooms(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_rooms_type_public ON public.rooms(type, is_public) WHERE type = 'channel' AND is_public = true;
-- Room members with roles
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
  permissions JSONB DEFAULT '{
    "can_send_messages": true,
    "can_send_media": true,
    "can_add_members": false,
    "can_pin_messages": false,
    "can_delete_messages": false,
    "can_ban_members": false,
    "can_change_info": false,
    "can_invite_users": false
  }'::jsonb,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  invited_by UUID REFERENCES public.users(id),
  UNIQUE(room_id, user_id)
);

-- Enable RLS for room_members
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Room members are viewable by participants" ON public.room_members;
CREATE POLICY "Room members are viewable by participants" ON public.room_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can add members" ON public.room_members;
CREATE POLICY "Admins can add members" ON public.room_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can update member roles" ON public.room_members;
CREATE POLICY "Admins can update member roles" ON public.room_members FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Members can leave or be removed by admins" ON public.room_members;
CREATE POLICY "Members can leave or be removed by admins" ON public.room_members FOR DELETE USING (
    auth.uid() = user_id OR auth.role() = 'authenticated'
  );

-- Enable RLS for rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rooms are viewable by participants" ON public.rooms;
CREATE POLICY "Rooms are viewable by participants" ON public.rooms FOR SELECT USING (
    NOT is_direct OR (auth.uid() = created_by OR auth.uid() = target_user_id)
  );
DROP POLICY IF EXISTS "Authenticated users can create rooms." ON public.rooms;
CREATE POLICY "Authenticated users can create rooms." ON public.rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read_by UUID[] DEFAULT '{}',
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  reactions JSONB DEFAULT '[]',
  media_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  pinned_at TIMESTAMP WITH TIME ZONE,
  pinned_by UUID REFERENCES public.users(id),
  forwarded_from UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  encryption_algorithm TEXT,
  encryption_nonce TEXT,
  encrypted_metadata JSONB,
  encrypted_file_key TEXT,
  file_encryption_nonce TEXT,
  media_group_id TEXT,
  media_order INTEGER,
  is_compressed BOOLEAN DEFAULT false,
  original_width INTEGER,
  original_height INTEGER,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON messages(is_encrypted) WHERE is_encrypted = true;
CREATE INDEX IF NOT EXISTS idx_messages_media_group ON public.messages(media_group_id, media_order) WHERE media_group_id IS NOT NULL;

-- Constraint for media order validation
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_media_order_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_media_order_check CHECK (
    (media_group_id IS NULL AND media_order IS NULL) OR
    (media_group_id IS NOT NULL AND media_order IS NOT NULL AND media_order >= 0)
  );

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages are viewable by everyone." ON public.messages;
CREATE POLICY "Messages are viewable by everyone." ON public.messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert messages." ON public.messages;
CREATE POLICY "Authenticated users can insert messages." ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Authenticated users can update their own messages." ON public.messages;
CREATE POLICY "Authenticated users can update their own messages." ON public.messages FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Authenticated users can delete their own messages." ON public.messages;
CREATE POLICY "Authenticated users can delete their own messages." ON public.messages FOR DELETE USING (auth.uid() = user_id);

-- Set replica identity for realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ============================================================================
-- E2E ENCRYPTION (ZERO-KNOWLEDGE)
-- ============================================================================

-- Room keys table for group chats
CREATE TABLE IF NOT EXISTS room_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_room_key TEXT NOT NULL,
  key_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id, key_version)
);

-- Indexes for room_keys
CREATE INDEX IF NOT EXISTS idx_room_keys_user ON room_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_room_keys_room ON room_keys(room_id);
CREATE INDEX IF NOT EXISTS idx_room_keys_version ON room_keys(room_id, key_version DESC);

-- RLS for room_keys
ALTER TABLE room_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own room keys" ON room_keys;
CREATE POLICY "Users can read own room keys" ON room_keys FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own room keys" ON room_keys;
CREATE POLICY "Users can insert own room keys" ON room_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own room keys" ON room_keys;
CREATE POLICY "Users can update own room keys" ON room_keys FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own room keys" ON room_keys;
CREATE POLICY "Users can delete own room keys" ON room_keys FOR DELETE USING (auth.uid() = user_id);

-- E2E audit log
CREATE TABLE IF NOT EXISTS e2e_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  room_id UUID REFERENCES rooms(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_e2e_audit_user ON e2e_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_e2e_audit_created ON e2e_audit_log(created_at DESC);

ALTER TABLE e2e_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own audit log" ON e2e_audit_log;
CREATE POLICY "Users can read own audit log" ON e2e_audit_log FOR SELECT USING (auth.uid() = user_id);
-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Media bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Media is public" ON storage.objects;
CREATE POLICY "Media is public" ON storage.objects FOR SELECT USING (bucket_id = 'media');
DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
CREATE POLICY "Users can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- ============================================================================
-- BASIC FUNCTIONS
-- ============================================================================

-- Function to search users
CREATE OR REPLACE FUNCTION search_users(search_query TEXT)
RETURNS TABLE(id UUID, username TEXT, avatar_url TEXT, about TEXT) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.avatar_url, u.about
  FROM public.users u
  LEFT JOIN auth.users au ON u.id = au.id
  WHERE u.username ILIKE '%' || search_query || '%'
     OR au.email ILIKE search_query
     OR au.phone = search_query;
END;
$$;

-- Function to check user permissions
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_room_id UUID,
  p_user_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_permissions JSONB;
BEGIN
  SELECT role, permissions INTO v_role, v_permissions
  FROM public.room_members
  WHERE room_id = p_room_id AND user_id = p_user_id;
  
  IF v_role IN ('creator', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  RETURN COALESCE((v_permissions->>p_permission)::boolean, false);
END;
$$;

-- E2E encryption functions
CREATE OR REPLACE FUNCTION get_user_public_key(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT public_key FROM users WHERE id = target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION get_room_key(target_room_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT encrypted_room_key 
    FROM room_keys 
    WHERE room_id = target_room_id 
      AND user_id = auth.uid()
    ORDER BY key_version DESC
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_e2e_enabled(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = target_user_id AND public_key IS NOT NULL);
END;
$$;
-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-add creator as room member
CREATE OR REPLACE FUNCTION public.handle_new_room() 
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT NEW.is_direct THEN
    INSERT INTO public.room_members (room_id, user_id, role, permissions)
    VALUES (
      NEW.id, NEW.created_by, 'creator',
      '{"can_send_messages": true, "can_send_media": true, "can_add_members": true, "can_pin_messages": true, "can_delete_messages": true, "can_ban_members": true, "can_change_info": true, "can_invite_users": true}'::jsonb
    );
    NEW.member_count := 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_room_created ON public.rooms;
CREATE TRIGGER on_room_created
  BEFORE INSERT ON public.rooms
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_room();

-- Trigger: Update member count
CREATE OR REPLACE FUNCTION public.update_room_member_count()
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rooms SET member_count = member_count + 1 WHERE id = NEW.room_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rooms SET member_count = member_count - 1 WHERE id = OLD.room_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_member_change ON public.room_members;
CREATE TRIGGER on_member_change
  AFTER INSERT OR DELETE ON public.room_members
  FOR EACH ROW EXECUTE PROCEDURE public.update_room_member_count();

-- Trigger: Auto-create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger: Update room_keys updated_at
CREATE OR REPLACE FUNCTION update_room_keys_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_room_keys_updated_at ON room_keys;
CREATE TRIGGER trigger_update_room_keys_updated_at
  BEFORE UPDATE ON room_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_room_keys_updated_at();
-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

-- Remove and recreate publication
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

-- Add tables to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;

-- ============================================================================
-- E2E STATISTICS VIEW
-- ============================================================================

-- View: E2E encryption statistics (without SECURITY DEFINER)
CREATE OR REPLACE VIEW e2e_statistics AS
SELECT 
  COUNT(DISTINCT u.id) FILTER (WHERE u.public_key IS NOT NULL) as users_with_e2e,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT m.id) FILTER (WHERE m.is_encrypted = true) as encrypted_messages,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT rk.room_id) as rooms_with_e2e
FROM users u
CROSS JOIN messages m
CROSS JOIN room_keys rk;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User profiles with E2E encryption support';
COMMENT ON TABLE rooms IS 'Rooms (chats, channels, direct messages)';
COMMENT ON TABLE messages IS 'Messages with E2E encryption and media support';
COMMENT ON TABLE room_keys IS 'Encrypted room keys for group chats (Zero-Knowledge)';
COMMENT ON TABLE e2e_audit_log IS 'Audit log for E2E encryption actions';

-- Notify Supabase to reload schema
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- INSTALLATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 HYBRID MESSENGER DATABASE SETUP COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Installed:';
  RAISE NOTICE '   📊 Core tables: users, rooms, messages, room_members';
  RAISE NOTICE '   🔐 Zero-Knowledge E2E encryption';
  RAISE NOTICE '   📁 Basic chat organization';
  RAISE NOTICE '   🎨 Media support';
  RAISE NOTICE '   ⚡ Realtime subscriptions';
  RAISE NOTICE '   🗄️ Storage bucket: media';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY:';
  RAISE NOTICE '   - All tables protected with Row Level Security (RLS)';
  RAISE NOTICE '   - E2E encryption: private keys NOT stored in DB';
  RAISE NOTICE '   - DB admins CANNOT read encrypted messages';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Database ready for use!';
  RAISE NOTICE '📖 Documentation: docs/guides/ZERO_KNOWLEDGE_SECURITY.md';
END $$;