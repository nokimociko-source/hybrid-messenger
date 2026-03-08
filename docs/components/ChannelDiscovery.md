# ChannelDiscovery Component

## Overview

The `ChannelDiscovery` component provides the main interface for discovering and searching public broadcast channels. It displays a searchable list of channels with loading and empty states.

## Features

- Search channels by name or description
- Displays list of public channels
- Loading state with spinner
- Empty state messages (with and without search query)
- Clear search button
- Responsive layout for mobile devices
- Auto-loads channels on mount
- Full accessibility support

## Props

This component doesn't accept any props. It manages its own state internally.

## Usage

```tsx
import { ChannelDiscovery } from './ChannelDiscovery';

function MyComponent() {
  return <ChannelDiscovery />;
}
```

### In a Modal

```tsx
import { Modal } from 'folds';
import { ChannelDiscovery } from './ChannelDiscovery';

function MyComponent() {
  const [showDiscovery, setShowDiscovery] = useState(false);

  return (
    <>
      <Button onClick={() => setShowDiscovery(true)}>
        Discover Channels
      </Button>
      
      {showDiscovery && (
        <Modal onClose={() => setShowDiscovery(false)}>
          <ChannelDiscovery />
        </Modal>
      )}
    </>
  );
}
```

## Behavior

### Initial Load

1. Component mounts
2. Automatically calls `searchChannels('')` to load all public channels
3. Displays loading spinner while fetching
4. Shows channel list or empty state when loaded

### Search Flow

1. User types in search input
2. User presses Enter or clicks search button
3. Form submission triggers `searchChannels(query)`
4. Loading spinner appears
5. Results are filtered by name or description
6. Channel list updates with results

### Clear Search

1. User types in search input (clear button appears)
2. User clicks clear button (X icon)
3. Search input is cleared
4. `searchChannels('')` is called to show all channels again

## States

### Loading State

- Shows spinner with "Searching channels..." message
- Displayed while `loading` is `true`

### Empty State (No Query)

- Shows megaphone icon
- Title: "No public channels yet"
- Description: "Public channels will appear here when created"
- Displayed when `channels.length === 0` and `query === ''`

### Empty State (With Query)

- Shows megaphone icon
- Title: "No channels found"
- Description: "Try a different search term"
- Displayed when `channels.length === 0` and `query !== ''`

### Channel List

- Displays `ChannelDiscoveryItem` for each channel
- Scrollable list with custom scrollbar styling
- Displayed when `channels.length > 0`

## Styling

The component uses CSS classes with BEM naming convention:

- `.channel-discovery` - Main container
- `.channel-discovery__header` - Header section with title
- `.channel-discovery__search` - Search form container
- `.channel-discovery__search-input` - Search input field
- `.channel-discovery__clear-button` - Clear search button
- `.channel-discovery__content` - Content area (scrollable)
- `.channel-discovery__loading` - Loading state container
- `.channel-discovery__empty` - Empty state container
- `.channel-discovery__list` - Channel list container

## Accessibility

- Semantic HTML structure
- Search input has proper placeholder
- Clear button has aria-label
- Loading and empty states are screen reader friendly
- All interactive elements are keyboard accessible
- Proper focus management

## Dependencies

- `useChannelDiscovery` - Hook for channel search and discovery
- `ChannelDiscoveryItem` - Component for individual channel items
- `folds` - UI component library (Box, Input, Spinner, Text, Icon)

## Related Components

- `ChannelDiscoveryItem` - Individual channel item in the list
- `ChannelBadge` - Displays subscriber count
- `ChannelHeader` - Channel header in room view

## Integration

This component is typically used in:

1. **Chat List**: Button to open discovery modal
2. **Sidebar**: Navigation item for channel discovery
3. **Explore Page**: Main content area for browsing channels

Example integration in CatloverChatList:

```tsx
function CatloverChatList() {
  const [showDiscovery, setShowDiscovery] = useState(false);

  return (
    <div className="chat-list">
      <Button
        variant="ghost"
        icon="megaphone"
        onClick={() => setShowDiscovery(true)}
        fullWidth
      >
        Discover Channels
      </Button>

      {showDiscovery && (
        <Modal onClose={() => setShowDiscovery(false)}>
          <ChannelDiscovery />
        </Modal>
      )}
    </div>
  );
}
```

## Testing

Unit tests are available in `ChannelDiscovery.test.tsx` covering:

- Component rendering
- Search functionality
- Loading states
- Empty states (with and without query)
- Clear button functionality
- Channel list display
- Form submission

## Performance Considerations

- Search is triggered on form submit (not on every keystroke)
- Results are limited to 50 channels (handled by hook)
- Scrollable content area prevents layout issues with many results
- Component uses React hooks efficiently to minimize re-renders
