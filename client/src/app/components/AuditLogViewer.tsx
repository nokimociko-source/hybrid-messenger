import React from 'react';
import { Icon, Icons, Spinner, Scroll } from 'folds';
import { useAuditLog } from '../hooks/useAuditLog';

interface AuditLogViewerProps {
  roomId: string;
  onClose: () => void;
}

export function AuditLogViewer({ roomId, onClose }: AuditLogViewerProps) {
  const { entries, loading, getActionText } = useAuditLog(roomId);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'member_added':
        return '➕';
      case 'member_removed':
        return '➖';
      case 'member_promoted':
        return '⬆️';
      case 'member_demoted':
        return '⬇️';
      case 'room_created':
        return '🎉';
      case 'room_updated':
        return '✏️';
      case 'invite_link_created':
        return '🔗';
      case 'invite_link_revoked':
        return '🚫';
      case 'message_pinned':
        return '📌';
      case 'message_unpinned':
        return '📍';
      case 'poll_created':
        return '📊';
      case 'topic_created':
        return '💬';
      default:
        return '📝';
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.98) 0%, rgba(20, 20, 20, 0.98) 100%)',
          border: '1px solid rgba(0, 242, 255, 0.3)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#fff' }}>
            История изменений
          </h2>
          <div onClick={onClose} style={{ cursor: 'pointer', color: '#888' }}>
            <Icon size="200" src={Icons.Cross} />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spinner variant="Secondary" />
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            История пуста
          </div>
        ) : (
          <Scroll style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 242, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                    {/* Icon */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(0, 242, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0,
                      }}
                    >
                      {getActionIcon(entry.action)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: '#fff', marginBottom: '4px' }}>
                        {getActionText(entry)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {formatDate(entry.created_at)}
                      </div>

                      {/* Details */}
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '8px',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#aaa',
                            fontFamily: 'monospace',
                          }}
                        >
                          {JSON.stringify(entry.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Scroll>
        )}
      </div>
    </div>
  );
}
