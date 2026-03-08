import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Icon, Icons } from 'folds';
import { ChatFolder } from '../types/chatOrganization';

interface FolderSettingsProps {
  open: boolean;
  folder?: ChatFolder;
  allRooms: any[];
  selectedRoomIds: string[];
  onClose: () => void;
  onSave: (name: string, icon: string, roomIds: string[]) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function FolderSettings({
  open,
  folder,
  allRooms,
  selectedRoomIds,
  onClose,
  onSave,
  onDelete,
}: FolderSettingsProps) {
  const [folderName, setFolderName] = useState('');
  const [folderIcon, setFolderIcon] = useState('📁');
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const availableIcons = ['📁', '💼', '🏠', '⭐', '❤️', '🎮', '📚', '🎵', '🎨', '⚡'];

  useEffect(() => {
    if (open) {
      if (folder) {
        setFolderName(folder.name);
        setFolderIcon(folder.icon || '📁');
      } else {
        setFolderName('');
        setFolderIcon('📁');
      }
      setSelectedChats(new Set(selectedRoomIds));
      setSaving(false);
    }
  }, [open, folder, selectedRoomIds]);

  const toggleChat = (roomId: string) => {
    const newSelected = new Set(selectedChats);
    if (newSelected.has(roomId)) {
      newSelected.delete(roomId);
    } else {
      newSelected.add(roomId);
    }
    setSelectedChats(newSelected);
  };

  const handleSave = async () => {
    if (!folderName.trim()) {
      alert('Введите название папки');
      return;
    }

    try {
      setSaving(true);
      await onSave(folderName.trim(), folderIcon, Array.from(selectedChats));
      onClose();
    } catch (error) {
      logger.error('Failed to save folder:', error);
      alert('Не удалось сохранить папку');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      logger.error('Failed to delete folder:', error);
      alert('Не удалось удалить папку');
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
              {folder ? 'Настройки папки' : 'Новая папка'}
            </div>
            {folder && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff4444',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  padding: '4px',
                }}
                title="Удалить папку"
              >
                <Icon size="200" src={Icons.Delete} />
              </button>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {/* Folder name */}
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="folder-settings-name-input" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#ccc',
                marginBottom: '8px',
              }}>
                Название папки
              </label>
              <input
                id="folder-settings-name-input"
                name="folder-name"
                type="text"
                placeholder="Введите название"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                maxLength={50}
                autoFocus
                disabled={saving}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Icon selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#ccc',
                marginBottom: '8px',
              }}>
                Иконка
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFolderIcon(icon)}
                    disabled={saving}
                    style={{
                      fontSize: '24px',
                      padding: '8px',
                      borderRadius: '8px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      backgroundColor: folderIcon === icon ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: folderIcon === icon ? '2px solid #00f2ff' : '2px solid transparent',
                      transition: 'all 0.2s',
                      minWidth: '48px',
                      minHeight: '48px',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat list */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#ccc',
                marginBottom: '8px',
              }}>
                Включить чаты ({selectedChats.size})
              </label>
              <div style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}>
                {allRooms.map((room) => {
                  const isSelected = selectedChats.has(room.id);
                  return (
                    <div
                      key={room.id}
                      onClick={() => toggleChat(room.id)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backgroundColor: isSelected ? 'rgba(0, 242, 255, 0.1)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `2px solid ${isSelected ? '#00f2ff' : '#666'}`,
                        backgroundColor: isSelected ? '#00f2ff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isSelected && <span style={{ color: '#000', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{
                          color: '#fff',
                          fontSize: '14px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {room.displayName || room.name || 'Безымянный чат'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'transparent',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer',
                minWidth: '100px',
              }}
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !folderName.trim()}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: (!folderName.trim() || saving) ? '#666' : '#00f2ff',
                color: '#000',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: (!folderName.trim() || saving) ? 'not-allowed' : 'pointer',
                minWidth: '100px',
              }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
              border: '1px solid rgba(255, 68, 68, 0.3)',
              boxShadow: '0 8px 32px rgba(255, 68, 68, 0.2)',
            }}
          >
            {/* Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <span style={{ fontSize: '32px' }}>🗑️</span>
            </div>

            {/* Title */}
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '12px',
            }}>
              Удалить папку?
            </div>

            {/* Description */}
            <div style={{
              fontSize: '14px',
              color: '#999',
              textAlign: 'center',
              marginBottom: '32px',
              lineHeight: '1.5',
            }}>
              Папка "{folder?.name}" будет удалена.<br />
              Чаты останутся в списке.
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  if (!saving) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: saving ? '#666' : '#ff4444',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.backgroundColor = '#ff3333';
                }}
                onMouseLeave={(e) => {
                  if (!saving) e.currentTarget.style.backgroundColor = '#ff4444';
                }}
              >
                {saving ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
