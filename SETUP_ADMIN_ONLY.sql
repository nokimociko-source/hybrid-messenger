-- ============================================
-- SETUP ADMIN PANEL - MINIMAL VERSION
-- ============================================
-- Use this if you already have the reports table
-- and just need to set up admin access

-- ============================================
-- STEP 1: Create admin_users table
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admins can view admin list
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_users;
CREATE POLICY "Admins can view admin list"
  ON public.admin_users FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

-- ============================================
-- STEP 2: Add admin reports viewing policy
-- ============================================
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

-- Add admin reports update policy
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

-- ============================================
-- STEP 3: Add yourself as admin
-- ============================================
-- IMPORTANT: Replace 'YOUR_USER_ID' with your actual UUID from auth.users
-- To find your UUID:
-- 1. Go to Supabase Dashboard
-- 2. Click Authentication → Users
-- 3. Find your user and copy the ID column
-- 4. Replace 'YOUR_USER_ID' below with that ID

INSERT INTO public.admin_users (id) 
VALUES ('YOUR_USER_ID')
ON CONFLICT (id) DO NOTHING;

-- Verify you were added as admin:
SELECT * FROM public.admin_users;

-- ============================================
-- STEP 4: Reload schema
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- DONE!
-- ============================================
-- You can now:
-- 1. Open the app and go to Settings → Admin Panel
-- 2. Enter the admin key: 2024
-- 3. You should see users, rooms, and reports tabs
-- 4. Try sending a report through the ReportModal component
-- 5. Check that it appears in the admin panel
