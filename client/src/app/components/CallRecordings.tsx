import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { supabase } from '../../supabaseClient';

interface Recording {
  id: string;
  room_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  duration: number | null;
  created_by: string;
  created_at: string;
  creator_username?: string;
}

interface CallRecordingsProps {
  roomId: string;
  onClose: () => void;
}

export function CallRecordings({ roomId, onClose }: CallRecordingsProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, [roomId]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('call_recordings')
        .select(`
          *,
          creator:created_by (
            id,
            email
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRecordings(data || []);
    } catch (err) {
      logger.error('❌ Ошибка загрузки записей:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecording = async (recordingId: string) => {
    if (!confirm('Удалить эту запись?')) return;

    try {
      const { error } = await supabase
        .from('call_recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      logger.info('✅ Запись удалена');
    } catch (err) {
      logger.error('❌ Ошибка удаления записи:', err);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Неизвестно';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Неизвестно';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} МБ`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        width: '100%', maxWidth: '800px',
        maxHeight: '80vh',
        backgroundColor: '#1a1a1a',
        borderRadius: '16px',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Заголовок */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: '24px', margin: '0' }}>
            📹 Записи звонков
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <Icon size="200" src={Icons.Cross} style={{ color: '#fff' }} />
          </button>
        </div>

        {/* Список записей */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Spinner size="200" />
            </div>
          ) : recordings.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#888'
            }}>
              Записей пока нет
            </div>
          ) : (
            recordings.map((recording) => (
              <div
                key={recording.id}
                style={{
                  backgroundColor: '#2a2a2a',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  border: '1px solid #333'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>
                    {formatDate(recording.created_at)}
                  </div>
                  <div style={{ color: '#888', fontSize: '14px', display: 'flex', gap: '16px' }}>
                    <span>⏱️ {formatDuration(recording.duration)}</span>
                    <span>💾 {formatFileSize(recording.file_size)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Воспроизвести */}
                  <button
                    onClick={() => setSelectedRecording(recording)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#00f2ff',
                      color: '#000',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    ▶️ Смотреть
                  </button>

                  {/* Скачать */}
                  <a
                    href={recording.file_url}
                    download={recording.file_name}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#333',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    ⬇️ Скачать
                  </a>

                  {/* Удалить */}
                  <button
                    onClick={() => deleteRecording(recording.id)}
                    style={{
                      padding: '8px',
                      backgroundColor: '#ff3333',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size="100" src={Icons.Delete} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Видеоплеер */}
      {selectedRecording && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '1200px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', margin: '0' }}>
                {formatDate(selectedRecording.created_at)}
              </h3>
              <button
                onClick={() => setSelectedRecording(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                <Icon size="200" src={Icons.Cross} style={{ color: '#fff' }} />
              </button>
            </div>

            <video
              src={selectedRecording.file_url}
              controls
              autoPlay
              style={{
                width: '100%',
                borderRadius: '12px',
                backgroundColor: '#000'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
