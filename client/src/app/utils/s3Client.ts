import { logger } from './logger';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Wasabi S3 Client configuration
export const wasabiS3Client = new S3Client({
    region: import.meta.env.VITE_WASABI_REGION || 'eu-central-2',
    endpoint: `https://s3.${import.meta.env.VITE_WASABI_REGION || 'eu-central-2'}.wasabisys.com`,
    credentials: {
        accessKeyId: import.meta.env.VITE_WASABI_ACCESS_KEY,
        secretAccessKey: import.meta.env.VITE_WASABI_SECRET_KEY
    }
});

export const BUCKET_NAME = import.meta.env.VITE_WASABI_BUCKET || 'catlover-media-123';

/**
 * Generates a temporary pre-signed URL for viewing a private S3 object.
 * This bypasses the "Access Denied" issues on Wasabi trial accounts.
 */
export async function getPresignedViewUrl(s3Url: string): Promise<string> {
    if (!s3Url.includes('wasabisys.com')) return s3Url;

    try {
        // Extract key from URL: https://s3.region.wasabisys.com/bucket/key
        const urlObj = new URL(s3Url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        // pathParts[0] is bucket name, rest is the key
        const key = pathParts.slice(1).join('/');

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        // Signed URL remains valid for 1 hour
        return await getSignedUrl(wasabiS3Client, command, { expiresIn: 3600 });
    } catch (err) {
        logger.error('Error generating pre-signed view URL:', err);
        return s3Url;
    }
}
