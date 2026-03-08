import React from 'react';
import { Avatar, AvatarFallback, AvatarImage, Box, Icon, IconButton, Icons, Text } from 'folds';
import { Room } from '../hooks/useSupabaseChat';
import { ChannelPermissions } from '../types/channels';
import { ChannelBadge } from './ChannelBadge';
import { useI18n } from '../hooks/useI18n';
import './ChannelHeader.css';

interface ChannelHeaderProps {
  channel: Room;
  permissions: ChannelPermissions;
  onSettingsClick: () => void;
}

/**
 * ChannelHeader Component
 * 
 * Displays the header for a broadcast channel with:
 * - Channel avatar and name
 * - Subscriber count badge
 * - Settings button (for admins only)
 * 
 * @param channel - The channel room object
 * @param permissions - User's permissions in the channel
 * @param onSettingsClick - Callback when settings button is clicked
 */
export function ChannelHeader({ channel, permissions, onSettingsClick }: ChannelHeaderProps) {
  const { t } = useI18n();
  
  // Generate initials from channel name for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header 
      className="channel-header"
      role="banner"
      aria-label={`Channel header for ${channel.name}`}
    >
      <Box className="channel-header__content" gap="300" alignItems="Center">
        {/* Channel Avatar */}
        <Avatar size="400" className="channel-header__avatar">
          {channel.avatar_url ? (
            <AvatarImage src={channel.avatar_url} alt={`${channel.name} avatar`} />
          ) : null}
          <AvatarFallback>
            <Text size="H4">{getInitials(channel.name)}</Text>
          </AvatarFallback>
        </Avatar>

        {/* Channel Info */}
        <Box className="channel-header__info" direction="Column" gap="100" grow="Yes">
          <Text 
            size="H3" 
            className="channel-header__name"
            aria-label={`Channel name: ${channel.name}`}
          >
            {channel.name}
          </Text>
          <ChannelBadge subscriberCount={channel.member_count || 0} />
        </Box>

        {/* Settings Button (Admin Only) */}
        {permissions.canModifySettings && (
          <Box shrink="No">
            <IconButton
              onClick={onSettingsClick}
              variant="Surface"
              aria-label={t('settings.title')}
              title={t('settings.title')}
            >
              <Icon src={Icons.Setting} size="400" />
            </IconButton>
          </Box>
        )}
      </Box>
    </header>
  );
}
