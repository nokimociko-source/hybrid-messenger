import { logger } from '../utils/logger';
import React, { useState, memo, useEffect } from 'react';
import { StickerPack } from '../hooks/useStickerPacks';
import { ImageCache } from '../utils/ImageCache';

interface StickerPanelProps {
  packs: StickerPack[];
  onStickerSelect: (packId: string, stickerId: string) => void;
  onPackReorder?: (packIds: string[]) => void;
  onPackDelete?: (packId: string) => void;
  loading?: boolean;
  error?: Error | null;
  uploadPack: (files: File[], metadata: { name: string; author: string }) => Promise<string>;
}

export const StickerPanel = memo(function StickerPanel({ 
  packs, 
  onStickerSelect, 
  onPackReorder, 
  onPackDelete,
  loading = false,
  error = null,
  uploadPack
}: StickerPanelProps) {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(
    packs.length > 0 ? packs[0].id : null
  );
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);

  const selectedPack = packs.find(p => p.id === selectedPackId);

  // Preload images for selected pack
  useEffect(() => {
    if (selectedPack) {
      selectedPack.stickers.forEach(sticker => {
        if (!ImageCache.has(sticker.image_url)) {
          ImageCache.preload(sticker.image_url).catch(err => {
            logger.error('Failed to preload sticker:', err);
          });
        }
      });
    }
  }, [selectedPack]);

  const handleImageLoad = (imageUrl: string) => {
    setLoadedImages(prev => new Set(prev).add(imageUrl));
  };

  // Show loading state
  if (loading || uploading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '12px',
        minHeight: '200px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(0, 242, 255, 0.2)',
          borderTop: '3px solid rgba(0, 242, 255, 0.8)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {uploading ? 'Загрузка стикер-пака...' : 'Загрузка стикеров...'}
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '12px',
        minHeight: '200px'
      }}>
        <div style={{ 
          fontSize: '48px',
          opacity: 0.6
        }}>
          ⚠️
        </div>
        <div style={{ 
          color: 'rgba(255, 100, 100, 0.8)', 
          fontSize: '14px',
          textAlign: 'center',
          fontWeight: 500
        }}>
          Ошибка загрузки стикеров
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.4)', 
          fontSize: '12px',
          textAlign: 'center',
          maxWidth: '250px'
        }}>
          {error.message || 'Не удалось загрузить стикер-паки'}
        </div>
      </div>
    );
  }

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/webp,image/png';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) return;

      const packName = prompt('Название стикер-пака:');
      if (!packName) return;

      const author = prompt('Автор:', 'Вы');
      if (!author) return;

      setUploading(true);
      try {
        await uploadPack(files, { name: packName, author });
      } catch (error) {
        logger.error('Upload error:', error);
        alert(`Ошибка загрузки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  if (packs.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '12px',
        minHeight: '200px'
      }}>
        <div style={{ 
          fontSize: '48px',
          opacity: 0.6
        }}>
          📦
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          fontSize: '14px',
          textAlign: 'center'
        }}>
          У вас пока нет стикер-паков
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.4)', 
          fontSize: '12px',
          textAlign: 'center',
          marginBottom: '12px'
        }}>
          Добавьте стикеры, чтобы использовать их в чатах
        </div>
        <button
          onClick={handleUploadClick}
          disabled={uploading}
          style={{
            padding: '10px 20px',
            background: uploading 
              ? 'rgba(100, 100, 100, 0.2)' 
              : 'linear-gradient(135deg, rgba(0, 242, 255, 0.2) 0%, rgba(0, 200, 255, 0.2) 100%)',
            border: uploading 
              ? '1px solid rgba(100, 100, 100, 0.4)' 
              : '1px solid rgba(0, 242, 255, 0.4)',
            borderRadius: '8px',
            color: uploading 
              ? 'rgba(255, 255, 255, 0.4)' 
              : 'rgba(0, 242, 255, 0.9)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 242, 255, 0.3) 0%, rgba(0, 200, 255, 0.3) 100%)';
              e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 242, 255, 0.2) 0%, rgba(0, 200, 255, 0.2) 100%)';
              e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.4)';
            }
          }}
        >
          + Добавить стикер-пак
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Pack selector tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        overflowX: 'auto',
        overflowY: 'hidden'
      }}
      className="sticker-pack-tabs-scroll"
      >
        {/* Add pack button */}
        <div
          onClick={uploading ? undefined : handleUploadClick}
          style={{
            minWidth: '48px',
            height: '48px',
            borderRadius: '8px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            border: uploading 
              ? '2px dashed rgba(100, 100, 100, 0.4)' 
              : '2px dashed rgba(0, 242, 255, 0.4)',
            background: uploading 
              ? 'rgba(100, 100, 100, 0.05)' 
              : 'rgba(0, 242, 255, 0.05)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: uploading 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'rgba(0, 242, 255, 0.6)',
            opacity: uploading ? 0.5 : 1
          }}
          title={uploading ? 'Загрузка...' : 'Добавить стикер-пак'}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = 'rgba(0, 242, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = 'rgba(0, 242, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.4)';
            }
          }}
        >
          +
        </div>
        
        {packs.map(pack => (
          <div
            key={pack.id}
            onClick={() => setSelectedPackId(pack.id)}
            style={{
              minWidth: '48px',
              height: '48px',
              borderRadius: '8px',
              cursor: 'pointer',
              border: selectedPackId === pack.id 
                ? '2px solid rgba(0, 242, 255, 0.6)' 
                : '2px solid transparent',
              background: selectedPackId === pack.id 
                ? 'rgba(0, 242, 255, 0.1)' 
                : 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s',
              overflow: 'hidden',
              position: 'relative'
            }}
            title={pack.name}
            onMouseEnter={(e) => {
              if (selectedPackId !== pack.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPackId !== pack.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }
            }}
          >
            <img
              src={pack.preview_url}
              alt={pack.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Sticker grid */}
      {selectedPack && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px'
        }}
        className="sticker-grid-scroll"
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px'
          }}>
            {selectedPack.stickers.map(sticker => (
              <div
                key={sticker.id}
                onClick={() => onStickerSelect(selectedPack.id, sticker.id)}
                style={{
                  aspectRatio: '1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 242, 255, 0.15)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {!loadedImages.has(sticker.image_url) && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.3)',
                    fontSize: '12px'
                  }}>
                    ...
                  </div>
                )}
                <img
                  src={sticker.image_url}
                  alt={sticker.emoji_shortcode || 'sticker'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: loadedImages.has(sticker.image_url) ? 1 : 0,
                    transition: 'opacity 0.2s'
                  }}
                  loading="lazy"
                  onLoad={() => handleImageLoad(sticker.image_url)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .sticker-pack-tabs-scroll::-webkit-scrollbar {
          display: none;
        }
        .sticker-pack-tabs-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .sticker-grid-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .sticker-grid-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sticker-grid-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 242, 255, 0.2);
          borderRadius: 10px;
        }
        .sticker-grid-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 242, 255, 0.4);
        }
        .sticker-grid-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 242, 255, 0.2) transparent;
        }
      `}</style>
    </div>
  );
});
