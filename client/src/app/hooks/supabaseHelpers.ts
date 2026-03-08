import { supabase } from '../../supabaseClient';
import { validateFile } from '../utils/fileValidation';
import { logger } from '../utils/logger';

export type Room = {
    id: string;
    name: string;
    type: 'direct' | 'community' | 'channel' | 'group';
    topic?: string;
    created_by?: string;
    created_at: string;
    is_direct?: boolean;
    target_user_id?: string;
    avatar_url?: string;
    member_count?: number;
    is_public?: boolean;
    category?: string;
    background_url?: string;
    background_color?: string;
    background_config?: any;
    allow_comments?: boolean;
    is_encrypted?: boolean;
    other_user?: {
        username: string;
        avatar_url: string | null;
        status?: string;
    };
    last_message_preview?: string;
    last_message_at?: string;
    last_message_sender_is_self?: boolean;
    last_message_read?: boolean;
    draft?: { content: string };
    roomIsMuted?: boolean;
    roomIsPinned?: boolean;
    roomIsArchived?: boolean;
    displayName?: string;
    initial?: string;
    roomIsSavedMessages?: boolean;
};

export type Message = {
    id: string;
    room_id: string;
    user_id: string;
    content: string;
    media_url?: string;
    created_at: string;
    read_by?: string[];
    reply_to?: string;
    is_pinned?: boolean;
    pinned_at?: string | null;
    pinned_by?: string | null;
    forwarded_from?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    media_group_id?: string;
    media_order?: number;
    is_compressed?: boolean;
    is_encrypted?: boolean;
    encryption_version?: number;
    original_width?: number;
    original_height?: number;
    users?: {
        username: string;
        avatar_url?: string;
    };
    is_edited?: boolean;
    is_read?: boolean;
    reactions?: any[];
    poll_id?: string;
    key_version?: number;
};

import { Upload } from '@aws-sdk/lib-storage';
import { wasabiS3Client, BUCKET_NAME } from '../utils/s3Client';
import imageCompression from 'browser-image-compression';

export async function uploadMediaFile(file: File, onProgress?: (percent: number) => void): Promise<string | null> {
    const validation = validateFile(file);

    if (!validation.valid) {
        logger.error('File validation failed:', validation.error);
        throw new Error(validation.error);
    }

    try {
        let fileToUpload: File | Blob = file;

        // 1. Сжатие картинок перед загрузкой
        if (file.type.startsWith('image/') && !file.type.includes('gif')) {
            const options = {
                maxSizeMB: 1,           // Максимальный размер 1МБ
                maxWidthOrHeight: 1600, // Максимальное разрешение
                useWebWorker: true
            };
            try {
                logger.info('Compressing image...', file.name);
                const compressedFile = await imageCompression(file, options);
                fileToUpload = new File([compressedFile], file.name, { type: file.type });
                logger.info('Compressed size:', (fileToUpload.size / 1024).toFixed(2), 'KB');
            } catch (compErr) {
                logger.error('Compression failed, uploading original:', compErr);
            }
        }

        const extension = file.name.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'quicktime': 'video/quicktime',
            'webm': 'video/webm',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg'
        };

        const detectType = (file.type && file.type !== 'application/octet-stream')
            ? file.type
            : (extension ? mimeTypes[extension] : 'application/octet-stream');

        const key = `media/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        logger.info(`Starting multi-part upload to Wasabi S3... (${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB)`);

        // 2. Используем SDK для надежной загрузки частями (multipart upload)
        const parallelUploads3 = new Upload({
            client: wasabiS3Client,
            params: {
                Bucket: BUCKET_NAME,
                Key: key,
                Body: fileToUpload,
                ContentType: detectType,
            },
            queueSize: 4,
            partSize: 1024 * 1024 * 5,
            leavePartsOnError: false,
        });

        // Отслеживаем прогресс загрузки для логов и UI
        parallelUploads3.on("httpUploadProgress", (progress) => {
            if (progress.loaded && progress.total) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                if (onProgress) onProgress(percent);

                // Логируем в консоль для отладки
                if (percent % 10 === 0) {
                    logger.info(`Upload progress: ${percent}%`);
                }
            }
        });

        await parallelUploads3.done();

        const publicUrl = `https://s3.${import.meta.env.VITE_WASABI_REGION || 'eu-central-2'}.wasabisys.com/${BUCKET_NAME}/${key}`;
        logger.info('File successfully uploaded to Wasabi:', publicUrl);
        return publicUrl;
    } catch (error: any) {
        logger.error('Error uploading media to Wasabi S3 (Multi-part):', error.message);
        return null;
    }
}

// Кэш текущего пользователя
let _cachedUserId: string | null = null;
let _cachedUserMeta: any = null;
let _userPromise: Promise<{ id: string | null; meta: any }> | null = null;

export async function getCurrentUser() {
    if (_cachedUserId) return { id: _cachedUserId, meta: _cachedUserMeta };

    if (!_userPromise) {
        _userPromise = supabase.auth.getUser().then(({ data: { user } }) => {
            _cachedUserId = user?.id ?? null;
            _cachedUserMeta = user?.user_metadata ?? null;
            _userPromise = null;
            return { id: _cachedUserId, meta: _cachedUserMeta };
        });
    }

    return _userPromise;
}

// Сброс кэша при logout
supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
        _cachedUserId = null;
        _cachedUserMeta = null;
        _userPromise = null;
    }
});

export const ROOM_SELECT = `
    id, name, type, topic, created_by, created_at, is_direct, target_user_id, avatar_url, member_count,
    is_public, background_url, background_config, allow_comments, is_encrypted,
    last_message_id, last_message_at, last_message_preview,
    created_by_user:users!rooms_created_by_fkey(id, username, avatar_url),
    target_user:users!rooms_target_user_id_fkey(id, username, avatar_url)
`;
