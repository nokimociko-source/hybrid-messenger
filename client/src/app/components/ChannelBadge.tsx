import React from 'react';
import { Icon, Icons } from 'folds';
import { useI18n } from '../hooks/useI18n';
import './ChannelBadge.css';

interface ChannelBadgeProps {
  subscriberCount: number;
}

export function ChannelBadge({ subscriberCount }: ChannelBadgeProps) {
  const { t } = useI18n();
  
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div 
      className="channel-badge"
      role="status"
      aria-label={t('channels.subscribers', { count: subscriberCount })}
    >
      <Icon src={Icons.VolumeHigh} size="100" aria-hidden="true" />
      <span className="channel-badge__text">
        {t('channels.subscribers', { count: formatCount(subscriberCount) })}
      </span>
    </div>
  );
}
