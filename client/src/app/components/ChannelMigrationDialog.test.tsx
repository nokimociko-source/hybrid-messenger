// @ts-nocheck
// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChannelMigrationDialog } from './ChannelMigrationDialog';
import { supabase } from '../../supabaseClient';

// Mock supabase
jest.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

describe('ChannelMigrationDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const defaultProps = {
    roomId: 'room-123',
    roomName: 'Test Group',
    memberCount: 42,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
  });

  it('renders dialog with correct title', () => {
    render(<ChannelMigrationDialog {...defaultProps} />);
    expect(screen.getByText('Convert to Channel')).toBeInTheDocument();
  });

  it('displays warning message', () => {
    render(<ChannelMigrationDialog {...defaultProps} />);
    expect(screen.getByText('Warning:')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('shows migration information with room name and member count', () => {
    render(<ChannelMigrationDialog {...defaultProps} />);

    expect(screen.getByText(/Test Group.*will become a broadcast channel/)).toBeInTheDocument();
    expect(screen.getByText(/42 members will become subscribers/)).toBeInTheDocument();
    expect(screen.getByText(/Only admins will be able to post messages/)).toBeInTheDocument();
    expect(screen.getByText(/All message history will be preserved/)).toBeInTheDocument();
    expect(screen.getByText(/Current admins will keep their posting rights/)).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<ChannelMigrationDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<ChannelMigrationDialog {...defaultProps} />);

    const backdrop = screen.getByText('Convert to Channel').closest('div')?.parentElement?.parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('calls migration RPC function when convert button is clicked', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { success: true, affected_members: 41 },
      error: null,
    });

    render(<ChannelMigrationDialog {...defaultProps} />);

    const convertButton = screen.getByText('Convert to Channel');
    fireEvent.click(convertButton);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('migrate_group_to_channel', {
        p_room_id: 'room-123',
        p_user_id: 'user-123',
      });
    });
  });

  it('calls onSuccess and onClose on successful migration', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { success: true, affected_members: 41 },
      error: null,
    });

    render(<ChannelMigrationDialog {...defaultProps} />);

    const convertButton = screen.getByText('Convert to Channel');
    fireEvent.click(convertButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message when migration fails', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Only creator can migrate to channel' },
    });

    render(<ChannelMigrationDialog {...defaultProps} />);

    const convertButton = screen.getByText('Convert to Channel');
    fireEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByText('Only creator can migrate to channel')).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('displays error when RPC returns success: false', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { success: false, error: 'Permission denied' },
      error: null,
    });

    render(<ChannelMigrationDialog {...defaultProps} />);

    const convertButton = screen.getByText('Convert to Channel');
    fireEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });
  });

  it('disables buttons while migration is in progress', async () => {
    (supabase.rpc as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true }, error: null }), 100))
    );

    render(<ChannelMigrationDialog {...defaultProps} />);

    const convertButton = screen.getByText('Convert to Channel');
    const cancelButton = screen.getByText('Cancel');

    fireEvent.click(convertButton);

    // Buttons should be disabled during loading
    expect(convertButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles user not authenticated error', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
    });

    render(<ChannelMigrationDialog {...defaultProps} />);

    const convertButton = screen.getByText('Convert to Channel');
    fireEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByText('User not authenticated')).toBeInTheDocument();
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

