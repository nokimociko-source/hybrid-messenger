-- Broadcast Channels Schema Migration
-- This migration adds support for broadcast channels to the hybrid messenger application

-- ============================================================================
-- 1. EXTEND ROOMS TABLE
-- ============================================================================

-- Add 'channel' to rooms.type enum constraint
ALTER TABLE public.rooms 
  DROP CONSTRAINT IF EXISTS rooms_type_check;

ALTER TABLE public.rooms 
  ADD CONSTRAINT rooms_type_check 
  CHECK (type IN ('direct', 'community', 'channel'));

-- Add channel-specific fields
ALTER TABLE public.rooms 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

ALTER TABLE public.rooms 
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Add indexes for channel queries
CREATE INDEX IF NOT EXISTS idx_rooms_type_public ON public.rooms(type, is_public) 
  WHERE type = 'channel';

CREATE INDEX IF NOT EXISTS idx_rooms_member_count ON public.rooms(member_count DESC) 
  WHERE type = 'channel';

CREATE INDEX IF NOT EXISTS idx_rooms_category ON public.rooms(category) 
  WHERE type = 'channel';

-- ============================================================================
-- 2. CREATE MESSAGE_VIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(message_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_views_message ON public.message_views(message_id);
CREATE INDEX IF NOT EXISTS idx_message_views_user ON public.message_views(user_id);
CREATE INDEX IF NOT EXISTS idx_message_views_time ON public.message_views(viewed_at DESC);

-- Enable RLS on message_views
ALTER TABLE public.message_views ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. CREATE CHANNEL_CATEGORIES TABLE (OPTIONAL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.channel_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_channel_categories_order ON public.channel_categories(order_index);

-- Enable RLS on channel_categories
ALTER TABLE public.channel_categories ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. DATABASE FUNCTIONS
-- ============================================================================

-- Function to check if user can post in a channel
CREATE OR REPLACE FUNCTION check_channel_post_permission(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_room_type TEXT;
  v_user_role TEXT;
BEGIN
  -- Get room type
  SELECT type INTO v_room_type
  FROM public.rooms
  WHERE id = p_room_id;
  
  -- If not a channel, allow posting based on existing permissions
  IF v_room_type != 'channel' THEN
    RETURN public.user_has_permission(p_room_id, p_user_id, 'can_send_messages');
  END IF;
  
  -- For channels, only creators and admins can post
  SELECT role INTO v_user_role
  FROM public.room_members
  WHERE room_id = p_room_id AND user_id = p_user_id;
  
  RETURN v_user_role IN ('creator', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a message view
CREATE OR REPLACE FUNCTION record_message_view(
  p_message_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_room_type TEXT;
BEGIN
  -- Only track views for channel messages
  SELECT r.type INTO v_room_type
  FROM public.messages m
  JOIN public.rooms r ON m.room_id = r.id
  WHERE m.id = p_message_id;
  
  IF v_room_type = 'channel' THEN
    INSERT INTO public.message_views (message_id, user_id)
    VALUES (p_message_id, p_user_id)
    ON CONFLICT (message_id, user_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message view statistics
CREATE OR REPLACE FUNCTION get_message_view_stats(
  p_message_id UUID,
  p_requesting_user_id UUID
)
RETURNS TABLE(
  view_count BIGINT,
  viewers JSONB
) AS $$
DECLARE
  v_room_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get room and check if user is admin
  SELECT m.room_id INTO v_room_id
  FROM public.messages m
  WHERE m.id = p_message_id;
  
  SELECT role INTO v_user_role
  FROM public.room_members
  WHERE room_id = v_room_id AND user_id = p_requesting_user_id;
  
  -- Only admins can see detailed stats
  IF v_user_role NOT IN ('creator', 'admin') THEN
    RAISE EXCEPTION 'Only admins can view message statistics';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as view_count,
    jsonb_agg(
      jsonb_build_object(
        'user_id', mv.user_id,
        'username', u.username,
        'avatar_url', u.avatar_url,
        'viewed_at', mv.viewed_at
      ) ORDER BY mv.viewed_at DESC
    ) as viewers
  FROM public.message_views mv
  JOIN public.users u ON mv.user_id = u.id
  WHERE mv.message_id = p_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate a group to a channel
CREATE OR REPLACE FUNCTION migrate_group_to_channel(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_role TEXT;
  v_affected_members INTEGER;
BEGIN
  -- Check if user is creator
  SELECT role INTO v_user_role
  FROM public.room_members
  WHERE room_id = p_room_id AND user_id = p_user_id;
  
  IF v_user_role != 'creator' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only creator can migrate to channel');
  END IF;
  
  -- Update room type
  UPDATE public.rooms
  SET type = 'channel'
  WHERE id = p_room_id;
  
  -- Update member permissions (disable posting for non-admins)
  UPDATE public.room_members
  SET permissions = jsonb_set(
    permissions,
    '{can_send_messages}',
    'false'::jsonb
  )
  WHERE room_id = p_room_id
  AND role = 'member';
  
  GET DIAGNOSTICS v_affected_members = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'affected_members', v_affected_members
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- Message insert policy for channels (restrict posting to admins)
DROP POLICY IF EXISTS "Channel posting restricted to admins" ON public.messages;
CREATE POLICY "Channel posting restricted to admins"
  ON public.messages FOR INSERT
  WITH CHECK (
    check_channel_post_permission(room_id, auth.uid())
  );

-- Message views RLS policies
-- Anyone can record their own view
DROP POLICY IF EXISTS "Users can record their own views" ON public.message_views;
CREATE POLICY "Users can record their own views"
  ON public.message_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins can see view statistics
DROP POLICY IF EXISTS "Admins can view statistics" ON public.message_views;
CREATE POLICY "Admins can view statistics"
  ON public.message_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.room_members rm ON m.room_id = rm.room_id
      WHERE m.id = message_views.message_id
      AND rm.user_id = auth.uid()
      AND rm.role IN ('creator', 'admin')
    )
  );

-- Channel categories are viewable by everyone
DROP POLICY IF EXISTS "Channel categories are viewable by everyone" ON public.channel_categories;
CREATE POLICY "Channel categories are viewable by everyone"
  ON public.channel_categories FOR SELECT
  USING (true);

-- Only admins can manage channel categories
DROP POLICY IF EXISTS "Admins can manage channel categories" ON public.channel_categories;
CREATE POLICY "Admins can manage channel categories"
  ON public.channel_categories FOR ALL
  USING (auth.role() = 'service_role');

-- Update rooms policy to allow viewing public channels
DROP POLICY IF EXISTS "Rooms are viewable by participants" ON public.rooms;
CREATE POLICY "Rooms are viewable by participants" ON public.rooms 
  FOR SELECT USING (
    -- Direct messages: only participants can view
    (is_direct AND (auth.uid() = created_by OR auth.uid() = target_user_id))
    OR
    -- Public channels: everyone can view
    (type = 'channel' AND is_public = true)
    OR
    -- Private channels and groups: only members can view
    (type IN ('channel', 'community') AND EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = rooms.id AND user_id = auth.uid()
    ))
  );

-- Update rooms policy to allow updating channel settings by admins
DROP POLICY IF EXISTS "Admins can update room settings" ON public.rooms;
CREATE POLICY "Admins can update room settings" ON public.rooms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = rooms.id 
      AND user_id = auth.uid()
      AND role IN ('creator', 'admin')
    )
  );

-- ============================================================================
-- 6. REALTIME SUPPORT
-- ============================================================================

-- Enable realtime for message_views table
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_views;

-- Enable realtime for channel_categories table
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_categories;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Note: The subscriber count trigger (update_room_member_count) already exists
-- in supabase_schema.sql and works automatically for channels

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Broadcast Channels migration completed successfully!';
  RAISE NOTICE 'Tables created: message_views, channel_categories';
  RAISE NOTICE 'Functions created: check_channel_post_permission, record_message_view, get_message_view_stats, migrate_group_to_channel';
  RAISE NOTICE 'RLS policies updated for channels support';
  RAISE NOTICE 'Realtime enabled for new tables';
END $$;
