# Applying Broadcast Channels Migration

## Overview

This guide provides step-by-step instructions for applying the broadcast channels migration to your Supabase database. The migration adds support for one-way communication channels where only administrators can post messages while subscribers can read and view statistics.

## What's Being Added

### Database Changes

**Extended Tables:**
- `rooms` table - adds `is_public` and `category` columns, extends type enum to include 'channel'

**New Tables:**
- `message_views` - tracks which users have viewed channel messages
- `channel_categories` - optional categorization for channels

**New Functions:**
- `check_channel_post_permission()` - validates posting permissions in channels
- `record_message_view()` - records message views for statistics
- `get_message_view_stats()` - retrieves view statistics for admins
- `migrate_group_to_channel()` - converts existing groups to channels

**New Policies:**
- RLS policies for channel posting restrictions
- RLS policies for message view tracking
- Updated room visibility policies for public channels

**Indexes:**
- Performance indexes for channel queries
- Indexes for message view lookups

## Prerequisites

- Access to Supabase Dashboard or CLI
- Database credentials (if using CLI)
- Backup of current database (recommended)

## Step 1: Backup Your Database

**Recommended:** Create a backup before applying the migration.

### Via Supabase Dashboard:
1. Go to Database → Backups
2. Click "Create Backup"
3. Wait for completion

### Via CLI:
```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > backup_before_channels.sql
```

## Step 2: Apply the Migration

### Option A: Via Supabase Dashboard (Recommended)

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Click "New Query"
5. Open `hybrid_messenger/broadcast_channels_schema.sql`
6. Copy the entire contents
7. Paste into the SQL Editor
8. Click **Run** or press `Ctrl+Enter`

### Option B: Via Supabase CLI

```bash
cd hybrid_messenger
supabase db push --file broadcast_channels_schema.sql
```

### Option C: Via psql

```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < broadcast_channels_schema.sql
```

## Step 3: Verify Migration Success

Run these verification queries in SQL Editor:

### 1. Check Tables Created

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('message_views', 'channel_categories');
```

**Expected Result:** 2 rows returned

### 2. Check Rooms Table Columns

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rooms' 
AND column_name IN ('is_public', 'category');
```

**Expected Result:**
```
column_name | data_type
------------|----------
is_public   | boolean
category    | text
```

### 3. Check Type Constraint

```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'rooms_type_check';
```

**Expected Result:** Should include 'channel' in the check clause

### 4. Verify Functions Created

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'check_channel_post_permission',
  'record_message_view',
  'get_message_view_stats',
  'migrate_group_to_channel'
);
```

**Expected Result:** 4 rows returned

### 5. Check RLS Policies

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('messages', 'message_views', 'channel_categories', 'rooms')
ORDER BY tablename, policyname;
```

**Expected Result:** Multiple policies including:
- "Channel posting restricted to admins" on messages
- "Users can record their own views" on message_views
- "Admins can view statistics" on message_views
- Updated policies on rooms table

### 6. Check Indexes

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('rooms', 'message_views', 'channel_categories')
AND indexname LIKE '%channel%' OR indexname LIKE '%message_views%';
```

**Expected Result:** Multiple indexes including:
- idx_rooms_type_public
- idx_rooms_member_count
- idx_rooms_category
- idx_message_views_message
- idx_message_views_user
- idx_message_views_time

### 7. Test Functions

```sql
-- Test permission check (should return false for non-existent room)
SELECT check_channel_post_permission(
  '00000000-0000-0000-0000-000000000000'::uuid,
  auth.uid()
);
```

## Step 4: Test Channel Creation

Create a test channel to verify everything works:

```sql
-- Create a test channel
INSERT INTO public.rooms (name, type, topic, created_by, is_public, category)
VALUES (
  'Test Channel',
  'channel',
  'This is a test broadcast channel',
  auth.uid(),
  true,
  'Test'
)
RETURNING id, name, type, is_public;
```

**Expected Result:** New channel created with type='channel'

### Verify Channel Member Added

```sql
-- Check that creator was added as member
SELECT role, permissions
FROM public.room_members
WHERE room_id = (SELECT id FROM public.rooms WHERE name = 'Test Channel' LIMIT 1)
AND user_id = auth.uid();
```

**Expected Result:** One row with role='creator'

### Clean Up Test Channel

```sql
-- Delete test channel
DELETE FROM public.rooms WHERE name = 'Test Channel';
```

## Step 5: Test Permissions

### Test Admin Posting Permission

```sql
-- Should return true for channel creator
SELECT check_channel_post_permission(
  (SELECT id FROM public.rooms WHERE type = 'channel' LIMIT 1),
  auth.uid()
);
```

### Test View Recording

```sql
-- Record a test view (replace with actual message_id)
SELECT record_message_view(
  'your-message-id'::uuid,
  auth.uid()
);

-- Check view was recorded
SELECT COUNT(*) FROM public.message_views
WHERE user_id = auth.uid();
```

## Step 6: Performance Verification

Check that indexes are being used:

```sql
-- Explain query plan for channel discovery
EXPLAIN ANALYZE
SELECT * FROM public.rooms
WHERE type = 'channel' AND is_public = true
ORDER BY member_count DESC
LIMIT 50;
```

**Look for:** "Index Scan" or "Bitmap Index Scan" in the output

## Troubleshooting

### Error: "constraint already exists"

**Cause:** Migration was partially applied before

**Solution:** The migration uses `IF NOT EXISTS` and `DROP IF EXISTS`, so it's safe to run again. The error can be ignored if other parts succeed.

### Error: "column already exists"

**Cause:** Columns were added in a previous attempt

**Solution:** Safe to ignore. Verify columns exist with Step 3 queries.

### Error: "function already exists"

**Cause:** Functions were created in a previous attempt

**Solution:** The migration uses `CREATE OR REPLACE`, so it will update the function. Safe to continue.

### Error: "permission denied"

**Cause:** Insufficient database permissions

**Solution:** Ensure you're using the `postgres` user or `service_role` credentials.

### Error: "relation does not exist"

**Cause:** Required tables (rooms, messages, users) don't exist

**Solution:** Ensure base schema is applied first. Check `supabase_schema.sql` is applied.

### Schema Cache Not Updating

**Cause:** PostgREST cache hasn't refreshed

**Solution:** 
1. Wait 1-2 minutes for automatic refresh
2. Or restart API: Dashboard → Settings → API → "Restart API"
3. Or run: `NOTIFY pgrst, 'reload schema';`

### RLS Policies Blocking Access

**Cause:** User doesn't have proper permissions

**Solution:** Check user is authenticated and has room membership:
```sql
SELECT * FROM public.room_members
WHERE user_id = auth.uid();
```

## Step 7: Enable Realtime (Optional)

If realtime isn't working for new tables:

```sql
-- Verify realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

If `message_views` or `channel_categories` are missing:

```sql
-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_categories;
```

## Step 8: Set Up Cleanup Job (Optional)

For automatic cleanup of old view records:

### If pg_cron is available:

```sql
-- Clean up views older than 90 days, every day at 3 AM
SELECT cron.schedule(
  'cleanup-old-message-views',
  '0 3 * * *',
  $$
  DELETE FROM public.message_views 
  WHERE viewed_at < NOW() - INTERVAL '90 days'
  $$
);
```

### Manual cleanup:

```sql
-- Run periodically to clean old views
DELETE FROM public.message_views 
WHERE viewed_at < NOW() - INTERVAL '90 days';
```

## Step 9: Populate Channel Categories (Optional)

Add some default categories:

```sql
INSERT INTO public.channel_categories (name, icon, order_index)
VALUES 
  ('News', '📰', 1),
  ('Entertainment', '🎬', 2),
  ('Technology', '💻', 3),
  ('Education', '📚', 4),
  ('Gaming', '🎮', 5),
  ('Music', '🎵', 6),
  ('Sports', '⚽', 7),
  ('Business', '💼', 8),
  ('Science', '🔬', 9),
  ('Other', '📌', 10)
ON CONFLICT (name) DO NOTHING;
```

## Step 10: Test Migration Function

Test converting a group to a channel:

```sql
-- Create a test group first
INSERT INTO public.rooms (name, type, created_by)
VALUES ('Test Group', 'community', auth.uid())
RETURNING id;

-- Add some test members
INSERT INTO public.room_members (room_id, user_id, role)
VALUES 
  ((SELECT id FROM public.rooms WHERE name = 'Test Group'), auth.uid(), 'creator');

-- Migrate to channel
SELECT migrate_group_to_channel(
  (SELECT id FROM public.rooms WHERE name = 'Test Group'),
  auth.uid()
);

-- Verify migration
SELECT type, is_public FROM public.rooms WHERE name = 'Test Group';

-- Clean up
DELETE FROM public.rooms WHERE name = 'Test Group';
```

## Rollback Instructions

If you need to rollback the migration:

```sql
-- WARNING: This will delete all channel data!

-- Drop new policies
DROP POLICY IF EXISTS "Channel posting restricted to admins" ON public.messages;
DROP POLICY IF EXISTS "Users can record their own views" ON public.message_views;
DROP POLICY IF EXISTS "Admins can view statistics" ON public.message_views;
DROP POLICY IF EXISTS "Channel categories are viewable by everyone" ON public.channel_categories;
DROP POLICY IF EXISTS "Admins can manage channel categories" ON public.channel_categories;

-- Drop functions
DROP FUNCTION IF EXISTS check_channel_post_permission(UUID, UUID);
DROP FUNCTION IF EXISTS record_message_view(UUID, UUID);
DROP FUNCTION IF EXISTS get_message_view_stats(UUID, UUID);
DROP FUNCTION IF EXISTS migrate_group_to_channel(UUID, UUID);

-- Drop tables
DROP TABLE IF EXISTS public.message_views CASCADE;
DROP TABLE IF EXISTS public.channel_categories CASCADE;

-- Remove columns from rooms
ALTER TABLE public.rooms 
  DROP COLUMN IF EXISTS is_public,
  DROP COLUMN IF EXISTS category;

-- Restore original type constraint
ALTER TABLE public.rooms 
  DROP CONSTRAINT IF EXISTS rooms_type_check;

ALTER TABLE public.rooms 
  ADD CONSTRAINT rooms_type_check 
  CHECK (type IN ('direct', 'community'));

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
```

## Post-Migration Checklist

- [ ] All tables created successfully
- [ ] All columns added to rooms table
- [ ] All functions created and tested
- [ ] All RLS policies active
- [ ] Indexes created for performance
- [ ] Realtime enabled for new tables
- [ ] Test channel created and deleted successfully
- [ ] Permission checks working correctly
- [ ] View recording working correctly
- [ ] Migration function tested
- [ ] Schema cache refreshed
- [ ] Client application restarted

## Next Steps

After successful migration:

1. **Update Client Code**: Implement the TypeScript types and hooks (Tasks 2.1-2.6)
2. **Build UI Components**: Create channel-specific components (Tasks 3.1-3.10)
3. **Test Thoroughly**: Run integration tests (Tasks 4.1-4.12)
4. **Monitor Performance**: Watch database query performance
5. **Set Up Monitoring**: Create admin dashboard for channel statistics

## Performance Recommendations

### For Production:

1. **Monitor Index Usage:**
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename IN ('rooms', 'message_views')
ORDER BY idx_scan;
```

2. **Monitor Table Size:**
```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('rooms', 'message_views', 'channel_categories')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

3. **Set Up Alerts:**
- Alert when message_views table grows beyond expected size
- Alert on slow queries involving channel operations
- Monitor RLS policy performance

## Support

If you encounter issues:

1. Check the Troubleshooting section above
2. Verify all prerequisites are met
3. Review Supabase logs: Dashboard → Logs → Database
4. Check PostgREST logs for API errors
5. Verify user authentication and permissions

## Migration Status

✅ Migration script created: `broadcast_channels_schema.sql`  
⏳ Migration applied to database  
⏳ Verification tests completed  
⏳ Client integration pending  
⏳ UI components pending  
⏳ End-to-end testing pending  

---

**Created:** December 2024  
**Version:** 1.0  
**Spec:** broadcast-channels  
**Migration File:** `hybrid_messenger/broadcast_channels_schema.sql`
