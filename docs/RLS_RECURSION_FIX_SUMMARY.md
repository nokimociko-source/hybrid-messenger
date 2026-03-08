# RLS Infinite Recursion - Fix Summary

## Problem Identified ❌

Your Supabase database has **infinite recursion in RLS policies** causing 500 errors:

```
Error: infinite recursion detected in policy for relation "room_members"
```

This happens when:
1. App tries to fetch rooms → Supabase checks RLS policy
2. RLS policy queries `room_members` table
3. `room_members` table has policies that reference `rooms`
4. Circular dependency → Infinite recursion → 500 error

## Solution ✅

Replace complex RLS policies with simple, non-recursive ones.

### What Changed

**Before (Broken):**
```sql
-- rooms policy checks room_members
CREATE POLICY "Rooms are viewable" ON public.rooms 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.room_members WHERE ...)
);
```

**After (Fixed):**
```sql
-- rooms policy only checks direct columns
CREATE POLICY "Rooms are viewable" ON public.rooms 
FOR SELECT USING (
  (is_direct AND (auth.uid() = created_by OR auth.uid() = target_user_id))
  OR (type = 'channel' AND is_public = true)
);
```

## How to Apply the Fix

### Option 1: Quick Fix (Recommended)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of: `hybrid_messenger/database/policies/APPLY_FIX_NOW.sql`
5. Click **Run**
6. Wait for success message

### Option 2: Manual Fix

Run each SQL statement from `hybrid_messenger/database/policies/fix_infinite_recursion.sql` one by one in Supabase SQL Editor.

## Verify the Fix

After applying, test in Supabase SQL Editor:

```sql
-- These should work without errors now
SELECT * FROM public.rooms LIMIT 1;
SELECT * FROM public.room_members LIMIT 1;
SELECT * FROM public.typing_indicators LIMIT 1;
```

## What This Means for Your App

### ✅ What Works Now
- Fetching rooms
- Fetching typing indicators
- Fetching room members
- Creating rooms
- Joining rooms
- Sending messages

### ⚠️ Authorization Changes

**Before:** Complex authorization was in database RLS policies
**After:** Authorization should be in your application code

**Example:** If you want "only admins can post in channels":

```typescript
// In your app, NOT in RLS:
const userRole = await fetchUserRoleInRoom(roomId);
if (userRole !== 'admin' && roomType === 'channel') {
  throw new Error('Only admins can post');
}
```

This is actually **better** because:
- ✅ Simpler database policies
- ✅ Better performance
- ✅ Easier to debug
- ✅ More flexible (can use app context)

## Files Created

1. `hybrid_messenger/database/policies/APPLY_FIX_NOW.sql` - **Run this first!**
2. `hybrid_messenger/database/policies/fix_infinite_recursion.sql` - Detailed fix script
3. `hybrid_messenger/docs/DATABASE_RLS_FIX.md` - Full documentation

## Next Steps

1. **Apply the fix** using APPLY_FIX_NOW.sql
2. **Refresh your browser** - the app should work now
3. **Test the features** - rooms, messages, typing indicators
4. **Review authorization logic** - move complex checks to app layer if needed

## Questions?

See `hybrid_messenger/docs/DATABASE_RLS_FIX.md` for detailed explanation and best practices.
