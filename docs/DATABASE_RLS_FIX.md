# Database RLS Infinite Recursion Fix

## Problem

The application was experiencing **infinite recursion in RLS policies** for the `room_members` table, causing 500 errors when fetching rooms and typing indicators.

### Error Message
```
infinite recursion detected in policy for relation "room_members"
```

### Root Cause

Circular dependencies in RLS (Row Level Security) policies:

1. **rooms** table SELECT policy checked if user is in `room_members`
2. **room_members** table had policies that referenced `rooms` table
3. When Supabase RLS engine evaluated these policies, it entered infinite recursion

### Problematic Pattern

```sql
-- rooms policy (checks room_members)
CREATE POLICY "Rooms are viewable" ON public.rooms 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = rooms.id AND user_id = auth.uid()
  )
);

-- room_members policy (could reference rooms)
CREATE POLICY "View members" ON public.room_members 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = room_id AND ...
  )
);
-- ❌ CIRCULAR DEPENDENCY - Infinite recursion!
```

## Solution

Simplified RLS policies that avoid cross-table subqueries:

### Key Changes

1. **rooms SELECT policy** - Only check direct message participants and public channels
   - No subquery to `room_members`
   - Public channels are viewable by everyone
   - Direct messages only by participants

2. **rooms UPDATE/DELETE policies** - Only creator can modify
   - Direct column comparison: `auth.uid() = created_by`
   - No subqueries

3. **room_members policies** - Simple, no cross-table checks
   - SELECT: Allow viewing all members (no subquery)
   - INSERT/UPDATE/DELETE: Only own membership

4. **typing_indicators policies** - Simple, no complex joins
   - SELECT: Allow viewing all (no subquery)
   - INSERT/DELETE: Only own indicators

5. **message_views policies** - Simple, no complex joins
   - SELECT: Only own views
   - INSERT: Only own views

### Authorization Logic

**Important:** Complex authorization (e.g., "only room admins can post") should be implemented in the **application layer**, not in RLS policies.

**Why?**
- Simpler policies = no recursion issues
- Better performance
- Easier to debug and maintain
- Can use application context (user roles, permissions)

## Implementation

### Step 1: Apply the Fix

Run the SQL script to fix the policies:

```bash
# In Supabase SQL Editor, run:
-- Copy contents of: hybrid_messenger/database/policies/fix_infinite_recursion.sql
```

### Step 2: Verify

Test that queries work:

```sql
-- Should work without errors
SELECT * FROM public.rooms;
SELECT * FROM public.room_members;
SELECT * FROM public.typing_indicators;
```

### Step 3: Update Application

The application should now work without errors. If you need more complex authorization:

1. **Fetch user's room memberships** in the app
2. **Check user's role** in the app
3. **Enforce permissions** in the app before allowing actions

Example:
```typescript
// Instead of relying on RLS to prevent posting
// Check in the app:
const userRole = await fetchUserRoleInRoom(roomId);
if (userRole !== 'admin' && roomType === 'channel') {
  throw new Error('Only admins can post in channels');
}
```

## Files Modified

- `hybrid_messenger/database/policies/fix_infinite_recursion.sql` - New fix script
- `hybrid_messenger/database/schemas/broadcast_channels_schema.sql` - Original (needs manual update)
- `hybrid_messenger/COMPLETE_SUPABASE_SETUP.sql` - Original (needs manual update)

## Testing Checklist

After applying the fix:

- [ ] Can fetch rooms without 500 error
- [ ] Can fetch typing indicators without 500 error
- [ ] Can fetch room members without 500 error
- [ ] Can create new rooms
- [ ] Can join rooms
- [ ] Can send messages
- [ ] Can update room settings (as creator)

## Performance Impact

✅ **Positive:**
- Simpler policies = faster evaluation
- No recursive policy checks
- Better database performance

## Security Considerations

⚠️ **Important:**
- Public channels are viewable by everyone (by design)
- Private channel access must be checked in the application
- Admin-only actions must be enforced in the application
- This is a common pattern in modern applications (authorization at app layer, not DB layer)

## References

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Avoiding Infinite Recursion in RLS](https://supabase.com/docs/guides/auth/row-level-security#avoiding-infinite-recursion)
