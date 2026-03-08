/**
 * Example usage of ChannelViewStatistics component
 * 
 * This file demonstrates how to use the ChannelViewStatistics component
 * to display and manage view statistics for channel messages.
 * 
 * Task 3.4: Create ChannelViewStatistics Component
 */

import React from 'react';
import { ChannelViewStatistics } from './ChannelViewStatistics';

export function ChannelViewStatisticsExample() {
  // Example message IDs (in real usage, these come from actual messages)
  const exampleMessageId = 'msg_123456789';

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2>ChannelViewStatistics Examples</h2>
      
      <div>
        <h3>Admin View (with statistics)</h3>
        <p>When user is an admin and message has views, the component displays a view count button:</p>
        <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <ChannelViewStatistics 
            messageId={exampleMessageId}
            isAdmin={true}
          />
        </div>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
          Note: This requires the message to have view statistics in the database.
        </p>
      </div>

      <div>
        <h3>Non-Admin View (hidden)</h3>
        <p>When user is not an admin, the component renders nothing:</p>
        <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <ChannelViewStatistics 
            messageId={exampleMessageId}
            isAdmin={false}
          />
          <p style={{ fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
            (Component is hidden for non-admins)
          </p>
        </div>
      </div>

      <div>
        <h3>Features</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>View Count Button:</strong> Displays formatted view count (K/M notation)</li>
          <li><strong>Modal Dialog:</strong> Opens on click to show detailed viewer list</li>
          <li><strong>Viewer Information:</strong> Shows username, avatar, and relative timestamp</li>
          <li><strong>Loading States:</strong> Displays spinner while fetching data</li>
          <li><strong>Error Handling:</strong> Shows error message if fetch fails</li>
          <li><strong>Accessibility:</strong> Full keyboard navigation and screen reader support</li>
        </ul>
      </div>

      <div>
        <h3>View Count Formatting</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>1 view → "1 view"</li>
          <li>42 views → "42 views"</li>
          <li>1,500 views → "1.5K views"</li>
          <li>15,000 views → "15.0K views"</li>
          <li>2,500,000 views → "2.5M views"</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Integration with Message Component:
 * 
 * The ChannelViewStatistics component is designed to be used within message
 * components to display view statistics for channel messages.
 * 
 * Example usage in CatloverRoomView:
 * 
 * ```tsx
 * import { ChannelViewStatistics } from './ChannelViewStatistics';
 * import { useChannelPermissions } from '../hooks/useChannelPermissions';
 * 
 * export function MessageItem({ message, room }: { message: Message, room: Room }) {
 *   const { permissions } = useChannelPermissions(room.id);
 * 
 *   return (
 *     <div className="message">
 *       <div className="message-content">
 *         {message.content}
 *       </div>
 *       
 *       {room.type === 'channel' && (
 *         <div className="message-metadata">
 *           <ChannelViewStatistics 
 *             messageId={message.id}
 *             isAdmin={permissions.canViewStats}
 *           />
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 * 
 * The component automatically:
 * - Hides for non-admin users
 * - Hides when view count is zero
 * - Formats view counts with K/M notation
 * - Fetches latest statistics when clicked
 * - Displays viewer list in a modal
 * - Shows relative timestamps (e.g., "2 hours ago")
 * - Handles loading and error states
 * - Provides full accessibility support
 * 
 * Modal Features:
 * - Focus trap for keyboard navigation
 * - Click outside to close
 * - ESC key to close
 * - Scrollable viewer list
 * - Custom scrollbar styling
 * - Responsive design for mobile
 */
