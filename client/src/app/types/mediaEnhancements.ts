// TypeScript типы для медиа-улучшений

export interface MediaAlbum {
  groupId: string;
  items: MediaAlbumItem[];
}

export interface MediaAlbumItem {
  messageId?: string;
  file?: File;
  mediaUrl: string;
  order: number;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  isCompressed?: boolean;
}

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  roomId?: string;
  version?: number;
  mimeType?: string;
}

export interface LinkPreview {
  id?: string;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  provider: string | null;
  embedHtml?: string | null;
  faviconUrl?: string | null;
  siteName?: string | null;
  createdAt?: string;
  expiresAt?: string;
}

export interface LinkPreviewResponse {
  success: boolean;
  preview?: LinkPreview;
  error?: string;
  fromCache?: boolean;
}

export interface CompressionOptions {
  maxSizeMB?: number; // default: 1
  maxWidthOrHeight?: number; // default: 1920
  quality?: number; // default: 0.85
  useWebWorker?: boolean; // default: true
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export type ImageQuality = 'original' | 'compressed';

export interface MessageWithAlbum {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  media_url?: string;
  media_group_id?: string;
  media_order?: number;
  is_compressed?: boolean;
  original_width?: number;
  original_height?: number;
  created_at: string;
}

// Ошибки
export enum AlbumError {
  INVALID_FILE_COUNT = 'Album must contain 2-10 media files',
  UPLOAD_FAILED = 'Failed to upload media file',
  INVALID_FILE_TYPE = 'Unsupported file type',
  FILE_TOO_LARGE = 'File size exceeds maximum limit',
}

export enum CompressionError {
  UNSUPPORTED_FORMAT = 'Image format not supported for compression',
  COMPRESSION_FAILED = 'Failed to compress image',
  WORKER_UNAVAILABLE = 'Web Worker not available',
  INVALID_IMAGE = 'Invalid or corrupted image file',
}

export enum LinkPreviewError {
  INVALID_URL = 'Invalid URL format',
  FETCH_TIMEOUT = 'Request timed out after 5 seconds',
  FETCH_FAILED = 'Failed to fetch preview metadata',
  PARSE_ERROR = 'Failed to parse Open Graph tags',
  SECURITY_VIOLATION = 'URL rejected for security reasons',
  RATE_LIMIT = 'Too many preview requests',
}
