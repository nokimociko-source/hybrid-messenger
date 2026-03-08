import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage, Button, Icon, Icons, Text } from 'folds';
import { ChannelDiscoveryItem as ChannelDiscoveryItemType } from '../types/channels';
import { useChannelSubscription } from '../hooks/useChannelSubscription';
import { useI18n } from '../hooks/useI18n';
import './ChannelDiscoveryItem.css';

interface ChannelDiscoveryItemProps {
  channel: ChannelDiscoveryItemType;
}

export function ChannelDiscoveryItem({ channel }: ChannelDiscoveryItemProps) {
  const { isSubscribed, subscribe, unsubscribe, loading } = useChannelSubscription(channel.id);
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleSubscribeClick = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      const success = await subscribe();
      if (success) {
        navigate(`/room/${channel.id}`);
      }
    }
  };

  const formatSubscriberCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="channel-discovery-item">
      <Avatar
        className="channel-discovery-item__avatar"
        size="400"
        radii="400"
      >
        {channel.avatar_url ? (
          <AvatarImage src={channel.avatar_url} alt={`${channel.name} avatar`} />
        ) : null}
        <AvatarFallback>
          <Text size="H4">{getInitials(channel.name)}</Text>
        </AvatarFallback>
      </Avatar>
      <div className="channel-discovery-item__info">
        <Text className="channel-discovery-item__name" size="H4" priority="400">
          {channel.name}
        </Text>
        {channel.topic && (
          <Text className="channel-discovery-item__description" size="T300" priority="300">
            {channel.topic}
          </Text>
        )}
        <div className="channel-discovery-item__meta">
          <Icon src={Icons.User} size="50" />
          <Text size="T200" priority="300">
            {t('channels.subscribers', { count: formatSubscriberCount(channel.subscriber_count) })}
          </Text>
          {channel.category && (
            <>
              <span className="channel-discovery-item__separator">•</span>
              <Text className="channel-discovery-item__category" size="T200" priority="300">
                {channel.category}
              </Text>
            </>
          )}
        </div>
      </div>
      <Button
        className="channel-discovery-item__button"
        onClick={handleSubscribeClick}
        variant={isSubscribed ? 'Secondary' : 'Primary'}
        size="400"
        disabled={loading}
        aria-label={isSubscribed ? t('channels.unsubscribe') + ` ${channel.name}` : t('channels.subscribe') + ` ${channel.name}`}
      >
        {loading ? t('common.loading') : isSubscribed ? t('channels.unsubscribe') : t('channels.subscribe')}
      </Button>
    </div>
  );
}
