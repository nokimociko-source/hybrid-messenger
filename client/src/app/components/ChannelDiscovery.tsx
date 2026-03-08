import React, { useState, useEffect, FormEvent } from 'react';
import { Box, Input, Spinner, Text, Icon, Icons } from 'folds';
import { useChannelDiscovery } from '../hooks/useChannelDiscovery';
import { ChannelDiscoveryItem } from './ChannelDiscoveryItem';
import { useI18n } from '../hooks/useI18n';
import './ChannelDiscovery.css';

export function ChannelDiscovery() {
  const { channels, searchChannels, loading } = useChannelDiscovery();
  const [query, setQuery] = useState('');
  const { t } = useI18n();

  // Load all public channels on mount
  useEffect(() => {
    searchChannels('');
  }, [searchChannels]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    searchChannels(query);
  };

  return (
    <div className="channel-discovery">
      <Box className="channel-discovery__header" direction="Column" gap="200">
        <Text size="H3" priority="400">
          {t('channels.discover')}
        </Text>
        <Text size="T300" priority="300">
          {t('channels.discover_description')}
        </Text>
      </Box>

      <form onSubmit={handleSearch} className="channel-discovery__search">
        <Input
          className="channel-discovery__search-input"
          value={query}
          onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder={t('channels.search_channels')}
          size="400"
          variant="Background"
          before={<Icon src={Icons.Search} size="100" />}
          after={
            query && (
              <button
                type="button"
                className="channel-discovery__clear-button"
                onClick={() => {
                  setQuery('');
                  searchChannels('');
                }}
                aria-label="Clear search"
              >
                <Icon src={Icons.Cross} size="100" />
              </button>
            )
          }
        />
      </form>

      <div className="channel-discovery__content">
        {loading ? (
          <div className="channel-discovery__loading">
            <Spinner size="600" variant="Secondary" />
            <Text size="T300" priority="300">
              {t('channels.search_channels')}
            </Text>
          </div>
        ) : channels.length === 0 ? (
          <div className="channel-discovery__empty">
            <Icon src={Icons.VolumeHigh} size="600" />
            <Text size="H4" priority="400">
              {query ? t('channels.no_channels_found') : t('channels.no_public_channels')}
            </Text>
            <Text size="T300" priority="300">
              {query
                ? t('channels.try_different_search')
                : t('channels.channels_will_appear')}
            </Text>
          </div>
        ) : (
          <div className="channel-discovery__list">
            {channels.map((channel) => (
              <ChannelDiscoveryItem key={channel.id} channel={channel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
