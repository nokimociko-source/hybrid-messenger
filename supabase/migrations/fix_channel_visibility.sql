-- ============================================================================
-- FIX CHANNEL VISIBILITY (RLS Policies for Messages)
-- ============================================================================

-- 1. Enable RLS on messages if not already enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view public channel messages" ON public.messages;
DROP POLICY IF EXISTS "Members can view room messages" ON public.messages;
DROP POLICY IF EXISTS "Authors can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Service role has full access" ON public.messages;

-- 3. Create comprehensive SELECT policies

-- Policy: Everyone can view messages in public channels
CREATE POLICY "Anyone can view public channel messages" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rooms 
            WHERE rooms.id = messages.room_id 
            AND rooms.type = 'channel' 
            AND rooms.is_public = true
        )
    );

-- Policy: Room members can view messages in their rooms
CREATE POLICY "Members can view room messages" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.room_members 
            WHERE room_members.room_id = messages.room_id 
            AND room_members.user_id = auth.uid()
        )
    );

-- Policy: Authors can always see their own messages (redundant but safe)
CREATE POLICY "Authors can view own messages" ON public.messages
    FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
