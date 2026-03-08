# ChannelViewStatistics Component

## Overview

The `ChannelViewStatistics` component displays and manages view statistics for channel messages. It shows a view count button for admins that opens a modal with detailed viewer information.

## Features

- **Admin-Only Display**: Only visible to channel admins
- **View Count Formatting**: Formats large numbers with K/M notation
- **Detailed Viewer List**: Shows usernames, avatars, and timestamps
- **Modal Interface**: Opens detailed statistics in a modal dialog
- **Loading States**: Displays spinner while fetching data
- **Error Handling**: Shows error messages gracefully
- **Accessibility**: Full keyboard navigation and screen reader support
- **Responsive Design**: Adapts to mobile screens
- **Dark Mode**: Supports dark mode styling

## Props

```typescript
interface ChannelViewStatisticsProps {
  messageId: string;  // ID of the message to show statistics for
  isAdmin: boolean;   // Whether the current user is an admin
}
```

## Usage

```tsx
import { ChannelViewStatistics } from './ChannelViewStatistics';

<ChannelViewStatistics 
  messageId="msg_123456789"
  isAdmin={true}
/>
```

## Behavior

1. **Hidden for Non-Admins**: Returns `null` when `isAdmin` is `false`
2. **Hidden for Zero Views**: Returns `null` when view count is 0
3. **View Count Button**: Displays formatted view count
4. **Modal on Click**: Opens modal with viewer list when clicked
5. **Fetch on Open**: Fetches latest statistics when modal opens

## View Count Formatting

- `1` → "1 view"
- `42` → "42 views"
- `1,500` → "1.5K views"
- `15,000` → "15.0K views"
- `2,500,000` → "2.5M views"

## Modal Features

- **Viewer List**: Scrollable list of viewers with avatars
- **Relative Timestamps**: Shows "2 hours ago" format
- **Loading State**: Spinner while fetching
- **Error State**: Error message with icon
- **Close Button**: IconButton in header
- **Focus Trap**: Keyboard navigation contained
- **Click Outside**: Closes modal
- **ESC Key**: Closes modal

## Accessibility

- **ARIA Labels**: Descriptive labels on interactive elements
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Announces view statistics
- **Focus Management**: Focus trap in modal
- **High Contrast**: Supports high contrast mode
- **Reduced Motion**: Respects prefers-reduced-motion

## Styling

The component uses CSS custom properties for theming:
- `--bg-surface-low`: Background colors
- `--tc-surface-normal`: Text colors
- `--accent-color`: Focus indicators

## Dependencies

- `useChannelViewStats` hook for data fetching
- `dayjs` with `relativeTime` plugin for timestamps
- `folds` UI components (Modal, Avatar, etc.)
- `focus-trap-react` for modal focus management

## Task Reference

Task 3.4: Create ChannelViewStatistics Component
