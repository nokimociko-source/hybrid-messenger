import { logger } from '../utils/logger';
/**
 * ChannelHeader Component Examples
 * 
 * This file demonstrates various usage patterns for the ChannelHeader component.
 */

import React, { useState } from 'react';
import { ChannelHeader } from './ChannelHeader';
import { Room } from '../hooks/useSupabaseChat';
import { ChannelPermissions } from '../types/channels';

/**
 * Example 1: Basic Channel Header (Subscriber View)
 * 
 * Shows a channel header for a regular subscriber who cannot modify settings.
 */
export function BasicChannelHeaderExample() {
  const channel: Room = {
    id: 'channel-123',
    name: 'Tech News',
    type: 'channel',
    created_at: '2024-01-01T00:00:00Z',
    member_count: 1250,
    avatar_url: 'https://example.com/tech-news-avatar.jpg',
    is_public: true,
  };

  const subscriberPermissions: ChannelPermissions = {
    canPost: false,
    canManageAdmins: false,
    canViewStats: false,
    canModifySettings: false,
  };

  return (
    <ChannelHeader
      channel={channel}
      permissions={subscriberPermissions}
      onSettingsClick={() => {
        // This won't be called for subscribers since button is hidden
        logger.info('Settings clicked');
      }}
    />
  );
}

/**
 * Example 2: Admin Channel Header
 * 
 * Shows a channel header for an admin who can modify settings.
 * The settings button will be visible and clickable.
 */
export function AdminChannelHeaderExample() {
  const [showSettings, setShowSettings] = useState(false);

  const channel: Room = {
    id: 'channel-456',
    name: 'Official Announcements',
    type: 'channel',
    created_at: '2024-01-01T00:00:00Z',
    member_count: 5420,
    avatar_url: 'https://example.com/announcements-avatar.jpg',
    is_public: true,
  };

  const adminPermissions: ChannelPermissions = {
    canPost: true,
    canManageAdmins: false,
    canViewStats: true,
    canModifySettings: true,
  };

  return (
    <>
      <ChannelHeader
        channel={channel}
        permissions={adminPermissions}
        onSettingsClick={() => setShowSettings(true)}
      />
      
      {showSettings && (
        <div>
          {/* Settings modal would go here */}
          <p>Channel Settings Modal</p>
          <button onClick={() => setShowSettings(false)}>Close</button>
        </div>
      )}
    </>
  );
}

/**
 * Example 3: Channel Without Avatar
 * 
 * Shows how the component handles channels without an avatar URL.
 * It will display initials as a fallback.
 */
export function ChannelWithoutAvatarExample() {
  const channel: Room = {
    id: 'channel-789',
    name: 'Community Updates',
    type: 'channel',
    created_at: '2024-01-01T00:00:00Z',
    member_count: 850,
    // No avatar_url provided
    is_public: true,
  };

  const permissions: ChannelPermissions = {
    canPost: false,
    canManageAdmins: false,
    canViewStats: false,
    canModifySettings: false,
  };

  return (
    <ChannelHeader
      channel={channel}
      permissions={permissions}
      onSettingsClick={() => {}}
    />
  );
}

/**
 * Example 4: Large Subscriber Count
 * 
 * Demonstrates how the component formats large subscriber counts.
 */
export function LargeSubscriberCountExample() {
  const channel: Room = {
    id: 'channel-999',
    name: 'Global News Network',
    type: 'channel',
    created_at: '2024-01-01T00:00:00Z',
    member_count: 1500000, // Will display as "1.5M subscribers"
    avatar_url: 'https://example.com/global-news-avatar.jpg',
    is_public: true,
  };

  const permissions: ChannelPermissions = {
    canPost: false,
    canManageAdmins: false,
    canViewStats: false,
    canModifySettings: false,
  };

  return (
    <ChannelHeader
      channel={channel}
      permissions={permissions}
      onSettingsClick={() => {}}
    />
  );
}

/**
 * Example 5: Integration with useChannelPermissions Hook
 * 
 * Shows how to use the ChannelHeader component with the useChannelPermissions hook
 * in a real application scenario.
 */
export function IntegratedChannelHeaderExample({ channelId }: { channelId: string }) {
  // In a real app, you would import and use these hooks:
  // import { useSupabaseRoom } from '../hooks/useSupabaseChat';
  // import { useChannelPermissions } from '../hooks/useChannelPermissions';
  
  // const { room, loading: roomLoading } = useSupabaseRoom(channelId);
  // const { permissions, loading: permissionsLoading } = useChannelPermissions(channelId);
  
  // Mock data for example purposes
  const room: Room = {
    id: channelId,
    name: 'Example Channel',
    type: 'channel',
    created_at: '2024-01-01T00:00:00Z',
    member_count: 1000,
    is_public: true,
  };

  const permissions: ChannelPermissions = {
    canPost: true,
    canManageAdmins: true,
    canViewStats: true,
    canModifySettings: true,
  };

  const handleSettingsClick = () => {
    logger.info('Opening channel settings for:', channelId);
    // Navigate to settings or open settings modal
  };

  return (
    <ChannelHeader
      channel={room}
      permissions={permissions}
      onSettingsClick={handleSettingsClick}
    />
  );
}

/**
 * Usage Notes:
 * 
 * 1. The ChannelHeader component is designed to be used at the top of a channel view.
 * 2. It automatically hides the settings button for users without canModifySettings permission.
 * 3. The component is fully responsive and works on mobile, tablet, and desktop.
 * 4. Accessibility features include proper ARIA labels and keyboard navigation.
 * 5. The subscriber count is automatically formatted (K for thousands, M for millions).
 * 6. Avatar fallback shows initials when no avatar_url is provided.
 * 
 * Typical Integration:
 * 
 * ```tsx
 * import { ChannelHeader } from './components/ChannelHeader';
 * import { useSupabaseRoom } from './hooks/useSupabaseChat';
 * import { useChannelPermissions } from './hooks/useChannelPermissions';
 * 
 * function ChannelView({ channelId }: { channelId: string }) {
 *   const { room } = useSupabaseRoom(channelId);
 *   const { permissions } = useChannelPermissions(channelId);
 *   const [showSettings, setShowSettings] = useState(false);
 * 
 *   if (!room) return <Spinner />;
 * 
 *   return (
 *     <div className="channel-view">
 *       <ChannelHeader
 *         channel={room}
 *         permissions={permissions}
 *         onSettingsClick={() => setShowSettings(true)}
 *       />
 *       {/* Rest of channel content *\/}
 *     </div>
 *   );
 * }
 * ```
 */
