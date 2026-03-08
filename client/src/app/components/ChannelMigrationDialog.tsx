import React, { useState } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { supabase } from '../../supabaseClient';

interface ChannelMigrationDialogProps {
  roomId: string;
  roomName: string;
  memberCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChannelMigrationDialog({
  roomId,
  roomName,
  memberCount,
  onClose,
  onSuccess,
}: ChannelMigrationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('migrate_group_to_channel', {
        p_room_id: roomId,
        p_user_id: user.id,
      });

      if (rpcError) {
        setError(rpcError.message);
      } else if (data?.success) {
        onSuccess();
        onClose();
      } else {
        setError(data?.error || 'Migration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
          border: '1px solid rgba(0, 242, 255, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          minWidth: '500px',
          maxWidth: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#fff',
              margin: 0,
            }}
          >
            Convert to Channel
          </h3>
          <div
            onClick={onClose}
            style={{
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '24px',
              lineHeight: '1',
              padding: '4px 8px',
            }}
          >
            ×
          </div>
        </div>

        {/* Warning */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            color: '#ffc107',
          }}
        >
          <Icon src={Icons.Warning} size="400" />
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Warning:</strong>
            <span style={{ fontSize: '14px' }}>This action cannot be undone.</span>
          </div>
        </div>

        {/* Migration Info */}
        <div>
          <h4
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#fff',
              marginBottom: '12px',
            }}
          >
            What will happen:
          </h4>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <li
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <span style={{ color: '#00f2ff', marginTop: '2px' }}>•</span>
              <span>"{roomName}" will become a broadcast channel</span>
            </li>
            <li
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <span style={{ color: '#00f2ff', marginTop: '2px' }}>•</span>
              <span>{memberCount} members will become subscribers</span>
            </li>
            <li
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <span style={{ color: '#00f2ff', marginTop: '2px' }}>•</span>
              <span>Only admins will be able to post messages</span>
            </li>
            <li
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <span style={{ color: '#00f2ff', marginTop: '2px' }}>•</span>
              <span>All message history will be preserved</span>
            </li>
            <li
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <span style={{ color: '#00f2ff', marginTop: '2px' }}>•</span>
              <span>Current admins will keep their posting rights</span>
            </li>
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '14px',
            }}
          >
            <Icon src={Icons.Cross} size="400" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleMigrate}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? 'rgba(255, 77, 77, 0.3)' : 'rgba(255, 77, 77, 0.2)',
              border: '1px solid rgba(255, 77, 77, 0.5)',
              borderRadius: '8px',
              color: loading ? 'rgba(255, 255, 255, 0.5)' : '#ff4d4d',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {loading && <Spinner size="200" variant="Secondary" />}
            Convert to Channel
          </button>
        </div>
      </div>
    </div>
  );
}
