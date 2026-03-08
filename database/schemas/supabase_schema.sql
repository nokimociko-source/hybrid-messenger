-- Catlover Supabase Schema

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  about TEXT,
  status TEXT DEFAULT 'online',
  public_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.users;
CREATE POLICY "Public profiles are viewable by everyone." ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
CREATE POLICY "Users can insert their own profile." ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile." ON public.users;
CREATE POLICY "Users can update own profile." ON public.users FOR UPDATE USING (auth.uid() = id);

-- Rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('direct', 'community')),
  topic TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist if table was already created
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_direct BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.users(id);
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;

-- Room members table with roles (like Telegram)
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

-- Enable RLS on room_members
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Simple policies without recursion
DROP POLICY IF EXISTS "Room members are viewable by participants" ON public.room_members;
CREATE POLICY "Room members are viewable by participants" ON public.room_members 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can add members" ON public.room_members;
CREATE POLICY "Admins can add members" ON public.room_members 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can update member roles" ON public.room_members;
CREATE POLICY "Admins can update member roles" ON public.room_members 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Members can leave or be removed by admins" ON public.room_members;
CREATE POLICY "Members can leave or be removed by admins" ON public.room_members 
  FOR DELETE USING (
    auth.uid() = user_id OR auth.role() = 'authenticated'
  );

-- Enable RLS on rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rooms are viewable by everyone." ON public.rooms;
DROP POLICY IF EXISTS "Rooms are viewable by participants" ON public.rooms;
CREATE POLICY "Rooms are viewable by participants" ON public.rooms 
  FOR SELECT USING (
    NOT is_direct OR (auth.uid() = created_by OR auth.uid() = target_user_id)
  );
DROP POLICY IF EXISTS "Authenticated users can create rooms." ON public.rooms;
CREATE POLICY "Authenticated users can create rooms." ON public.rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Secure function to search users by username, email, or phone
CREATE OR REPLACE FUNCTION search_users(search_query TEXT)
RETURNS TABLE(id UUID, username TEXT, avatar_url TEXT, about TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.avatar_url, u.about
  FROM public.users u
  LEFT JOIN auth.users au ON u.id = au.id
  WHERE u.username ILIKE '%' || search_query || '%'
     OR au.email ILIKE search_query
     OR au.phone = search_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add read_by column for read receipts (array of user IDs who read the message)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT '{}';

-- Add reply_to for message replies
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add reactions column (JSONB array of {emoji, user_id})
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]';

-- Add media_url for media messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Add is_pinned for pinned messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add pinned_at timestamp
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;

-- Add pinned_by user who pinned the message
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.users(id);

-- Add forwarded_from for forwarded messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS forwarded_from UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add file_name and file_size for document messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages are viewable by everyone." ON public.messages;
CREATE POLICY "Messages are viewable by everyone." ON public.messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert messages." ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages." ON public.messages;
CREATE POLICY "Authenticated users can insert messages." ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can update their own messages." ON public.messages;
CREATE POLICY "Authenticated users can update their own messages." ON public.messages FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can delete their own messages." ON public.messages;
CREATE POLICY "Authenticated users can delete their own messages." ON public.messages FOR DELETE USING (auth.uid() = user_id);

-- Set replica identity to FULL for proper realtime updates/deletes
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Media support
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Pinned messages table for room-level pinned messages tracking
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  pinned_by UUID REFERENCES public.users(id) NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(room_id, message_id)
);

-- Enable RLS on pinned_messages
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pinned messages are viewable by everyone." ON public.pinned_messages;
CREATE POLICY "Pinned messages are viewable by everyone." ON public.pinned_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can pin messages." ON public.pinned_messages;
CREATE POLICY "Authenticated users can pin messages." ON public.pinned_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can unpin messages." ON public.pinned_messages;
CREATE POLICY "Users can unpin messages." ON public.pinned_messages FOR DELETE USING (auth.role() = 'authenticated');

-- Storage Bucket setup for Media
insert into storage.buckets (id, name, public) 
values ('media', 'media', true) 
on conflict ("id") do nothing;

DROP POLICY IF EXISTS "Media is public" on storage.objects;
create policy "Media is public" 
on storage.objects for select 
using ( bucket_id = 'media' );

DROP POLICY IF EXISTS "Users can upload media" on storage.objects;
create policy "Users can upload media" 
on storage.objects for insert 
with check ( bucket_id = 'media' AND auth.role() = 'authenticated' );

-- Function to check if user has permission in room
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_room_id UUID,
  p_user_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_permissions JSONB;
BEGIN
  SELECT role, permissions INTO v_role, v_permissions
  FROM public.room_members
  WHERE room_id = p_room_id AND user_id = p_user_id;
  
  -- Creator and admin have all permissions
  IF v_role IN ('creator', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission
  RETURN COALESCE((v_permissions->>p_permission)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically add creator as member when room is created
CREATE OR REPLACE FUNCTION public.handle_new_room() 
RETURNS TRIGGER AS $$
BEGIN
  -- Add creator as member with creator role
  IF NOT NEW.is_direct THEN
    INSERT INTO public.room_members (room_id, user_id, role, permissions)
    VALUES (
      NEW.id, 
      NEW.created_by, 
      'creator',
      '{
        "can_send_messages": true,
        "can_send_media": true,
        "can_add_members": true,
        "can_pin_messages": true,
        "can_delete_messages": true,
        "can_ban_members": true,
        "can_change_info": true,
        "can_invite_users": true
      }'::jsonb
    );
    
    -- Set initial member count
    NEW.member_count := 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_room_created ON public.rooms;
CREATE TRIGGER on_room_created
  BEFORE INSERT ON public.rooms
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_room();

-- Function to update member count
CREATE OR REPLACE FUNCTION public.update_room_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rooms 
    SET member_count = member_count + 1 
    WHERE id = NEW.room_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rooms 
    SET member_count = member_count - 1 
    WHERE id = OLD.room_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_member_change ON public.room_members;
CREATE TRIGGER on_member_change
  AFTER INSERT OR DELETE ON public.room_members
  FOR EACH ROW EXECUTE PROCEDURE public.update_room_member_count();

-- Enable Realtime for rooms and messages
begin;
  -- remove the supabase_realtime publication
  drop publication if exists supabase_realtime;

  -- re-create the supabase_realtime publication with no tables
  create publication supabase_realtime;
commit;

-- add tables to the publication
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.room_members;

-- Optional: Function to automatically create a user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'username', 
      SPLIT_PART(new.email, '@', 1),
      'user_' || substr(new.id::text, 1, 8)
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Force Supabase API to reload the schema cache so it sees new columns immediately
NOTIFY pgrst, 'reload schema';

-- ============================================
-- Advanced Emoji & Stickers Feature Schema
-- ============================================

-- Sticker Packs table
CREATE TABLE IF NOT EXISTS public.sticker_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT sticker_packs_name_check CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

CREATE INDEX IF NOT EXISTS idx_sticker_packs_created_at ON public.sticker_packs(created_at DESC);

-- Stickers table
CREATE TABLE IF NOT EXISTS public.stickers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  emoji_shortcode TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT stickers_order_index_check CHECK (order_index >= 0)
);

CREATE INDEX IF NOT EXISTS idx_stickers_pack_id ON public.stickers(pack_id);
CREATE INDEX IF NOT EXISTS idx_stickers_order ON public.stickers(pack_id, order_index);

-- User Sticker Packs table (junction table for user's sticker pack collections)
CREATE TABLE IF NOT EXISTS public.user_sticker_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, pack_id),
  CONSTRAINT user_sticker_packs_order_check CHECK (order_index >= 0)
);

CREATE INDEX IF NOT EXISTS idx_user_sticker_packs_user_id ON public.user_sticker_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sticker_packs_order ON public.user_sticker_packs(user_id, order_index);

-- Enable RLS on user_sticker_packs
ALTER TABLE public.user_sticker_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sticker packs" ON public.user_sticker_packs;
CREATE POLICY "Users can view their own sticker packs"
  ON public.user_sticker_packs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add sticker packs" ON public.user_sticker_packs;
CREATE POLICY "Users can add sticker packs"
  ON public.user_sticker_packs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their sticker pack order" ON public.user_sticker_packs;
CREATE POLICY "Users can update their sticker pack order"
  ON public.user_sticker_packs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove sticker packs" ON public.user_sticker_packs;
CREATE POLICY "Users can remove sticker packs"
  ON public.user_sticker_packs FOR DELETE
  USING (auth.uid() = user_id);

-- User Premium Status table
CREATE TABLE IF NOT EXISTS public.user_premium_status (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  premium_until TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_premium_status_premium ON public.user_premium_status(is_premium, premium_until);

-- Enable RLS on user_premium_status
ALTER TABLE public.user_premium_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own premium status" ON public.user_premium_status;
CREATE POLICY "Users can view their own premium status"
  ON public.user_premium_status FOR SELECT
  USING (auth.uid() = user_id);

-- Premium Emojis table
CREATE TABLE IF NOT EXISTS public.premium_emojis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  animation_url TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_premium_emojis_category ON public.premium_emojis(category);
CREATE INDEX IF NOT EXISTS idx_premium_emojis_tags ON public.premium_emojis USING GIN(tags);

-- Enable RLS on premium_emojis
ALTER TABLE public.premium_emojis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Premium emojis are viewable by everyone" ON public.premium_emojis;
CREATE POLICY "Premium emojis are viewable by everyone"
  ON public.premium_emojis FOR SELECT
  USING (true);

-- Storage Buckets for Stickers and Premium Emojis
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stickers', 'stickers', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('premium-emojis', 'premium-emojis', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for stickers bucket
DROP POLICY IF EXISTS "Stickers are publicly accessible" ON storage.objects;
CREATE POLICY "Stickers are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'stickers');

DROP POLICY IF EXISTS "Authenticated users can upload stickers" ON storage.objects;
CREATE POLICY "Authenticated users can upload stickers" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'stickers' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own stickers" ON storage.objects;
CREATE POLICY "Users can update their own stickers" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'stickers' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own stickers" ON storage.objects;
CREATE POLICY "Users can delete their own stickers" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'stickers' AND auth.role() = 'authenticated');

-- Storage policies for premium-emojis bucket
DROP POLICY IF EXISTS "Premium emojis are publicly accessible" ON storage.objects;
CREATE POLICY "Premium emojis are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'premium-emojis');

DROP POLICY IF EXISTS "Only admins can upload premium emojis" ON storage.objects;
CREATE POLICY "Only admins can upload premium emojis" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'premium-emojis' AND auth.role() = 'authenticated');

-- Add realtime support for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sticker_packs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_premium_status;

-- Notify Supabase to reload schema
NOTIFY pgrst, 'reload schema';

-- ============================================
-- Chat Organization Essentials Feature Schema
-- ============================================

-- Chat Folders table
CREATE TABLE IF NOT EXISTS public.chat_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT chat_folders_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 50),
  CONSTRAINT chat_folders_order_check CHECK (order_index >= 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_folders_user_id ON public.chat_folders(user_id, order_index);

-- Chat Folder Items table (junction table for many-to-many chat-folder relationships)
CREATE TABLE IF NOT EXISTS public.chat_folder_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID NOT NULL REFERENCES public.chat_folders(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(folder_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_folder_items_folder_id ON public.chat_folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_chat_folder_items_room_id ON public.chat_folder_items(room_id);

-- Pinned Chats table (stores pinned chat status and ordering per user)
CREATE TABLE IF NOT EXISTS public.pinned_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, room_id),
  CONSTRAINT pinned_chats_order_check CHECK (order_index >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pinned_chats_user_id ON public.pinned_chats(user_id, order_index);

-- Archived Chats table (stores archived chat status per user)
CREATE TABLE IF NOT EXISTS public.archived_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_archived_chats_user_id ON public.archived_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_archived_chats_room_id ON public.archived_chats(room_id);

-- Mute Settings table (stores notification mute settings per user per chat)
CREATE TABLE IF NOT EXISTS public.mute_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  muted_until TIMESTAMP WITH TIME ZONE,
  is_indefinite BOOLEAN NOT NULL DEFAULT false,
  muted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_mute_settings_user_id ON public.mute_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_mute_settings_expiry ON public.mute_settings(muted_until) WHERE muted_until IS NOT NULL;

-- Mentions table (stores mention data for tracking unread mentions per user)
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mentioned_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(message_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_mentions_user_id ON public.mentions(mentioned_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_mentions_room_id ON public.mentions(room_id, mentioned_user_id);

-- Message Drafts table (stores unsent message text per user per chat)
CREATE TABLE IF NOT EXISTS public.message_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, room_id),
  CONSTRAINT message_drafts_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 10000)
);

CREATE INDEX IF NOT EXISTS idx_message_drafts_user_id ON public.message_drafts(user_id);

-- ============================================
-- Row-Level Security Policies
-- ============================================

-- Chat Folders RLS
ALTER TABLE public.chat_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own folders" ON public.chat_folders;
CREATE POLICY "Users can view their own folders"
  ON public.chat_folders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own folders" ON public.chat_folders;
CREATE POLICY "Users can create their own folders"
  ON public.chat_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own folders" ON public.chat_folders;
CREATE POLICY "Users can update their own folders"
  ON public.chat_folders FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own folders" ON public.chat_folders;
CREATE POLICY "Users can delete their own folders"
  ON public.chat_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Chat Folder Items RLS
ALTER TABLE public.chat_folder_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own folder items" ON public.chat_folder_items;
CREATE POLICY "Users can view their own folder items"
  ON public.chat_folder_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_folders
      WHERE id = folder_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own folder items" ON public.chat_folder_items;
CREATE POLICY "Users can create their own folder items"
  ON public.chat_folder_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_folders
      WHERE id = folder_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own folder items" ON public.chat_folder_items;
CREATE POLICY "Users can delete their own folder items"
  ON public.chat_folder_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_folders
      WHERE id = folder_id AND user_id = auth.uid()
    )
  );

-- Pinned Chats RLS
ALTER TABLE public.pinned_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own pinned chats" ON public.pinned_chats;
CREATE POLICY "Users can view their own pinned chats"
  ON public.pinned_chats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own pinned chats" ON public.pinned_chats;
CREATE POLICY "Users can create their own pinned chats"
  ON public.pinned_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pinned chats" ON public.pinned_chats;
CREATE POLICY "Users can update their own pinned chats"
  ON public.pinned_chats FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pinned chats" ON public.pinned_chats;
CREATE POLICY "Users can delete their own pinned chats"
  ON public.pinned_chats FOR DELETE
  USING (auth.uid() = user_id);

-- Archived Chats RLS
ALTER TABLE public.archived_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own archived chats" ON public.archived_chats;
CREATE POLICY "Users can view their own archived chats"
  ON public.archived_chats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own archived chats" ON public.archived_chats;
CREATE POLICY "Users can create their own archived chats"
  ON public.archived_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own archived chats" ON public.archived_chats;
CREATE POLICY "Users can delete their own archived chats"
  ON public.archived_chats FOR DELETE
  USING (auth.uid() = user_id);

-- Mute Settings RLS
ALTER TABLE public.mute_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own mute settings" ON public.mute_settings;
CREATE POLICY "Users can view their own mute settings"
  ON public.mute_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own mute settings" ON public.mute_settings;
CREATE POLICY "Users can create their own mute settings"
  ON public.mute_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own mute settings" ON public.mute_settings;
CREATE POLICY "Users can update their own mute settings"
  ON public.mute_settings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own mute settings" ON public.mute_settings;
CREATE POLICY "Users can delete their own mute settings"
  ON public.mute_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Mentions RLS
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view mentions for themselves" ON public.mentions;
CREATE POLICY "Users can view mentions for themselves"
  ON public.mentions FOR SELECT
  USING (auth.uid() = mentioned_user_id);

DROP POLICY IF EXISTS "Users can create mentions" ON public.mentions;
CREATE POLICY "Users can create mentions"
  ON public.mentions FOR INSERT
  WITH CHECK (auth.uid() = mentioned_by_user_id);

DROP POLICY IF EXISTS "Users can update their own mentions" ON public.mentions;
CREATE POLICY "Users can update their own mentions"
  ON public.mentions FOR UPDATE
  USING (auth.uid() = mentioned_user_id);

-- Message Drafts RLS
ALTER TABLE public.message_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own drafts" ON public.message_drafts;
CREATE POLICY "Users can view their own drafts"
  ON public.message_drafts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own drafts" ON public.message_drafts;
CREATE POLICY "Users can create their own drafts"
  ON public.message_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own drafts" ON public.message_drafts;
CREATE POLICY "Users can update their own drafts"
  ON public.message_drafts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own drafts" ON public.message_drafts;
CREATE POLICY "Users can delete their own drafts"
  ON public.message_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Database Functions and Triggers
-- ============================================

-- Function to automatically unarchive a chat when a new message arrives
CREATE OR REPLACE FUNCTION public.auto_unarchive_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove archive status for all users in the room except the sender
  DELETE FROM public.archived_chats
  WHERE room_id = NEW.room_id
    AND user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_unarchive ON public.messages;
CREATE TRIGGER trigger_auto_unarchive
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_unarchive_on_message();

-- Function to extract @username mentions from message content
CREATE OR REPLACE FUNCTION public.extract_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mention_pattern TEXT := '@([a-zA-Z0-9_]+)';
  mentioned_username TEXT;
  mentioned_user_id UUID;
BEGIN
  -- Extract all @username patterns from content
  FOR mentioned_username IN
    SELECT DISTINCT regexp_matches[1]
    FROM regexp_matches(NEW.content, mention_pattern, 'g')
  LOOP
    -- Find user ID by username
    SELECT id INTO mentioned_user_id
    FROM public.users
    WHERE username = mentioned_username;
    
    -- Create mention record if user exists and is not the sender
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      INSERT INTO public.mentions (
        message_id,
        room_id,
        mentioned_user_id,
        mentioned_by_user_id
      )
      VALUES (
        NEW.id,
        NEW.room_id,
        mentioned_user_id,
        NEW.user_id
      )
      ON CONFLICT (message_id, mentioned_user_id) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_extract_mentions ON public.messages;
CREATE TRIGGER trigger_extract_mentions
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.extract_mentions();

-- Function to automatically remove pin status when a chat is archived
CREATE OR REPLACE FUNCTION public.unpin_archived_chat()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.pinned_chats
  WHERE user_id = NEW.user_id
    AND room_id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_unpin_archived ON public.archived_chats;
CREATE TRIGGER trigger_unpin_archived
  AFTER INSERT ON public.archived_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.unpin_archived_chat();

-- ============================================
-- Realtime Support
-- ============================================

-- Add new tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_folder_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.archived_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mute_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_drafts;

-- Notify Supabase to reload schema
NOTIFY pgrst, 'reload schema';
