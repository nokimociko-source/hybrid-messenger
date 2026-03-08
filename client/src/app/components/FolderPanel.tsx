import React, { useState } from 'react';
import { Icon, Icons, Scroll } from 'folds';
import { useChatFolders } from '../hooks/useChatFolders';
import { ChatFolder } from '../types/chatOrganization';

interface FolderPanelProps {
  selectedFolderId?: string;
  onFolderSelect: (folderId: string | null) => void;
}

export function FolderPanel({ selectedFolderId, onFolderSelect }: FolderPanelProps) {
  const { folders, loading, createFolder, updateFolder, deleteFolder } = useChatFolders();
  const [isCreating, setIsCreating] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ChatFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderIcon, setFolderIcon] = useState('📁');
  const [folderColor, setFolderColor] = useState('#00f2ff');
  const [error, setError] = useState<string | null>(null);

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

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      setError('Имя папки не может быть пустым');
      return;
    }

    try {
      setError(null);
      await createFolder(folderName.trim(), folderIcon, folderColor);
      setIsCreating(false);
      setFolderName('');
      setFolderIcon('📁');
      setFolderColor('#00f2ff');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать папку');
    }
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder) return;
    
    if (!folderName.trim()) {
      setError('Имя папки не может быть пустым');
      return;
    }

    try {
      setError(null);
      await updateFolder(editingFolder.id, {
        name: folderName.trim(),
        icon: folderIcon,
        color: folderColor,
      });
      setEditingFolder(null);
      setFolderName('');
      setFolderIcon('📁');
      setFolderColor('#00f2ff');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить папку');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту папку? Чаты не будут удалены.')) {
      return;
    }

    try {
      setError(null);
      await deleteFolder(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить папку');
    }
  };

  const startEditing = (folder: ChatFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderIcon(folder.icon || '📁');
    setFolderColor(folder.color || '#00f2ff');
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setIsCreating(false);
    setEditingFolder(null);
    setFolderName('');
    setFolderIcon('📁');
    setFolderColor('#00f2ff');
    setError(null);
  };

  if (loading) {
    return (
      <div style={{
        width: '100%',
        maxWidth: '300px',
        height: '100%',
        backgroundColor: '#0f0f0f',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
      }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '300px',
      height: '100%',
      backgroundColor: '#0f0f0f',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#fff',
        }}>
          Папки
        </div>
        <div
          onClick={() => {
            if (!isCreating && !editingFolder) {
              setIsCreating(true);
            }
          }}
          style={{
            cursor: 'pointer',
            color: '#00f2ff',
            padding: '8px',
            borderRadius: '8px',
            transition: 'background 0.2s',
          }}
          className="folder-add-button"
        >
          <Icon size="200" src={Icons.Plus} />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Folder list */}
      <Scroll style={{ flexGrow: 1, padding: '8px' }}>
        {/* All Chats - Default view */}
        <div
          onClick={() => onFolderSelect(null)}
          style={{
            padding: '12px 16px',
            marginBottom: '4px',
            backgroundColor: !selectedFolderId ? 'rgba(0, 242, 255, 0.1)' : 'transparent',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'background 0.2s',
            minHeight: '48px', // Touch-friendly
          }}
          className="folder-item"
        >
          <div style={{ fontSize: '20px' }}>💬</div>
          <div style={{
            fontSize: '14px',
            fontWeight: !selectedFolderId ? 'bold' : 'normal',
            color: !selectedFolderId ? '#00f2ff' : '#fff',
          }}>
            Все чаты
          </div>
        </div>

        {/* User folders */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            style={{
              marginBottom: '4px',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              onClick={() => onFolderSelect(folder.id)}
              style={{
                padding: '12px 16px',
                backgroundColor: selectedFolderId === folder.id ? 'rgba(0, 242, 255, 0.1)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background 0.2s',
                minHeight: '48px', // Touch-friendly
              }}
              className="folder-item"
            >
              <div style={{ fontSize: '20px' }}>{folder.icon || '📁'}</div>
              <div style={{
                flexGrow: 1,
                fontSize: '14px',
                fontWeight: selectedFolderId === folder.id ? 'bold' : 'normal',
                color: selectedFolderId === folder.id ? (folder.color || '#00f2ff') : '#fff',
              }}>
                {folder.name}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(folder);
                  }}
                  style={{
                    padding: '6px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#888',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  className="folder-action-button"
                >
                  <Icon size="100" src={Icons.Pencil} />
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id);
                  }}
                  style={{
                    padding: '6px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#888',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  className="folder-action-button"
                >
                  <Icon size="100" src={Icons.Cross} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </Scroll>

      {/* Create/Edit folder form */}
      {(isCreating || editingFolder) && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '16px',
          backgroundColor: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: '12px',
          }}>
            {editingFolder ? 'Редактировать папку' : 'Новая папка'}
          </div>

          {/* Folder name input */}
          <input
            type="text"
            placeholder="Название папки"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            maxLength={50}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '10px 12px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '12px',
              minHeight: '44px', // Touch-friendly
            }}
          />

          {/* Icon selector */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '12px',
              color: '#888',
              marginBottom: '8px',
            }}>
              Иконка
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {availableIcons.map((icon) => (
                <div
                  key={icon}
                  onClick={() => setFolderIcon(icon)}
                  style={{
                    fontSize: '24px',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: folderIcon === icon ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: folderIcon === icon ? '2px solid #00f2ff' : '2px solid transparent',
                    transition: 'all 0.2s',
                    minWidth: '44px', // Touch-friendly
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  className="icon-selector"
                >
                  {icon}
                </div>
              ))}
            </div>
          </div>

          {/* Color selector */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '12px',
              color: '#888',
              marginBottom: '8px',
            }}>
              Цвет
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {availableColors.map((color) => (
                <div
                  key={color}
                  onClick={() => setFolderColor(color)}
                  style={{
                    width: '44px', // Touch-friendly
                    height: '44px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: color,
                    border: folderColor === color ? '3px solid #fff' : '3px solid transparent',
                    transition: 'all 0.2s',
                    boxShadow: folderColor === color ? '0 0 0 2px #000' : 'none',
                  }}
                  className="color-selector"
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            gap: '8px',
          }}>
            <button
              onClick={cancelEditing}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'transparent',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                minHeight: '44px', // Touch-friendly
              }}
              className="cancel-button"
            >
              Отмена
            </button>
            <button
              onClick={editingFolder ? handleUpdateFolder : handleCreateFolder}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#00f2ff',
                color: '#000',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                minHeight: '44px', // Touch-friendly
              }}
              className="save-button"
            >
              {editingFolder ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .folder-item:hover {
          background-color: rgba(0, 242, 255, 0.05);
        }
        
        .folder-add-button:hover {
          background-color: rgba(0, 242, 255, 0.1);
        }
        
        .folder-action-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: #00f2ff;
        }
        
        .icon-selector:hover {
          background-color: rgba(0, 242, 255, 0.1);
        }
        
        .color-selector:hover {
          transform: scale(1.1);
        }
        
        .cancel-button:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
        
        .save-button:hover {
          opacity: 0.9;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .folder-panel {
            max-width: 100%;
          }
        }
        
        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          .folder-item,
          .folder-action-button,
          .icon-selector,
          .color-selector,
          button {
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}
