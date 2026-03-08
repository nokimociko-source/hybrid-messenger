import React, { useState } from 'react';
import { IconButton, Icon, Icons, Text, Avatar, AvatarImage, AvatarFallback, Spinner, Box } from 'folds';
import FocusTrap from 'focus-trap-react';
import { Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import { useChannelViewStats } from '../hooks/useChannelViewStats';
import { useI18n } from '../hooks/useI18n';
import { stopPropagation } from '../utils/keyboard';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './ChannelViewStatistics.css';

dayjs.extend(relativeTime);

interface ChannelViewStatisticsProps {
  messageId: string;
  isAdmin: boolean;
}

/**
 * Component to display and manage view statistics for channel messages
 * 
 * Features:
 * - Shows view count button for admins only
 * - Formats view count with K/M notation
 * - Opens modal with detailed viewer list on click
 * - Modal displays usernames, avatars, and timestamps
 * - Hidden for non-admin subscribers
 * - Handles loading and error states
 */
export function ChannelViewStatistics({ messageId, isAdmin }: ChannelViewStatisticsProps) {
  const { stats, fetchStats, loading, error } = useChannelViewStats(messageId);
  const [showModal, setShowModal] = useState(false);
  const { t } = useI18n();

  // Don't render anything if user is not an admin
  if (!isAdmin) {
    return null;
  }

  // Don't render if no stats available yet
  if (!stats || stats.viewCount === 0) {
    return null;
  }

  /**
   * Format view count with K/M notation
   * - 1,000,000+ → "X.XM views"
   * - 1,000+ → "X.XK views"
   * - < 1,000 → "X views"
   */
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return t('channels.message_views_count_m', { count: (count / 1000000).toFixed(1) });
    }
    if (count >= 1000) {
      return t('channels.message_views_count_k', { count: (count / 1000).toFixed(1) });
    }
    return t('channels.message_views_count', { count });
  };

  /**
   * Format timestamp as relative time (e.g., "2 hours ago")
   */
  const formatTimestamp = (timestamp: string): string => {
    return dayjs(timestamp).fromNow();
  };

  /**
   * Handle view count button click
   * Fetches latest statistics and opens modal
   */
  const handleClick = async () => {
    await fetchStats();
    setShowModal(true);
  };

  /**
   * Handle modal close
   */
  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <button 
        className="view-count-button"
        onClick={handleClick}
        aria-label={`View statistics: ${formatCount(stats.viewCount)}`}
        type="button"
      >
        <Icon src={Icons.Eye} size="50" aria-hidden="true" />
        <span className="view-count-button__text">{formatCount(stats.viewCount)}</span>
      </button>

      {showModal && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                clickOutsideDeactivates: true,
                onDeactivate: handleCloseModal,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Modal size="500" variant="Background">
                <Box direction="Column" gap="300" style={{ padding: '20px' }}>
                  {/* Modal Header */}
                  <Box justifyContent="SpaceBetween" alignItems="Center">
                    <Text size="H4" priority="400">
                      View Statistics
                    </Text>
                    <IconButton
                      variant="Surface"
                      size="300"
                      radii="300"
                      onClick={handleCloseModal}
                      aria-label="Close"
                    >
                      <Icon src={Icons.Cross} size="50" />
                    </IconButton>
                  </Box>

                  {/* Loading State */}
                  {loading && (
                    <Box justifyContent="Center" alignItems="Center" style={{ padding: '40px 0' }}>
                      <Spinner size="600" />
                    </Box>
                  )}

                  {/* Error State */}
                  {error && !loading && (
                    <Box 
                      direction="Column" 
                      gap="200" 
                      alignItems="Center"
                      style={{ padding: '20px' }}
                      className="view-stats-error"
                    >
                      <Icon src={Icons.Warning} size="400" />
                      <Text size="T300" priority="300" align="Center">
                        {error}
                      </Text>
                    </Box>
                  )}

                  {/* Viewer List */}
                  {!loading && !error && stats && (
                    <Box direction="Column" gap="100">
                      <Text size="T300" priority="300">
                        {stats.viewCount} {stats.viewCount === 1 ? 'view' : 'views'}
                      </Text>
                      
                      <div className="viewer-list">
                        {stats.viewers.length === 0 ? (
                          <Box 
                            justifyContent="Center" 
                            alignItems="Center"
                            style={{ padding: '40px 0' }}
                          >
                            <Text size="T300" priority="300">
                              No viewers yet
                            </Text>
                          </Box>
                        ) : (
                          stats.viewers.map((viewer) => (
                            <div key={viewer.user_id} className="viewer-item">
                              <Avatar size="300">
                                {viewer.avatar_url ? (
                                  <AvatarImage src={viewer.avatar_url} alt={viewer.username} />
                                ) : null}
                                <AvatarFallback>
                                  <Text size="T300">
                                    {viewer.username.slice(0, 2).toUpperCase()}
                                  </Text>
                                </AvatarFallback>
                              </Avatar>
                              <div className="viewer-info">
                                <Text size="T300" priority="400" className="viewer-name">
                                  {viewer.username}
                                </Text>
                                <Text size="T200" priority="300" className="viewer-time">
                                  {formatTimestamp(viewer.viewed_at)}
                                </Text>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Box>
                  )}
                </Box>
              </Modal>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
    </>
  );
}
