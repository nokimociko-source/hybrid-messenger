// @ts-nocheck
// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelHeader } from './ChannelHeader';
import { Room } from '../hooks/useSupabaseChat';
import { ChannelPermissions } from '../types/channels';

describe('ChannelHeader', () => {
  const mockChannel: Room = {
    id: 'channel-1',
    name: 'Test Channel',
    type: 'channel',
    created_at: '2024-01-01T00:00:00Z',
    member_count: 1250,
    avatar_url: 'https://example.com/avatar.jpg',
    is_public: true,
  };

  const mockPermissions: ChannelPermissions = {
    canPost: false,
    canManageAdmins: false,
    canViewStats: false,
    canModifySettings: false,
  };

  const mockOnSettingsClick = jest.fn();

  beforeEach(() => {
    mockOnSettingsClick.mockClear();
  });

  it('renders channel name', () => {
    render(
      <ChannelHeader
        channel={mockChannel}
        permissions={mockPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    expect(screen.getByText('Test Channel')).toBeInTheDocument();
  });

  it('renders channel avatar with image', () => {
    render(
      <ChannelHeader
        channel={mockChannel}
        permissions={mockPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    const avatar = screen.getByAltText('Test Channel avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders avatar fallback when no avatar_url', () => {
    const channelWithoutAvatar = { ...mockChannel, avatar_url: undefined };

    render(
      <ChannelHeader
        channel={channelWithoutAvatar}
        permissions={mockPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    // Should show initials "TC" for "Test Channel"
    expect(screen.getByText('TC')).toBeInTheDocument();
  });

  it('displays subscriber count badge', () => {
    render(
      <ChannelHeader
        channel={mockChannel}
        permissions={mockPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    // ChannelBadge should format 1250 as "1.2K subscribers"
    expect(screen.getByText(/1\.2K subscribers/i)).toBeInTheDocument();
  });

  it('shows settings button when user has modify settings permission', () => {
    const adminPermissions: ChannelPermissions = {
      ...mockPermissions,
      canModifySettings: true,
    };

    render(
      <ChannelHeader
        channel={mockChannel}
        permissions={adminPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    const settingsButton = screen.getByLabelText('Channel settings');
    expect(settingsButton).toBeInTheDocument();
  });

  it('hides settings button when user lacks modify settings permission', () => {
    render(
      <ChannelHeader
        channel={mockChannel}
        permissions={mockPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    const settingsButton = screen.queryByLabelText('Channel settings');
    expect(settingsButton).not.toBeInTheDocument();
  });

  it('calls onSettingsClick when settings button is clicked', () => {
    const adminPermissions: ChannelPermissions = {
      ...mockPermissions,
      canModifySettings: true,
    };

    render(
      <ChannelHeader
        channel={mockChannel}
        permissions={adminPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    const settingsButton = screen.getByLabelText('Channel settings');
    fireEvent.click(settingsButton);

    expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(
      <ChannelHeader
        channel={mockChannel}
        permissions={mockPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    const header = screen.getByRole('banner');
    expect(header).toHaveAttribute('aria-label', 'Channel header for Test Channel');
  });

  it('handles channels with zero subscribers', () => {
    const emptyChannel = { ...mockChannel, member_count: 0 };

    render(
      <ChannelHeader
        channel={emptyChannel}
        permissions={mockPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    expect(screen.getByText(/0 subscribers/i)).toBeInTheDocument();
  });

  it('handles channels with undefined member_count', () => {
    const channelNoCount = { ...mockChannel, member_count: undefined };

    render(
      <ChannelHeader
        channel={channelNoCount}
        permissions={mockPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    // Should default to 0
    expect(screen.getByText(/0 subscribers/i)).toBeInTheDocument();
  });

  it('generates correct initials for multi-word channel names', () => {
    const multiWordChannel = { ...mockChannel, name: 'Tech News Daily', avatar_url: undefined };

    render(
      <ChannelHeader
        channel={multiWordChannel}
        permissions={mockPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    // Should show "TN" for "Tech News Daily" (first two words)
    expect(screen.getByText('TN')).toBeInTheDocument();
  });

  it('generates correct initials for single-word channel names', () => {
    const singleWordChannel = { ...mockChannel, name: 'Technology', avatar_url: undefined };

    render(
      <ChannelHeader
        channel={singleWordChannel}
        permissions={mockPermissions}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    // Should show "TE" for "Technology" (first two letters)
    expect(screen.getByText('TE')).toBeInTheDocument();
  });
});

