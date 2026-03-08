-- ============================================
-- RLS Policy Verification Script
-- ============================================
-- This script verifies that all RLS policies are correctly implemented
-- for the Chat Organization Essentials feature.
--
-- Run this in the Supabase SQL Editor to verify the setup.
-- ============================================

-- Test 1: Verify RLS is enabled on all tables
-- Expected: All tables should have rowsecurity = true
SELECT 
  tablename, 
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'chat_folders', 
  'chat_folder_items', 
  'pinned_chats', 
  'archived_chats', 
  'mute_settings', 
  'mentions', 
  'message_drafts'
)
ORDER BY tablename;

-- Test 2: Count policies per table
-- Expected policy counts:
-- chat_folders: 4 (SELECT, INSERT, UPDATE, DELETE)
-- chat_folder_items: 3 (SELECT, INSERT, DELETE)
-- pinned_chats: 4 (SELECT, INSERT, UPDATE, DELETE)
-- archived_chats: 3 (SELECT, INSERT, DELETE)
-- mute_settings: 4 (SELECT, INSERT, UPDATE, DELETE)
-- mentions: 3 (SELECT, INSERT, UPDATE)
-- message_drafts: 4 (SELECT, INSERT, UPDATE, DELETE)
SELECT 
  tablename, 
  COUNT(*) as policy_count,
  CASE 
    WHEN tablename IN ('chat_folders', 'pinned_chats', 'mute_settings', 'message_drafts') AND COUNT(*) = 4 THEN '✅ CORRECT'
    WHEN tablename IN ('chat_folder_items', 'archived_chats', 'mentions') AND COUNT(*) = 3 THEN '✅ CORRECT'
    ELSE '❌ INCORRECT'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'chat_folders', 
  'chat_folder_items', 
  'pinned_chats', 
  'archived_chats', 
  'mute_settings', 
  'mentions', 
  'message_drafts'
)
GROUP BY tablename
ORDER BY tablename;

-- Test 3: List all policies with their operations
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING clause present'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK clause present'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
  'chat_folders', 
  'chat_folder_items', 
  'pinned_chats', 
  'archived_chats', 
  'mute_settings', 
  'mentions', 
  'message_drafts'
)
ORDER BY tablename, cmd;

-- Test 4: Verify specific policies exist
-- This checks for the exact policy names we expect
SELECT 
  tablename,
  policyname,
  '✅ EXISTS' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
  (tablename = 'chat_folders' AND policyname IN (
    'Users can view their own folders',
    'Users can create their own folders',
    'Users can update their own folders',
    'Users can delete their own folders'
  ))
  OR (tablename = 'chat_folder_items' AND policyname IN (
    'Users can view their own folder items',
    'Users can create their own folder items',
    'Users can delete their own folder items'
  ))
  OR (tablename = 'pinned_chats' AND policyname IN (
    'Users can view their own pinned chats',
    'Users can create their own pinned chats',
    'Users can update their own pinned chats',
    'Users can delete their own pinned chats'
  ))
  OR (tablename = 'archived_chats' AND policyname IN (
    'Users can view their own archived chats',
    'Users can create their own archived chats',
    'Users can delete their own archived chats'
  ))
  OR (tablename = 'mute_settings' AND policyname IN (
    'Users can view their own mute settings',
    'Users can create their own mute settings',
    'Users can update their own mute settings',
    'Users can delete their own mute settings'
  ))
  OR (tablename = 'mentions' AND policyname IN (
    'Users can view mentions for themselves',
    'Users can create mentions',
    'Users can update their own mentions'
  ))
  OR (tablename = 'message_drafts' AND policyname IN (
    'Users can view their own drafts',
    'Users can create their own drafts',
    'Users can update their own drafts',
    'Users can delete their own drafts'
  ))
)
ORDER BY tablename, policyname;

-- Test 5: Verify trigger functions exist
SELECT 
  routine_name,
  routine_type,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ SECURITY DEFINER'
    ELSE '❌ NOT SECURITY DEFINER'
  END as security_status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'auto_unarchive_on_message',
  'extract_mentions',
  'unpin_archived_chat'
)
ORDER BY routine_name;

-- Test 6: Verify triggers are attached to correct tables
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  '✅ EXISTS' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND trigger_name IN (
  'trigger_auto_unarchive',
  'trigger_extract_mentions',
  'trigger_unpin_archived'
)
ORDER BY event_object_table, trigger_name;

-- Test 7: Summary Report
SELECT 
  'RLS Verification Summary' as report_section,
  (SELECT COUNT(*) FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('chat_folders', 'chat_folder_items', 'pinned_chats', 'archived_chats', 'mute_settings', 'mentions', 'message_drafts')
   AND rowsecurity = true) as tables_with_rls,
  (SELECT COUNT(*) FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('chat_folders', 'chat_folder_items', 'pinned_chats', 'archived_chats', 'mute_settings', 'mentions', 'message_drafts')) as total_policies,
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN ('auto_unarchive_on_message', 'extract_mentions', 'unpin_archived_chat')
   AND security_type = 'DEFINER') as security_definer_functions,
  (SELECT COUNT(*) FROM information_schema.triggers
   WHERE event_object_schema = 'public'
   AND trigger_name IN ('trigger_auto_unarchive', 'trigger_extract_mentions', 'trigger_unpin_archived')) as triggers_attached;

-- Expected Results:
-- tables_with_rls: 7
-- total_policies: 25
-- security_definer_functions: 3
-- triggers_attached: 3

-- ============================================
-- If all tests pass, the RLS implementation is correct!
-- ============================================
