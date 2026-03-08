# ChannelMessageInput Component

## Overview

The `ChannelMessageInput` component is a wrapper component that controls message input visibility based on channel permissions. It shows a disabled state with an informative message for non-admin users in broadcast channels, while displaying the normal message input for users with posting permissions.

## Features

- **Permission-based rendering**: Automatically checks user permissions using the `useChannelPermissions` hook
- **Disabled state for non-admins**: Shows a clear message when users cannot post in channels
- **Seamless integration**: Wraps existing message input UI without requiring changes to the input component
- **Loading state handling**: Prevents flickering by showing normal input while permissions are loading
- **Accessibility**: Includes proper ARIA attributes for screen readers

## Usage

```tsx
import { ChannelMessageInput } from '../components/ChannelMessageInput';

function RoomView({ roomId }) {
  return (
    <div>
      {/* Messages list */}
      
      {/* Wrap your existing input UI with ChannelMessageInput */}
      <ChannelMessageInput roomId={roomId}>
        <div className={css.FloatingInputPill}>
          {/* Your existing message input UI */}
          <input type="text" placeholder="Write a message..." />
          <button>Send</button>
        </div>
      </ChannelMessageInput>
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `roomId` | `string` | Yes | The ID of the room/channel to check permissions for |
| `children` | `React.ReactNode` | Yes | The normal message input UI to display when user can post |

## Behavior

### For Channels (Broadcast Channels)

- **Admins (creators and admins)**: Shows the normal message input (children)
- **Subscribers (regular members)**: Shows disabled state with message "Only admins can post in this channel"

### For Regular Rooms (Community/Direct)

- **All members with posting permission**: Shows the normal message input (children)
- **Members without posting permission**: Shows disabled state

### Loading State

While permissions are being checked, the component shows the normal input to avoid UI flickering.

## Accessibility

The component includes proper accessibility features:

- **ARIA role**: The disabled state container has `role="status"`
- **ARIA live region**: Uses `aria-live="polite"` to announce changes to screen readers
- **Icon decoration**: The lock icon has `aria-hidden="true"` as it's decorative
- **Clear messaging**: The disabled message clearly explains why posting is restricted

## Styling

The component uses vanilla-extract CSS modules for styling:

- `DisabledInputContainer`: Main container for the disabled state
- `DisabledInputContent`: Inner content with icon and message
- `LockIcon`: Styling for the lock icon
- `DisabledMessage`: Styling for the disabled message text

The disabled state matches the application's design system with:
- Semi-transparent background
- Subtle border
- Hover effects
- Rounded corners matching the input pill design

## Integration with useChannelPermissions

The component relies on the `useChannelPermissions` hook to determine user permissions:

```typescript
const { permissions, loading } = useChannelPermissions(roomId);

// permissions.canPost determines if the user can post messages
```

## Example Scenarios

### Scenario 1: Channel Admin

```tsx
// User is an admin in a channel
// permissions.canPost = true
// Result: Normal message input is shown
```

### Scenario 2: Channel Subscriber

```tsx
// User is a regular subscriber in a channel
// permissions.canPost = false
// Result: Disabled state with "Only admins can post in this channel" message
```

### Scenario 3: Regular Room Member

```tsx
// User is a member in a regular community room
// permissions.canPost = true (based on room_members.permissions)
// Result: Normal message input is shown
```

## Testing

The component includes comprehensive unit tests covering:

- Component logic for showing/hiding disabled state
- Permission scenarios (admin, subscriber, regular member)
- Loading state behavior
- Accessibility attributes
- Message content

Run tests with:
```bash
npm run test ChannelMessageInput.test.tsx
```

## Related Components

- `useChannelPermissions` - Hook for checking user permissions
- `CatloverRoomView` - Main room view that uses this component
- `MessageInput` - The actual message input component (wrapped by this component)

## Design Decisions

1. **Wrapper Pattern**: Uses a wrapper pattern to avoid modifying existing input components
2. **Children Prop**: Accepts children to maintain flexibility in input UI design
3. **Loading State**: Shows normal input while loading to prevent UI flickering
4. **Clear Messaging**: Uses simple, clear language to explain restrictions
5. **Consistent Styling**: Matches the existing input pill design for visual consistency
