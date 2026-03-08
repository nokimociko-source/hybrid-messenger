// Утилиты для сериализации и десериализации медиа-альбомов

import type { MediaAlbum, MediaAlbumItem, MessageWithAlbum } from '../types/mediaEnhancements';

/**
 * Сериализует массив файлов в структуру альбома
 */
export function serializeAlbum(files: File[], groupId: string): MediaAlbum {
  if (files.length < 2 || files.length > 10) {
    throw new Error('Album must contain 2-10 media files');
  }

  const items: MediaAlbumItem[] = files.map((file, index) => ({
    file,
    mediaUrl: '', // Будет заполнено после загрузки
    order: index,
    type: file.type.startsWith('video/') ? 'video' : 'image',
  }));

  return {
    groupId,
    items,
  };
}

/**
 * Десериализует сообщения из БД в структуру альбома
 */
export function deserializeAlbum(messages: MessageWithAlbum[]): MediaAlbum {
  if (!messages || messages.length === 0) {
    throw new Error('Cannot deserialize empty album');
  }

  // Валидация: все сообщения должны иметь одинаковый media_group_id
  const groupId = messages[0].media_group_id;
  if (!groupId) {
    throw new Error('Messages do not have media_group_id');
  }

  const allSameGroup = messages.every((msg) => msg.media_group_id === groupId);
  if (!allSameGroup) {
    throw new Error('Messages have different media_group_id');
  }

  // Сортировка по media_order
  const sortedMessages = [...messages].sort((a, b) => {
    const orderA = a.media_order ?? 0;
    const orderB = b.media_order ?? 0;
    return orderA - orderB;
  });

  const items: MediaAlbumItem[] = sortedMessages.map((msg) => {
    if (!msg.media_url) {
      throw new Error(`Message ${msg.id} does not have media_url`);
    }

    return {
      messageId: msg.id,
      mediaUrl: msg.media_url,
      order: msg.media_order ?? 0,
      type: msg.media_url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image',
      width: msg.original_width,
      height: msg.original_height,
      isCompressed: msg.is_compressed,
    };
  });

  return {
    groupId,
    items,
  };
}

/**
 * Валидирует структуру альбома
 */
export function validateAlbum(album: MediaAlbum): boolean {
  if (!album.groupId) {
    return false;
  }

  if (!album.items || album.items.length < 2 || album.items.length > 10) {
    return false;
  }

  // Проверка уникальности order
  const orders = album.items.map((item) => item.order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    return false;
  }

  // Проверка последовательности order (0, 1, 2, ...)
  const sortedOrders = [...orders].sort((a, b) => a - b);
  const expectedOrders = Array.from({ length: orders.length }, (_, i) => i);
  const isSequential = sortedOrders.every((order, index) => order === expectedOrders[index]);
  if (!isSequential) {
    return false;
  }

  return true;
}

/**
 * Группирует сообщения по media_group_id
 */
export function groupMessagesByAlbum(
  messages: MessageWithAlbum[]
): Map<string, MessageWithAlbum[]> {
  const albums = new Map<string, MessageWithAlbum[]>();

  for (const message of messages) {
    if (message.media_group_id) {
      const existing = albums.get(message.media_group_id) || [];
      existing.push(message);
      albums.set(message.media_group_id, existing);
    }
  }

  return albums;
}

/**
 * Проверяет, является ли сообщение частью альбома
 */
export function isAlbumMessage(message: MessageWithAlbum): boolean {
  return !!message.media_group_id && message.media_order !== null && message.media_order !== undefined;
}

/**
 * Получает thumbnail URL для медиа
 */
export function getThumbnailUrl(mediaUrl: string): string {
  // Предполагаем, что thumbnail имеет суффикс _thumb
  const ext = mediaUrl.split('.').pop();
  const baseUrl = mediaUrl.substring(0, mediaUrl.lastIndexOf('.'));
  return `${baseUrl}_thumb.${ext}`;
}

/**
 * Генерирует уникальный media_group_id
 */
export function generateGroupId(): string {
  return crypto.randomUUID();
}
