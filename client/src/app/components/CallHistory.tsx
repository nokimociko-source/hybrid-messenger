import React from 'react';
import { Icon, Icons, Scroll } from 'folds';
import { useCallHistory, CallHistoryEntry } from '../hooks/useCallHistory';

type CallHistoryProps = {
  roomId?: string;
  onClose: () => void;
  onStartCall?: (type: 'audio' | 'video') => void;
};

export function CallHistory({ roomId, onClose, onStartCall }: CallHistoryProps) {
  const { callHistory, loading } = useCallHistory(roomId);

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCallIcon = (entry: CallHistoryEntry) => {
    const isVideo = entry.call_type === 'video';
    const baseIcon = isVideo ? Icons.Play : Icons.Phone;

    switch (entry.status) {
      case 'missed':
        return { icon: baseIcon, color: '#ff4444' };
      case 'rejected':
        return { icon: baseIcon, color: '#ff8800' };
      case 'answered':
      case 'ended':
        return { icon: baseIcon, color: '#00f2ff' };
      default:
        return { icon: baseIcon, color: '#888' };
    }
  };

  const getStatusText = (entry: CallHistoryEntry): string => {
    switch (entry.status) {
      case 'missed':
        return 'Пропущенный';
      case 'rejected':
        return 'Отклонён';
      case 'answered':
      case 'ended':
        return entry.duration ? formatDuration(entry.duration) : 'Завершён';
      default:
        return '';
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '100%',
      maxWidth: '400px',
      height: '100%',
      backgroundColor: '#0f0f0f',
      borderLeft: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100
    }}>
      {/* Header */}
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div onClick={onClose} style={{ cursor: 'pointer', color: '#888' }}>
          <Icon size="200" src={Icons.Cross} />
        </div>
        <div style={{ flexGrow: 1, fontSize: '16px', fontWeight: '600', color: '#fff' }}>
          История звонков
        </div>
        {onStartCall && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <div
              onClick={() => onStartCall('audio')}
              style={{
                cursor: 'pointer',
                color: '#00f2ff',
                padding: '8px',
                borderRadius: '8px',
                background: 'rgba(0, 242, 255, 0.1)',
                transition: 'all 0.2s'
              }}
              title="Аудиозвонок"
            >
              <Icon size="200" src={Icons.Phone} />
            </div>
            <div
              onClick={() => onStartCall('video')}
              style={{
                cursor: 'pointer',
                color: '#00f2ff',
                padding: '8px',
                borderRadius: '8px',
                background: 'rgba(0, 242, 255, 0.1)',
                transition: 'all 0.2s'
              }}
              title="Видеозвонок"
            >
              <Icon size="200" src={Icons.Play} />
            </div>
          </div>
        )}
      </div>

      {/* Call History List */}
      <Scroll style={{ flexGrow: 1, padding: '8px' }}>
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            Загрузка...
          </div>
        )}

        {!loading && callHistory.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📞</div>
            <div>История звонков пуста</div>
          </div>
        )}

        {callHistory.map((entry) => {
          const { icon, color } = getCallIcon(entry);

          return (
            <div
              key={entry.id}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              className="call-history-item"
            >
              {/* Icon */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: `${color}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                flexShrink: 0
              }}>
                <Icon size="200" src={icon} />
              </div>

              {/* Info */}
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {entry.caller?.username || 'Неизвестно'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: entry.status === 'missed' ? '#ff4444' : '#888'
                }}>
                  {getStatusText(entry)}
                </div>
              </div>

              {/* Date */}
              <div style={{
                fontSize: '11px',
                color: '#666',
                flexShrink: 0
              }}>
                {formatDate(entry.started_at)}
              </div>
            </div>
          );
        })}
      </Scroll>

      <style>{`
        .call-history-item:hover {
          background-color: rgba(0, 242, 255, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
