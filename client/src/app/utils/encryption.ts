import { logger } from './logger';
/**
 * Encryption utilities for client-side message encryption.
 * Uses AES-256-GCM for strong encryption.
 */

// Key derivation: Derives a 32-byte key from a master password and salt using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as any,
            iterations: 100000,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypts text using a master password
export async function encryptText(text: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encoder = new TextEncoder();

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(text)
    );

    // Combine salt + iv + ciphertext into a single base64 string
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
}

// Decrypts base64 ciphertext using a master password
export async function decryptText(encryptedBase64: string, password: string): Promise<string> {
    try {
        const combined = new Uint8Array(
            atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
        );

        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const ciphertext = combined.slice(28);
        const key = await deriveKey(password, salt);
        const decoder = new TextDecoder();

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return decoder.decode(decrypted);
    } catch (err) {
        logger.error('Decryption failed:', err);
        throw new Error('Неверный мастер-пароль или данные повреждены');
    }
}
// Encrypts a File or Blob using a master password or session key
export async function encryptFile(data: Blob | File, password: string): Promise<Blob> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const arrayBuffer = await data.arrayBuffer();
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        arrayBuffer
    );

    // Combine salt + iv + ciphertext into a single Blob
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return new Blob([combined], { type: 'application/octet-stream' });
}

// Decrypts an encrypted Blob using a master password or session key
export async function decryptFile(encryptedBlob: Blob, password: string): Promise<Blob> {
    try {
        const arrayBuffer = await encryptedBlob.arrayBuffer();
        const combined = new Uint8Array(arrayBuffer);

        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const ciphertext = combined.slice(28);
        const key = await deriveKey(password, salt);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return new Blob([decrypted]);
    } catch (err) {
        logger.error('File decryption failed:', err);
        throw new Error('Не удалось расшифровать файл: неверный пароль или данные повреждены');
    }
}
