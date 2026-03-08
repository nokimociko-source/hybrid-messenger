import { logger } from '../utils/logger';
// Хук для получения и кеширования предпросмотра ссылок

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import type { LinkPreview, LinkPreviewResponse } from '../types/mediaEnhancements';
import {
  extractFirstUrl,
  isValidUrl,
  isLocalUrl,
  isPreviewExpired,
  generateFallbackPreview,
} from '../utils/linkPreviewParser';

// In-memory кеш для текущей сессии
const previewCache = new Map<string, LinkPreview>();

// Кеш запросов в процессе (для предотвращения дублирования)
const pendingRequests = new Map<string, Promise<LinkPreview | null>>();

export function useLinkPreview() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Получает превью из in-memory кеша
   */
  const getPreview = useCallback((url: string): LinkPreview | null => {
    const cached = previewCache.get(url);
    if (cached && !isPreviewExpired(cached)) {
      return cached;
    }
    return null;
  }, []);

  /**
   * Получает превью из БД кеша
   */
  const getPreviewFromDB = useCallback(
    async (url: string): Promise<LinkPreview | null> => {
      try {
        const { data, error } = await supabase
          .from('link_previews')
          .select('*')
          .eq('url', url)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (error || !data) {
          return null;
        }

        const preview: LinkPreview = {
          id: data.id,
          url: data.url,
          title: data.title,
          description: data.description,
          imageUrl: data.image_url,
          provider: data.provider,
          embedHtml: data.embed_html,
          faviconUrl: data.favicon_url,
          siteName: data.site_name,
          createdAt: data.created_at,
          expiresAt: data.expires_at,
        };

        // Сохраняем в in-memory кеш
        previewCache.set(url, preview);

        return preview;
      } catch (err) {
        logger.error('Failed to get preview from DB:', err);
        return null;
      }
    },
    [supabase]
  );

  /**
   * Запрашивает превью через Edge Function
   */
  const fetchPreviewFromServer = useCallback(
    async (url: string): Promise<LinkPreview | null> => {
      try {
        // Отменяем предыдущий запрос если есть
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        const { data, error } = await supabase.functions.invoke<LinkPreviewResponse>(
          'fetch-link-preview',
          {
            body: { url },
            signal: abortControllerRef.current.signal,
          }
        );

        if (error) {
          throw error;
        }

        if (!data || !data.success || !data.preview) {
          return null;
        }

        // Сохраняем в in-memory кеш
        previewCache.set(url, data.preview);

        return data.preview;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }
        throw err;
      }
    },
    [supabase]
  );

  /**
   * Получает превью для URL
   */
  const fetchPreview = useCallback(
    async (url: string): Promise<LinkPreview | null> => {
      try {
        setIsLoading(true);
        setError(null);

        // Валидация URL
        if (!isValidUrl(url)) {
          throw new Error('Invalid URL format');
        }

        // Проверка на локальный адрес
        if (isLocalUrl(url)) {
          throw new Error('Local addresses are not allowed');
        }

        // Проверка in-memory кеша
        const cached = getPreview(url);
        if (cached) {
          return cached;
        }

        // Проверка pending запросов
        const pending = pendingRequests.get(url);
        if (pending) {
          return await pending;
        }

        // Создаём новый запрос
        const request = (async () => {
          try {
            // Проверка БД кеша
            const dbPreview = await getPreviewFromDB(url);
            if (dbPreview) {
              return dbPreview;
            }

            // Запрос к серверу
            const serverPreview = await fetchPreviewFromServer(url);
            return serverPreview;
          } finally {
            pendingRequests.delete(url);
          }
        })();

        pendingRequests.set(url, request);
        return await request;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch preview');
        setError(error);
        logger.error('Failed to fetch link preview:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getPreview, getPreviewFromDB, fetchPreviewFromServer]
  );

  /**
   * Извлекает и получает превью для первого URL в тексте
   */
  const fetchPreviewFromText = useCallback(
    async (text: string): Promise<LinkPreview | null> => {
      const url = extractFirstUrl(text);
      if (!url) {
        return null;
      }

      return await fetchPreview(url);
    },
    [fetchPreview]
  );

  /**
   * Предзагружает превью для URL
   */
  const prefetchPreview = useCallback(
    async (url: string): Promise<void> => {
      try {
        await fetchPreview(url);
      } catch (err) {
        // Игнорируем ошибки при предзагрузке
        logger.warn('Failed to prefetch preview:', err);
      }
    },
    [fetchPreview]
  );

  /**
   * Очищает кеш для URL
   */
  const clearCache = useCallback((url?: string) => {
    if (url) {
      previewCache.delete(url);
    } else {
      previewCache.clear();
    }
  }, []);

  /**
   * Отменяет текущий запрос
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    fetchPreview,
    fetchPreviewFromText,
    prefetchPreview,
    getPreview,
    clearCache,
    cancelRequest,
    isLoading,
    error,
  };
}

/**
 * Хук для автоматического получения превью при изменении текста
 */
export function useAutoLinkPreview(text: string, enabled = true) {
  const { fetchPreviewFromText, isLoading, error } = useLinkPreview();
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const lastTextRef = useRef<string>('');

  // Автоматически получаем превью при изменении текста
  useState(() => {
    if (!enabled || !text || text === lastTextRef.current) {
      return;
    }

    lastTextRef.current = text;

    const url = extractFirstUrl(text);
    if (!url) {
      setPreview(null);
      return;
    }

    fetchPreviewFromText(text).then((result) => {
      if (result) {
        setPreview(result);
      } else {
        // Генерируем fallback превью
        setPreview(generateFallbackPreview(url));
      }
    });
  });

  return {
    preview,
    isLoading,
    error,
  };
}
