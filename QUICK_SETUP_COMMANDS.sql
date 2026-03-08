-- ============================================
-- QUICK SETUP FOR ADMIN PANEL
-- ============================================
-- Copy and paste these commands into Supabase SQL Editor
-- Execute them in order

-- ============================================
-- STEP 1: Create reports table
-- ============================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reported_message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  reported_room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  admin_notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- Users can create reports
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Add to realtime (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.reports;

-- ============================================
-- STEP 2: Create admin_users table
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
-- STEP 3: Add admin reports viewing policy
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
-- STEP 4: Add yourself as admin
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
-- STEP 5: Reload schema
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
