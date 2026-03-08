# ChannelMigrationDialog Component

## Overview

The `ChannelMigrationDialog` component provides a user interface for converting a group chat into a broadcast channel. This is a critical operation that permanently changes how the room functions, restricting posting permissions to admins only.

## Features

- ✅ Warning about irreversible action
- ✅ Clear list of migration consequences
- ✅ Member count display
- ✅ RPC function integration (`migrate_group_to_channel`)
- ✅ Success and error state handling
- ✅ Confirmation required
- ✅ Creator-only access (enforced server-side)

## Props

```typescript
interface ChannelMigrationDialogProps {
  roomId: string;        // ID of the room to migrate
  roomName: string;      // Display name of the room
  memberCount: number;   // Number of members in the room
  onClose: () => void;   // Callback when dialog is closed
  onSuccess: () => void; // Callback when migration succeeds
}
```

## Usage

### Basic Usage

```tsx
import { ChannelMigrationDialog } from './components/ChannelMigrationDialog';

function GroupSettings({ room }) {
  const [showDialog, setShowDialog] = useState(false);

  const handleSuccess = () => {
    // Refresh room data
    // Show success notification
    setShowDialog(false);
  };

  return (
    <>
      <button onClick={() => setShowDialog(true)}>
        Convert to Channel
      </button>

      {showDialog && (
        <ChannelMigrationDialog
          roomId={room.id}
          roomName={room.name}
          memberCount={room.member_count || 0}
          onClose={() => setShowDialog(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
```

### Integration with Group Settings

```tsx
import { ChannelMigrationDialog } from './components/ChannelMigrationDialog';
import { useChannelPermissions } from './hooks/useChannelPermissions';

function GroupSettingsModal({ room }) {
  const [showMigration, setShowMigration] = useState(false);
  const { permissions } = useChannelPermissions(room.id);

  // Only show migration option to creators of community rooms
  const canMigrate = permissions.canManageAdmins && room.type === 'community';

  const handleMigrationSuccess = () => {
    // Refresh room data to reflect new channel type
    refreshRoom();
    // Show success notification
    showNotification('Group successfully converted to channel');
    setShowMigration(false);
  };

  return (
    <div>
      {/* Other settings */}
      
      {canMigrate && (
        <div className="advanced-settings">
          <h3>Advanced Options</h3>
          <button onClick={() => setShowMigration(true)}>
            Convert to Broadcast Channel
          </button>
        </div>
      )}

      {showMigration && (
        <ChannelMigrationDialog
          roomId={room.id}
          roomName={room.name}
          memberCount={room.member_count || 0}
          onClose={() => setShowMigration(false)}
          onSuccess={handleMigrationSuccess}
        />
      )}
    </div>
  );
}
```

## Migration Process

### What Happens During Migration

1. **Room Type Change**: The room's `type` field changes from `'community'` to `'channel'`
2. **Permission Update**: All regular members have `can_send_messages` set to `false`
3. **Admin Preservation**: Creators and admins retain all their permissions
4. **History Preservation**: All existing messages remain accessible
5. **Member Retention**: All members remain in the room as subscribers

### Server-Side Function

The component calls the `migrate_group_to_channel` RPC function:

```sql
CREATE OR REPLACE FUNCTION migrate_group_to_channel(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS JSONB
```

**Returns:**
```json
{
  "success": true,
  "affected_members": 41
}
```

**Or on error:**
```json
{
  "success": false,
  "error": "Only creator can migrate to channel"
}
```

## Error Handling

The component handles several error scenarios:

### User Not Authenticated
```
Error: "User not authenticated"
```
Occurs when the user's session has expired.

### Permission Denied
```
Error: "Only creator can migrate to channel"
```
Occurs when a non-creator attempts migration.

### Database Errors
```
Error: [Database error message]
```
Network issues, RLS policy violations, or other database errors.

### Generic Errors
```
Error: "Migration failed"
```
Fallback error when the RPC returns success: false without a specific error message.

## UI States

### Default State
- Warning banner with alert icon
- List of migration consequences
- Cancel and Convert buttons enabled

### Loading State
- Spinner shown in Convert button
- Both buttons disabled
- User cannot close dialog

### Error State
- Error message displayed in red banner
- Buttons re-enabled
- User can retry or cancel

### Success State
- `onSuccess` callback fired
- Dialog automatically closes
- Parent component should refresh data

## Accessibility

- **Keyboard Navigation**: Dialog can be closed with Escape key (via backdrop click)
- **Focus Management**: Dialog traps focus within itself
- **Screen Readers**: Warning icon and error messages are properly announced
- **Color Contrast**: All text meets WCAG AA standards
- **Button States**: Disabled states are clearly indicated

## Styling

The component uses inline styles matching the application's design system:

- **Background**: Dark gradient with cyan border
- **Warning**: Yellow/amber color scheme
- **Error**: Red color scheme
- **Primary Action**: Red (danger) button to emphasize irreversibility
- **Secondary Action**: Neutral gray button

## Security Considerations

1. **Server-Side Validation**: The RPC function verifies the user is the creator
2. **RLS Policies**: Database policies prevent unauthorized access
3. **Client-Side Check**: UI should only show option to creators (UX improvement)
4. **Audit Trail**: Migration should be logged in audit_log table (if implemented)

## Testing

### Unit Tests

See `ChannelMigrationDialog.test.tsx` for comprehensive test coverage:

- ✅ Renders correctly
- ✅ Displays warning and migration info
- ✅ Handles user interactions
- ✅ Calls RPC function with correct parameters
- ✅ Handles success and error states
- ✅ Disables buttons during loading
- ✅ Handles authentication errors

### Manual Testing Checklist

- [ ] Dialog opens when triggered
- [ ] Warning is clearly visible
- [ ] Room name and member count are correct
- [ ] Cancel button closes dialog
- [ ] Backdrop click closes dialog
- [ ] Convert button triggers migration
- [ ] Success callback fires on success
- [ ] Error message displays on failure
- [ ] Buttons disabled during loading
- [ ] Dialog closes on success

## Dependencies

- `react`: Core React library
- `folds`: UI component library (Icon, Icons, Spinner)
- `supabase`: Database client for RPC calls

## Related Components

- `GroupSettingsModal`: Where migration option should be displayed
- `ChannelHeader`: Shows channel-specific UI after migration
- `ChannelMessageInput`: Enforces posting restrictions after migration

## Related Hooks

- `useChannelPermissions`: Check if user can manage the room
- `useSupabaseChat`: Room data and updates

## Database Requirements

### Required RPC Function
```sql
migrate_group_to_channel(p_room_id UUID, p_user_id UUID)
```

### Required Tables
- `rooms`: Must have `type` field with 'channel' option
- `room_members`: Must have `permissions` JSONB field

### Required Policies
- RLS policies allowing creators to update room type
- RLS policies allowing creators to update member permissions

## Future Enhancements

1. **Confirmation Input**: Require typing room name to confirm
2. **Notification**: Send notification to all members about migration
3. **Audit Log**: Record migration in audit_log table
4. **Undo Period**: Allow reverting within 24 hours
5. **Preview Mode**: Show what the channel will look like before migrating
6. **Batch Migration**: Migrate multiple groups at once

## Troubleshooting

### Dialog doesn't open
- Check that component is rendered conditionally
- Verify props are passed correctly

### Migration fails silently
- Check browser console for errors
- Verify RPC function is deployed
- Check user authentication status

### Error: "Only creator can migrate"
- Verify user is the room creator
- Check room_members table for user role

### Error: "User not authenticated"
- User session expired
- Redirect to login page

## Version History

- **v1.0.0** (2024-01-15): Initial implementation
  - Basic migration functionality
  - Error handling
  - Loading states
  - Accessibility features
