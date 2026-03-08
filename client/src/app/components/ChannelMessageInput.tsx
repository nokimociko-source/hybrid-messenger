import React from 'react';
import { Icon, Icons } from 'folds';
import { useChannelPermissions } from '../hooks/useChannelPermissions';
import { useI18n } from '../hooks/useI18n';
import './ChannelMessageInput.css';

interface ChannelMessageInputProps {
  roomId: string;
  children: React.ReactNode; // The normal message input UI
}

/**
 * ChannelMessageInput Component
 * 
 * Wraps the message input area and shows a disabled state for non-admins in channels.
 * For channels, only admins (creators and admins) can post messages.
 * For regular rooms, the normal input is always shown.
 * 
 * Usage:
 * <ChannelMessageInput roomId={roomId}>
 *   <div className={css.FloatingInputPill}>
 *     ... normal input UI ...
 *   </div>
 * </ChannelMessageInput>
 */
export function ChannelMessageInput({ roomId, children }: ChannelMessageInputProps) {
  const { permissions, loading } = useChannelPermissions(roomId);
  const { t } = useI18n();

  // While loading, show the normal input (avoid flickering)
  if (loading) {
    return <>{children}</>;
  }

  // If user cannot post, show disabled state
  if (!permissions.canPost) {
    return (
      <div className="DisabledInputContainer" role="status" aria-live="polite">
        <div className="DisabledInputContent">
          <Icon 
            size="200" 
            src={Icons.Lock} 
            className="LockIcon"
            aria-hidden="true"
          />
          <span className="DisabledMessage">
            {t('channels.channel_info')}
          </span>
        </div>
      </div>
    );
  }

  // User can post, show normal input
  return <>{children}</>;
}
