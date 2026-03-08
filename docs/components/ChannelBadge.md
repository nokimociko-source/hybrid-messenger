# ChannelBadge Component

A compact badge component that displays the subscriber count for broadcast channels with automatic number formatting.

## Features

- **Icon Display**: Shows a volume/speaker icon to indicate broadcast channel
- **Smart Formatting**: Automatically formats numbers with K (thousands) and M (millions) notation
- **Accessibility**: Includes proper ARIA attributes for screen readers
- **Responsive**: Adapts to mobile screen sizes
- **Theme Support**: Works with both light and dark modes

## Usage

```tsx
import { ChannelBadge } from './components/ChannelBadge';

function MyComponent() {
  return <ChannelBadge subscriberCount={1500} />;
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `subscriberCount` | `number` | Yes | The number of subscribers to display |

## Number Formatting

The component automatically formats subscriber counts:

- **0-999**: Displayed as-is (e.g., "42 subscribers")
- **1,000-999,999**: Formatted with K notation (e.g., "1.5K subscribers")
- **1,000,000+**: Formatted with M notation (e.g., "2.5M subscribers")

## Examples

```tsx
// Small count
<ChannelBadge subscriberCount={42} />
// Output: "42 subscribers"

// Thousands
<ChannelBadge subscriberCount={1500} />
// Output: "1.5K subscribers"

// Millions
<ChannelBadge subscriberCount={2500000} />
// Output: "2.5M subscribers"
```

## Accessibility

The component includes:
- `role="status"` for screen reader announcements
- `aria-label` with full subscriber count description
- `aria-hidden="true"` on decorative icon

## Styling

The component uses CSS custom properties for theming:
- `--bg-surface-low`: Background color
- `--tc-surface-normal`: Text color

Custom styling can be applied via the `.channel-badge` class.

## Integration

This component is designed to be used in:
- **ChannelHeader**: Display subscriber count in channel header
- **ChannelDiscoveryItem**: Show subscriber count in discovery list
- **Channel Info Panels**: Display channel statistics

## Related Components

- `ChannelHeader`: Uses ChannelBadge to display subscriber count
- `ChannelDiscoveryItem`: Shows badge in channel discovery
- `ChannelViewStatistics`: Displays view statistics for admins

## Task Reference

Implemented as part of Task 3.1 in the Broadcast Channels specification.
