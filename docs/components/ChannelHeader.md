# ChannelHeader Component

## Overview

The `ChannelHeader` component displays the header section for broadcast channels in the hybrid messenger application. It shows the channel's avatar, name, subscriber count, and provides access to channel settings for administrators.

## Features

- **Channel Avatar**: Displays the channel's avatar image or initials fallback
- **Channel Name**: Shows the channel name with proper text truncation
- **Subscriber Badge**: Displays formatted subscriber count (K/M notation)
- **Settings Button**: Visible only to admins with modify settings permission
- **Responsive Design**: Adapts to mobile, tablet, and desktop screens
- **Accessibility**: Full keyboard navigation and screen reader support
- **Dark Mode**: Automatic dark mode support

## Props

```typescript
interface ChannelHeaderProps {
  channel: Room;              // The channel room object
  permissions: ChannelPermissions;  // User's permissions in the channel
  onSettingsClick: () => void;      // Callback when settings button is clicked
}
```

### Room Type

```typescript
type Room = {
  id: string;
  name: string;
  type: 'direct' | 'community' | 'channel';
  created_at: string;
  member_count?: number;
  avatar_url?: string;
  is_public?: boolean;
  category?: string;
  // ... other fields
};
```

### ChannelPermissions Type

```typescript
type ChannelPermissions = {
  canPost: boolean;
  canManageAdmins: boolean;
  canViewStats: boolean;
  canModifySettings: boolean;
};
```

## Usage

### Basic Usage

```tsx
import { ChannelHeader } from './components/ChannelHeader';
import { useSupabaseRoom } from './hooks/useSupabaseChat';
import { useChannelPermissions } from './hooks/useChannelPermissions';

function ChannelView({ channelId }: { channelId: string }) {
  const { room } = useSupabaseRoom(channelId);
  const { permissions } = useChannelPermissions(channelId);
  const [showSettings, setShowSettings] = useState(false);

  if (!room) return <Spinner />;

  return (
    <div className="channel-view">
      <ChannelHeader
        channel={room}
        permissions={permissions}
        onSettingsClick={() => setShowSettings(true)}
      />
      {/* Channel content */}
    </div>
  );
}
```

### Subscriber View (No Settings Button)

```tsx
const subscriberPermissions = {
  canPost: false,
  canManageAdmins: false,
  canViewStats: false,
  canModifySettings: false,
};

<ChannelHeader
  channel={channel}
  permissions={subscriberPermissions}
  onSettingsClick={() => {}}
/>
```

### Admin View (With Settings Button)

```tsx
const adminPermissions = {
  canPost: true,
  canManageAdmins: false,
  canViewStats: true,
  canModifySettings: true,
};

<ChannelHeader
  channel={channel}
  permissions={adminPermissions}
  onSettingsClick={() => openSettingsModal()}
/>
```

## Styling

The component uses CSS custom properties for theming:

```css
/* Background and borders */
--bg-surface: Background color
--bg-surface-border: Border color

/* Text colors */
--tc-surface-high: Primary text color
--tc-surface-normal: Secondary text color

/* Focus ring */
--focus-ring: Focus indicator color
```

### Custom Styling

You can override styles by targeting the component classes:

```css
.channel-header {
  /* Custom header styles */
}

.channel-header__name {
  /* Custom name styles */
}

.channel-header__avatar {
  /* Custom avatar styles */
}
```

## Accessibility

The component follows WCAG 2.1 AA guidelines:

- **Semantic HTML**: Uses `<header>` with `role="banner"`
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Keyboard Navigation**: Full keyboard support for settings button
- **Focus Indicators**: Visible focus rings for keyboard users
- **Screen Reader Support**: Announces channel name and subscriber count
- **Color Contrast**: Meets WCAG AA contrast requirements

### Keyboard Navigation

- `Tab`: Navigate to settings button (if visible)
- `Enter` or `Space`: Activate settings button
- `Shift + Tab`: Navigate backwards

## Responsive Behavior

### Desktop (> 1024px)
- Full padding and spacing
- Large avatar size
- Full text display

### Tablet (769px - 1024px)
- Medium padding
- Standard avatar size
- Text truncation if needed

### Mobile (≤ 768px)
- Compact padding
- Smaller avatar size
- Aggressive text truncation
- Smaller font sizes

## Avatar Fallback

When no `avatar_url` is provided, the component displays initials:

- **Multi-word names**: First letter of first two words (e.g., "Tech News" → "TN")
- **Single-word names**: First two letters (e.g., "Technology" → "TE")
- **Uppercase**: Initials are always uppercase

## Subscriber Count Formatting

The component automatically formats subscriber counts:

- `0-999`: Display as-is (e.g., "42 subscribers")
- `1,000-999,999`: Display with K notation (e.g., "1.2K subscribers")
- `1,000,000+`: Display with M notation (e.g., "1.5M subscribers")

## Dependencies

- **folds**: UI component library (Avatar, Box, Icon, IconButton, Text)
- **Room type**: From `useSupabaseChat` hook
- **ChannelPermissions type**: From `types/channels`
- **ChannelBadge**: Subscriber count badge component

## Related Components

- **ChannelBadge**: Displays subscriber count badge
- **ChannelMessageInput**: Message input for channels
- **ChannelViewStatistics**: View statistics for channel messages
- **ChannelDiscovery**: Channel discovery interface

## Testing

The component includes comprehensive unit tests covering:

- Rendering channel name and avatar
- Avatar fallback with initials
- Subscriber count display
- Settings button visibility based on permissions
- Settings button click handling
- Accessibility attributes
- Edge cases (zero subscribers, undefined member_count)

Run tests with:
```bash
npm test -- ChannelHeader.test.tsx
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android 90+

## Performance

- **Lightweight**: Minimal re-renders with React.memo (if needed)
- **No heavy computations**: Simple formatting functions
- **CSS-based styling**: No runtime style calculations
- **Optimized images**: Avatar images should be optimized

## Future Enhancements

Potential improvements for future versions:

1. **Verified Badge**: Show verification badge for official channels
2. **Category Display**: Show channel category in header
3. **Online Status**: Show active subscriber count
4. **Notification Settings**: Quick access to notification preferences
5. **Share Button**: Quick share channel link
6. **Search Integration**: Search within channel from header

## Changelog

### Version 1.0.0 (Current)
- Initial implementation
- Basic channel header with avatar, name, and subscriber count
- Settings button for admins
- Responsive design
- Accessibility support
- Dark mode support

## Support

For issues or questions about the ChannelHeader component:

1. Check the example file: `ChannelHeader.example.tsx`
2. Review the test file: `ChannelHeader.test.tsx`
3. Consult the design document: `.kiro/specs/broadcast-channels/design.md`
