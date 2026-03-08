// Компонент для отображения медиа-альбома в виде адаптивной сетки

import React, { useState, useCallback } from 'react';
import { Icon, Icons } from 'folds';
import type { MediaItem } from '../types/mediaEnhancements';
import { getThumbnailUrl } from '../utils/albumSerializer';
import './MediaGrid.css';

interface MediaGridProps {
  mediaItems: MediaItem[];
  onMediaClick?: (index: number) => void;
  maxColumns?: number;
  gap?: number;
}

import { EncryptedMedia } from '../components/EncryptedMedia';

export function MediaGrid({
  mediaItems,
  onMediaClick,
  maxColumns = 3,
  gap = 4
}: MediaGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleMediaClick = useCallback((index: number) => {
    if (onMediaClick) {
      onMediaClick(index);
    } else {
      setLightboxIndex(index);
    }
  }, [onMediaClick]);

  const handleImageError = useCallback((itemId: string) => {
    setImageErrors(prev => new Set(prev).add(itemId));
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return;

    if (direction === 'prev') {
      setLightboxIndex(prev =>
        prev === null ? null : prev > 0 ? prev - 1 : mediaItems.length - 1
      );
    } else {
      setLightboxIndex(prev =>
        prev === null ? null : prev < mediaItems.length - 1 ? prev + 1 : 0
      );
    }
  }, [lightboxIndex, mediaItems.length]);

  const getGridLayout = () => {
    const count = mediaItems.length;

    if (count === 1) return 'media-grid--single';
    if (count === 2) return 'media-grid--double';
    if (count === 3) return 'media-grid--triple';
    if (count === 4) return 'media-grid--quad';
    return 'media-grid--multi';
  };

  return (
    <>
      <div
        className={`media-grid ${getGridLayout()}`}
        style={{ gap: `${gap}px` }}
      >
        {mediaItems.map((item, index) => (
          <div
            key={item.id}
            className="media-grid__item"
            onClick={() => handleMediaClick(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleMediaClick(index);
              }
            }}
          >
            {item.type === 'video' ? (
              <div className="media-grid__video">
                <EncryptedMedia
                  url={item.url}
                  type="video"
                  roomId={item.roomId}
                  version={item.version}
                  mimeType={item.mimeType}
                  encrypted={typeof item.version === 'number'}
                  className="media-grid__video-element"
                />
                <div className="media-grid__video-overlay">
                  <Icon src={Icons.Play} size="400" />
                </div>
              </div>
            ) : (
              <EncryptedMedia
                url={imageErrors.has(item.id) ? item.url : (item.thumbnailUrl || item.url)}
                type="image"
                roomId={item.roomId}
                version={item.version}
                className="media-grid__image"
              // No onError for EncryptedMedia yet, but it handles its own failures
              />
            )}

            {mediaItems.length > 1 && (
              <div className="media-grid__counter">
                {index + 1}/{mediaItems.length}
              </div>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <MediaLightbox
          items={mediaItems}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
        />
      )}
    </>
  );
}

interface MediaLightboxProps {
  items: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

function MediaLightbox({ items, currentIndex, onClose, onNavigate }: MediaLightboxProps) {
  const currentItem = items[currentIndex];

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      onNavigate('prev');
    } else if (e.key === 'ArrowRight') {
      onNavigate('next');
    }
  }, [onClose, onNavigate]);

  return (
    <div
      className="media-lightbox"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabIndex={0}
    >
      <div className="media-lightbox__header">
        <span className="media-lightbox__counter">
          {currentIndex + 1} / {items.length}
        </span>
        <button
          className="media-lightbox__close"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon src={Icons.Cross} />
        </button>
      </div>

      <div className="media-lightbox__content" onClick={(e) => e.stopPropagation()}>
        {currentItem.type === 'video' ? (
          <EncryptedMedia
            url={currentItem.url}
            type="video"
            roomId={currentItem.roomId}
            version={currentItem.version}
            mimeType={currentItem.mimeType}
            encrypted={typeof currentItem.version === 'number'}
            controls
            autoPlay
            className="media-lightbox__video"
          />
        ) : (
          <EncryptedMedia
            url={currentItem.url}
            type="image"
            roomId={currentItem.roomId}
            version={currentItem.version}
            className="media-lightbox__image"
          />
        )}
      </div>

      {items.length > 1 && (
        <>
          <button
            className="media-lightbox__nav media-lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('prev');
            }}
            aria-label="Previous"
          >
            <Icon src={Icons.ChevronLeft} />
          </button>
          <button
            className="media-lightbox__nav media-lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('next');
            }}
            aria-label="Next"
          >
            <Icon src={Icons.ChevronRight} />
          </button>
        </>
      )}
    </div>
  );
}
