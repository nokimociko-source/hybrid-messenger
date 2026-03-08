// Компонент для отображения превью ссылки в сообщении

import React, { useState } from 'react';
import { Icon, Icons } from 'folds';
import type { LinkPreview } from '../types/mediaEnhancements';
import { getDomain, supportsEmbed } from '../utils/linkPreviewParser';
import { sanitizeEmbedHtml } from '../utils/sanitize';
import './PreviewCard.css';

interface PreviewCardProps {
  preview: LinkPreview;
  onClick?: () => void;
  showEmbed?: boolean;
}

export function PreviewCard({ preview, onClick, showEmbed = false }: PreviewCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showEmbedContent, setShowEmbedContent] = useState(showEmbed);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(preview.url, '_blank', 'noopener,noreferrer');
    }
  };

  const domain = getDomain(preview.url);
  const hasEmbed = supportsEmbed(preview.provider) && preview.embedHtml;
  const safeEmbedHtml = preview.embedHtml ? sanitizeEmbedHtml(preview.embedHtml) : '';

  return (
    <div className="preview-card">
      <div 
        className="preview-card__content"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        {preview.imageUrl && !imageError && (
          <div className="preview-card__image-container">
            <img
              src={preview.imageUrl}
              alt=""
              className="preview-card__image"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            {preview.provider && (
              <div className="preview-card__provider-badge">
                {getProviderIcon(preview.provider)}
              </div>
            )}
          </div>
        )}

        <div className="preview-card__info">
          {preview.siteName && (
            <div className="preview-card__site">
              {preview.faviconUrl && (
                <img
                  src={preview.faviconUrl}
                  alt=""
                  className="preview-card__favicon"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <span className="preview-card__site-name">{preview.siteName}</span>
            </div>
          )}

          {preview.title && (
            <h4 className="preview-card__title">{preview.title}</h4>
          )}

          {preview.description && (
            <p className="preview-card__description">{preview.description}</p>
          )}

          <div className="preview-card__url">
            <Icon src={Icons.Link} size="100" />
            <span>{domain || preview.url}</span>
          </div>
        </div>

        <div className="preview-card__action">
          <Icon src={Icons.External} />
        </div>
      </div>

      {hasEmbed && (
        <div className="preview-card__embed-toggle">
          <button
            className="preview-card__embed-button"
            onClick={(e) => {
              e.stopPropagation();
              setShowEmbedContent(!showEmbedContent);
            }}
          >
            <Icon src={showEmbedContent ? Icons.ChevronTop : Icons.ChevronBottom} />
            {showEmbedContent ? 'Скрыть' : 'Показать'} встроенный контент
          </button>
        </div>
      )}

      {showEmbedContent && hasEmbed && (
        <div 
          className="preview-card__embed"
          dangerouslySetInnerHTML={{ __html: safeEmbedHtml }}
        />
      )}
    </div>
  );
}

function getProviderIcon(provider: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    youtube: '▶️',
    twitter: '🐦',
    instagram: '📷',
    facebook: '👍',
    vimeo: '🎬',
    github: '💻',
    reddit: '🤖',
    linkedin: '💼',
  };

  return icons[provider] || '🔗';
}

interface PreviewCardSkeletonProps {
  hasImage?: boolean;
}

export function PreviewCardSkeleton({ hasImage = true }: PreviewCardSkeletonProps) {
  return (
    <div className="preview-card preview-card--skeleton">
      <div className="preview-card__content">
        {hasImage && (
          <div className="preview-card__image-container">
            <div className="preview-card__skeleton-image" />
          </div>
        )}

        <div className="preview-card__info">
          <div className="preview-card__skeleton-site" />
          <div className="preview-card__skeleton-title" />
          <div className="preview-card__skeleton-description" />
          <div className="preview-card__skeleton-url" />
        </div>
      </div>
    </div>
  );
}
