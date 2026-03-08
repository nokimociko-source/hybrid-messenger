// Утилиты для парсинга и обработки предпросмотра ссылок

import type { LinkPreview } from '../types/mediaEnhancements';

/**
 * Извлекает первый URL из текста
 */
export function extractFirstUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

/**
 * Извлекает все URL из текста
 */
export function extractAllUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return text.match(urlRegex) || [];
}

/**
 * Валидирует URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Проверяет, является ли URL локальным адресом
 */
export function isLocalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    const localPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

    if (localPatterns.includes(hostname)) {
      return true;
    }

    // Проверка приватных диапазонов IP
    const privateRanges = [/^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^192\.168\./];

    return privateRanges.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

/**
 * Определяет провайдера по URL
 */
export function detectProvider(url: string): string | null {
  const providers = [
    { pattern: /youtube\.com|youtu\.be/i, name: 'youtube' },
    { pattern: /twitter\.com|x\.com/i, name: 'twitter' },
    { pattern: /instagram\.com/i, name: 'instagram' },
    { pattern: /facebook\.com/i, name: 'facebook' },
    { pattern: /vimeo\.com/i, name: 'vimeo' },
    { pattern: /github\.com/i, name: 'github' },
    { pattern: /reddit\.com/i, name: 'reddit' },
    { pattern: /linkedin\.com/i, name: 'linkedin' },
  ];

  for (const { pattern, name } of providers) {
    if (pattern.test(url)) {
      return name;
    }
  }

  return 'generic';
}

/**
 * Санитизирует HTML для предотвращения XSS
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Обрезает текст до максимальной длины
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Генерирует embed HTML для YouTube
 */
export function generateYouTubeEmbed(url: string): string | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return null;
  }

  return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

/**
 * Извлекает ID видео из YouTube URL
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Генерирует embed HTML для Twitter
 */
export function generateTwitterEmbed(url: string): string | null {
  // Twitter требует использования их виджета
  return `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote>`;
}

/**
 * Форматирует preview для отображения
 */
export function formatPreview(preview: LinkPreview): LinkPreview {
  return {
    ...preview,
    title: preview.title ? truncateText(preview.title, 100) : null,
    description: preview.description ? truncateText(preview.description, 200) : null,
  };
}

/**
 * Проверяет, истёк ли срок действия превью
 */
export function isPreviewExpired(preview: LinkPreview): boolean {
  if (!preview.expiresAt) {
    return false;
  }

  const expiresAt = new Date(preview.expiresAt);
  const now = new Date();
  return expiresAt < now;
}

/**
 * Получает домен из URL
 */
export function getDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Проверяет, поддерживает ли провайдер embed
 */
export function supportsEmbed(provider: string | null): boolean {
  const embedProviders = ['youtube', 'twitter', 'vimeo', 'instagram'];
  return provider ? embedProviders.includes(provider) : false;
}

/**
 * Генерирует fallback превью для URL без метаданных
 */
export function generateFallbackPreview(url: string): LinkPreview {
  const domain = getDomain(url);
  return {
    url,
    title: domain || 'Link',
    description: url,
    imageUrl: null,
    provider: detectProvider(url),
    faviconUrl: domain ? `https://www.google.com/s2/favicons?domain=${domain}` : null,
    siteName: domain,
  };
}
