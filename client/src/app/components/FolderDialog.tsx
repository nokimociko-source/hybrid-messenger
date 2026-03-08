import React, { useState, useEffect } from 'react';
import { ChatFolder } from '../types/chatOrganization';

interface FolderDialogProps {
  open: boolean;
  folder?: ChatFolder;
  onClose: () => void;
  onSave: (name: string, icon?: string, color?: string) => Promise<void>;
}

export function FolderDialog({ open, folder, onClose, onSave }: FolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [folderIcon, setFolderIcon] = useState('📁');
  const [folderColor, setFolderColor] = useState('#00f2ff');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Available icons for folders
  const availableIcons = ['📁', '💼', '🏠', '⭐', '❤️', '🎮', '📚', '🎵', '🎨', '⚡'];

  // Available colors for folders
  const availableColors = [
    '#00f2ff', // cyan
    '#ff0080', // pink
    '#00ff00', // green
    '#ffaa00', // orange
    '#8b5cf6', // purple
    '#ef4444', // red
    '#3b82f6', // blue
    '#f59e0b', // amber
  ];

  // Initialize form when dialog opens or folder changes
  useEffect(() => {
    if (open) {
      if (folder) {
        setFolderName(folder.name);
        setFolderIcon(folder.icon || '📁');
        setFolderColor(folder.color || '#00f2ff');
      } else {
        setFolderName('');
        setFolderIcon('📁');
        setFolderColor('#00f2ff');
      }
      setError(null);
      setSaving(false);
    }
  }, [open, folder]);

  const handleSave = async () => {
    // Validate folder name
    if (!folderName.trim()) {
      setError('Имя папки не может быть пустым');
      return;
    }

    if (folderName.length > 50) {
      setError('Имя папки не может превышать 50 символов');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(folderName.trim(), folderIcon, folderColor);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить папку');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saving) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleCancel}
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
        {/* Dialog */}
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#fff',
            }}>
              {folder ? 'Редактировать папку' : 'Новая папка'}
            </div>
          </div>

          {/* Content */}
          <div style={{
            padding: '24px',
          }}>
            {/* Error message */}
            {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            {/* Folder name input */}
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="folder-name-input" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#ccc',
                marginBottom: '8px',
              }}>
                Название папки
              </label>
              <input
                id="folder-name-input"
                name="folder-name"
                type="text"
                placeholder="Введите название папки"
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
                  minHeight: '44px',
                  transition: 'border-color 0.2s',
                }}
                className="folder-name-input"
              />
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginTop: '4px',
                textAlign: 'right',
              }}>
                {folderName.length}/50
              </div>
            </div>

            {/* Icon selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#ccc',
                marginBottom: '8px',
              }}>
                Иконка
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: saving ? 0.5 : 1,
                    }}
                    className="icon-selector"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#ccc',
                marginBottom: '8px',
              }}>
                Цвет
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFolderColor(color)}
                    disabled={saving}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      backgroundColor: color,
                      border: folderColor === color ? '3px solid #fff' : '3px solid transparent',
                      transition: 'all 0.2s',
                      boxShadow: folderColor === color ? '0 0 0 2px #000' : 'none',
                      opacity: saving ? 0.5 : 1,
                    }}
                    className="color-selector"
                    aria-label={`Цвет ${color}`}
                  />
                ))}
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
              onClick={handleCancel}
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
                transition: 'background 0.2s',
                minHeight: '44px',
                minWidth: '100px',
                opacity: saving ? 0.5 : 1,
              }}
              className="cancel-button"
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
                transition: 'opacity 0.2s',
                minHeight: '44px',
                minWidth: '100px',
              }}
              className="save-button"
            >
              {saving ? 'Сохранение...' : (folder ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .folder-name-input:focus {
          border-color: #00f2ff;
        }
        
        .icon-selector:hover:not(:disabled) {
          background-color: rgba(0, 242, 255, 0.1);
          transform: scale(1.05);
        }
        
        .color-selector:hover:not(:disabled) {
          transform: scale(1.1);
        }
        
        .cancel-button:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.05);
        }
        
        .save-button:hover:not(:disabled) {
          opacity: 0.9;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .folder-dialog {
            margin: 8px;
          }
        }
        
        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          .icon-selector,
          .color-selector,
          .cancel-button,
          .save-button {
            -webkit-tap-highlight-color: transparent;
          }
        }
        
        /* Smooth dialog animation */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
