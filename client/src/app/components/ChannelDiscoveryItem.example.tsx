/**
 * Example usage of ChannelDiscoveryItem component
 * 
 * This file demonstrates various use cases and states of the ChannelDiscoveryItem component.
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ChannelDiscoveryItem } from './ChannelDiscoveryItem';
import { ChannelDiscoveryItem as ChannelDiscoveryItemType } from '../types/channels';

// Example 1: Basic channel with all properties
const basicChannel: ChannelDiscoveryItemType = {
  id: 'channel-1',
  name: 'Tech News Daily',
  avatar_url: 'https://example.com/tech-news-avatar.jpg',
  topic: 'Get the latest technology news, product launches, and industry insights delivered daily.',
  subscriber_count: 15420,
  category: 'Technology',
  is_subscribed: false,
};

// Example 2: Channel with high subscriber count
const popularChannel: ChannelDiscoveryItemType = {
  id: 'channel-2',
  name: 'Global News Network',
  avatar_url: 'https://example.com/global-news-avatar.jpg',
  topic: 'Breaking news from around the world, 24/7 coverage of major events.',
  subscriber_count: 2500000,
  category: 'News',
  is_subscribed: false,
};

// Example 3: Subscribed channel
const subscribedChannel: ChannelDiscoveryItemType = {
  id: 'channel-3',
  name: 'Gaming Updates',
  avatar_url: 'https://example.com/gaming-avatar.jpg',
  topic: 'Latest gaming news, reviews, and updates from the gaming industry.',
  subscriber_count: 87300,
  category: 'Gaming',
  is_subscribed: true,
};

// Example 4: Channel without avatar
const noAvatarChannel: ChannelDiscoveryItemType = {
  id: 'channel-4',
  name: 'Science Weekly',
  topic: 'Weekly science news, research breakthroughs, and discoveries.',
  subscriber_count: 5600,
  category: 'Science',
  is_subscribed: false,
};

// Example 5: Channel without description
const noDescriptionChannel: ChannelDiscoveryItemType = {
  id: 'channel-5',
  name: 'Sports Central',
  avatar_url: 'https://example.com/sports-avatar.jpg',
  subscriber_count: 42000,
  category: 'Sports',
  is_subscribed: false,
};

// Example 6: Channel without category
const noCategoryChannel: ChannelDiscoveryItemType = {
  id: 'channel-6',
  name: 'Community Updates',
  avatar_url: 'https://example.com/community-avatar.jpg',
  topic: 'Important updates and announcements for our community members.',
  subscriber_count: 1200,
  is_subscribed: false,
};

// Example 7: Minimal channel (only required fields)
const minimalChannel: ChannelDiscoveryItemType = {
  id: 'channel-7',
  name: 'New Channel',
  subscriber_count: 0,
  is_subscribed: false,
};

// Example 8: Channel with small subscriber count
const smallChannel: ChannelDiscoveryItemType = {
  id: 'channel-8',
  name: 'Local Events',
  avatar_url: 'https://example.com/local-avatar.jpg',
  topic: 'Stay updated on local events, meetups, and community gatherings.',
  subscriber_count: 342,
  category: 'Local',
  is_subscribed: false,
};

export function ChannelDiscoveryItemExamples() {
  return (
    <BrowserRouter>
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>ChannelDiscoveryItem Examples</h1>
        
        <section style={{ marginBottom: '32px' }}>
          <h2>Example 1: Basic Channel</h2>
          <p>A typical channel with all properties filled in.</p>
          <ChannelDiscoveryItem channel={basicChannel} />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2>Example 2: Popular Channel (2.5M subscribers)</h2>
          <p>Channel with high subscriber count showing M notation.</p>
          <ChannelDiscoveryItem channel={popularChannel} />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2>Example 3: Subscribed Channel</h2>
          <p>Channel that the user is already subscribed to.</p>
          <ChannelDiscoveryItem channel={subscribedChannel} />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2>Example 4: Channel Without Avatar</h2>
          <p>Shows fallback initials when no avatar is provided.</p>
          <ChannelDiscoveryItem channel={noAvatarChannel} />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2>Example 5: Channel Without Description</h2>
          <p>Channel with no topic/description.</p>
          <ChannelDiscoveryItem channel={noDescriptionChannel} />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2>Example 6: Channel Without Category</h2>
          <p>Channel without a category tag.</p>
          <ChannelDiscoveryItem channel={noCategoryChannel} />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2>Example 7: Minimal Channel</h2>
          <p>Channel with only required fields (new channel).</p>
          <ChannelDiscoveryItem channel={minimalChannel} />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2>Example 8: Small Channel</h2>
          <p>Channel with small subscriber count (no K/M notation).</p>
          <ChannelDiscoveryItem channel={smallChannel} />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2>Example 9: Multiple Channels in List</h2>
          <p>How multiple channels appear together.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ChannelDiscoveryItem channel={basicChannel} />
            <ChannelDiscoveryItem channel={subscribedChannel} />
            <ChannelDiscoveryItem channel={smallChannel} />
          </div>
        </section>
      </div>
    </BrowserRouter>
  );
}

export default ChannelDiscoveryItemExamples;
