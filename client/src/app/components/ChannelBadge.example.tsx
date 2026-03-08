/**
 * Example usage of ChannelBadge component
 * 
 * This file demonstrates how to use the ChannelBadge component
 * to display subscriber counts for broadcast channels.
 * 
 * Task 3.1: Create ChannelBadge Component
 */

import React from 'react';
import { ChannelBadge } from './ChannelBadge';

export function ChannelBadgeExample() {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2>ChannelBadge Examples</h2>
      
      <div>
        <h3>Small subscriber count (under 1K)</h3>
        <ChannelBadge subscriberCount={42} />
      </div>

      <div>
        <h3>Thousands (K notation)</h3>
        <ChannelBadge subscriberCount={1500} />
      </div>

      <div>
        <h3>Large thousands</h3>
        <ChannelBadge subscriberCount={15000} />
      </div>

      <div>
        <h3>Millions (M notation)</h3>
        <ChannelBadge subscriberCount={2500000} />
      </div>

      <div>
        <h3>Zero subscribers</h3>
        <ChannelBadge subscriberCount={0} />
      </div>
    </div>
  );
}

/**
 * Integration with ChannelHeader:
 * 
 * The ChannelBadge component is designed to be used within the ChannelHeader
 * component to display the subscriber count for a channel.
 * 
 * Example usage in ChannelHeader:
 * 
 * ```tsx
 * import { ChannelBadge } from './ChannelBadge';
 * 
 * export function ChannelHeader({ channel }: { channel: Room }) {
 *   return (
 *     <div className="channel-header">
 *       <div className="channel-info">
 *         <Avatar src={channel.avatar_url} name={channel.name} />
 *         <div>
 *           <h2>{channel.name}</h2>
 *           <ChannelBadge subscriberCount={channel.member_count || 0} />
 *         </div>
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 * 
 * The component automatically:
 * - Formats numbers with K/M notation
 * - Provides accessibility attributes
 * - Adapts to mobile screens
 * - Supports dark mode
 */
