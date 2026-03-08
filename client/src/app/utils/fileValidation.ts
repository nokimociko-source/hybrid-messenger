/**
 * File validation utilities
 * Validates file size, type, and content before upload
 */

import { logger } from './logger';

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 20 * 1024 * 1024,      // 20 MB
  video: 500 * 1024 * 1024,     // 500 MB
  audio: 50 * 1024 * 1024,      // 50 MB
  document: 100 * 1024 * 1024,  // 100 MB
  default: 500 * 1024 * 1024,   // 500 MB
};

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
};

export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'other';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  category: FileCategory;
  size: number;
  type: string;
}

/**
 * Determine file category from MIME type
 */
export function getFileCategory(mimeType: string): FileCategory {
  if (ALLOWED_MIME_TYPES.image.includes(mimeType)) return 'image';
  if (ALLOWED_MIME_TYPES.video.includes(mimeType)) return 'video';
  if (ALLOWED_MIME_TYPES.audio.includes(mimeType)) return 'audio';
  if (ALLOWED_MIME_TYPES.document.includes(mimeType)) return 'document';
  return 'other';
}

/**
 * Get size limit for file category
 */
export function getSizeLimit(category: FileCategory): number {
  const limits: Record<FileCategory, number> = {
    image: FILE_SIZE_LIMITS.image,
    video: FILE_SIZE_LIMITS.video,
    audio: FILE_SIZE_LIMITS.audio,
    document: FILE_SIZE_LIMITS.document,
    other: FILE_SIZE_LIMITS.default,
  };
  return limits[category];
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): FileValidationResult {
  const category = getFileCategory(file.type);
  const sizeLimit = getSizeLimit(category);

  const result: FileValidationResult = {
    valid: true,
    category,
    size: file.size,
    type: file.type,
  };

  // Check file size
  if (file.size > sizeLimit) {
    result.valid = false;
    const limitMb = Math.round(sizeLimit / (1024 * 1024));
    result.error = `Файл слишком большой. Лимит: ${limitMb} МБ (ограничение Free-тарифа Supabase).`;
    logger.warn('File size validation failed', {
      fileName: file.name,
      fileSize: file.size,
      limit: sizeLimit,
    });
    return result;
  }

  // Check if file is empty
  if (file.size === 0) {
    result.valid = false;
    result.error = 'Файл пустой';
    logger.warn('Empty file rejected', { fileName: file.name });
    return result;
  }

  // Check MIME type for known categories
  if (category !== 'other') {
    const allowedTypes = ALLOWED_MIME_TYPES[category];
    if (!allowedTypes.includes(file.type)) {
      result.valid = false;
      result.error = `Неподдерживаемый тип файла: ${file.type}`;
      logger.warn('File type validation failed', {
        fileName: file.name,
        fileType: file.type,
        category,
      });
      return result;
    }
  }

  // Additional security checks
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    result.valid = false;
    result.error = 'Недопустимое имя файла';
    logger.warn('Suspicious file name detected', { fileName: file.name });
    return result;
  }

  logger.debug('File validation passed', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    category,
  });

  return result;
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): FileValidationResult[] {
  return files.map(validateFile);
}

/**
 * Check if all files are valid
 */
export function areAllFilesValid(results: FileValidationResult[]): boolean {
  return results.every(result => result.valid);
}

/**
 * Get first validation error
 */
export function getFirstError(results: FileValidationResult[]): string | undefined {
  const firstInvalid = results.find(result => !result.valid);
  return firstInvalid?.error;
}
