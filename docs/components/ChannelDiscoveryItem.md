# ChannelDiscoveryItem Component

## Overview

The `ChannelDiscoveryItem` component displays an individual channel in the discovery list. It shows channel information and provides subscribe/unsubscribe functionality.

## Features

- Displays channel avatar with fallback to initials
- Shows channel name, description, and metadata
- Displays subscriber count with formatted numbers (K, M notation)
- Shows category if available
- Subscribe/Unsubscribe button with loading states
- Navigates to channel after successful subscription
- Responsive layout for mobile devices
- Full accessibility support

## Props

```typescript
interface ChannelDiscoveryItemProps {
  channel: ChannelDiscoveryItem;
}

type ChannelDiscoveryItem = {
  id: string;
  name: string;
  avatar_url?: string;
  topic?: string;
  subscriber_count: number;
  category?: string;
  is_subscribed: boolean;
};
```

## Usage

```tsx
import { ChannelDiscoveryItem } from './ChannelDiscoveryItem';

function MyComponent() {
  const channel = {
    id: 'channel-123',
    name: 'Tech News',
    avatar_url: 'https://example.com/avatar.jpg',
    topic: 'Latest technology news and updates',
    subscriber_count: 5000,
    category: 'Technology',
    is_subscribed: false,
  };

  return <ChannelDiscoveryItem channel={channel} />;
}
```

## Behavior

### Subscription Flow

1. **Not Subscribed**: Shows "Subscribe" button with primary variant
2. **Click Subscribe**: 
   - Button shows "Loading..." and is disabled
   - Calls `subscribe()` from `useChannelSubscription` hook
   - On success, navigates to channel view
3. **Subscribed**: Shows "Unsubscribe" button with secondary variant
4. **Click Unsubscribe**:
   - Button shows "Loading..." and is disabled
   - Calls `unsubscribe()` from `useChannelSubscription` hook
   - On success, updates button state

### Number Formatting

- **< 1,000**: Shows exact number (e.g., "500 subscribers")
- **1,000 - 999,999**: Shows in thousands (e.g., "5.0K subscribers")
- **≥ 1,000,000**: Shows in millions (e.g., "1.5M subscribers")

## Accessibility

- Avatar has proper alt text
- Subscribe button has descriptive aria-label
- All interactive elements are keyboard accessible
- Proper focus indicators
- Screen reader friendly

## Styling

The component uses CSS classes with BEM naming convention:

- `.channel-discovery-item` - Main container
- `.channel-discovery-item__avatar` - Avatar container
- `.channel-discovery-item__info` - Information section
- `.channel-discovery-item__name` - Channel name
- `.channel-discovery-item__description` - Channel description
- `.channel-discovery-item__meta` - Metadata section
- `.channel-discovery-item__separator` - Separator between metadata items
- `.channel-discovery-item__category` - Category label
- `.channel-discovery-item__button` - Subscribe/Unsubscribe button

## Dependencies

- `useChannelSubscription` - Hook for subscription management
- `useNavigate` - React Router hook for navigation
- `folds` - UI component library (Avatar, Button, Icon, Text)

## Related Components

- `ChannelDiscovery` - Parent component that displays list of items
- `ChannelBadge` - Displays subscriber count badge
- `ChannelHeader` - Channel header in room view

## Testing

Unit tests are available in `ChannelDiscoveryItem.test.tsx` covering:

- Component rendering
- Subscription state display
- Button click handlers
- Number formatting
- Loading states
- Accessibility attributes
