-- ==========================================
-- ADMIN SECURITY OVERHAUL: ROLES AND RLS
-- ==========================================

-- 1. Add is_admin column to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Create helper function to check if current user is admin
-- Using SECURITY DEFINER to bypass RLS when checking admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update RLS policies for public.users
-- Only admins can update other users (banning, etc.)
DROP POLICY IF EXISTS "Admins can update any user profile." ON public.users;
CREATE POLICY "Admins can update any user profile." ON public.users
  FOR UPDATE USING (public.is_admin());

-- 4. Set up RLS for public.rooms deletion
-- Only creators or admins can delete rooms
DROP POLICY IF EXISTS "Admins and creators can delete rooms." ON public.rooms;
CREATE POLICY "Admins and creators can delete rooms." ON public.rooms
  FOR DELETE USING (auth.uid() = created_by OR public.is_admin());

-- 5. Set up RLS for public.messages (Admin search and delete)
-- Allow admins to delete any message
DROP POLICY IF EXISTS "Admins can delete any message." ON public.messages;
CREATE POLICY "Admins can delete any message." ON public.messages
  FOR DELETE USING (public.is_admin());

-- Allow admins to select messages for global search
DROP POLICY IF EXISTS "Admins can select all messages." ON public.messages;
CREATE POLICY "Admins can select all messages." ON public.messages
  FOR SELECT USING (public.is_admin());

-- 6. Ensure reports table is only accessible by admins
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view and update reports." ON public.reports;
CREATE POLICY "Admins can view and update reports." ON public.reports
  FOR ALL USING (public.is_admin());

-- Allow authenticated users to insert reports but not see others' reports
DROP POLICY IF EXISTS "Authenticated users can create reports." ON public.reports;
CREATE POLICY "Authenticated users can create reports." ON public.reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 7. Audit log security
ALTER TABLE public.room_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all audit logs." ON public.room_audit_log;
CREATE POLICY "Admins can view all audit logs." ON public.room_audit_log
  FOR SELECT USING (public.is_admin());

-- 8. INSTRUCTIONS TO SET FIRST ADMIN (RUN MANUALLY IN SUPABASE CONSOLE):
-- UPDATE public.users SET is_admin = true WHERE id = 'YOUR_USER_ID_HERE';
-- OR by username:
-- UPDATE public.users SET is_admin = true WHERE username = 'YOUR_USERNAME';
