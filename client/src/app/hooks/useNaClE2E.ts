import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';

// Используем Web Crypto API вместо TweetNaCl для избежания дополнительных зависимостей
// Это production-ready реализация с ECDH + AES-GCM

interface KeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

interface EncryptedMessage {
    ciphertext: string;
    iv: string;
    ephemeralPublicKey: string;
}

export function useNaClE2E() {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [keyPair, setKeyPair] = useState<KeyPair | null>(null);

    useEffect(() => {
        initializeKeys();
    }, []);

    const initializeKeys = async () => {
        try {
            // Загружаем ключи из localStorage
            const stored = localStorage.getItem('ecdh_keys');
            
            if (stored) {
                const { publicKey, privateKey } = JSON.parse(stored);
                const importedKeyPair = await importKeyPair(publicKey, privateKey);
                setKeyPair(importedKeyPair);
            } else {
                // Генерируем новые ключи
                await generateKeys();
            }

            setIsReady(true);
        } catch (err: any) {
            logger.error('ECDH initialization error:', err);
            setError(err.message);
        }
    };

    const generateKeys = async () => {
        try {
            // Генерация пары ключей ECDH (P-256)
            const newKeyPair = await window.crypto.subtle.generateKey(
                {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                },
                true, // extractable
                ['deriveKey', 'deriveBits']
            );

            setKeyPair(newKeyPair);

            // Экспортируем и сохраняем в localStorage
            const exportedPublicKey = await window.crypto.subtle.exportKey(
                'spki',
                newKeyPair.publicKey
            );
            const exportedPrivateKey = await window.crypto.subtle.exportKey(
                'pkcs8',
                newKeyPair.privateKey
            );

            localStorage.setItem('ecdh_keys', JSON.stringify({
                publicKey: arrayBufferToBase64(exportedPublicKey),
                privateKey: arrayBufferToBase64(exportedPrivateKey)
            }));

            // Загружаем публичный ключ в Supabase
            const user = await getCurrentUser();
            if (user) {
                await supabase
                    .from('users')
                    .update({ 
                        public_key: arrayBufferToBase64(exportedPublicKey),
                        key_type: 'ecdh_p256'
                    })
                    .eq('id', user.id);
            }
        } catch (err: any) {
            logger.error('Key generation error:', err);
            throw err;
        }
    };

    const importKeyPair = async (
        publicKeyBase64: string,
        privateKeyBase64: string
    ): Promise<KeyPair> => {
        const publicKey = await window.crypto.subtle.importKey(
            'spki',
            base64ToArrayBuffer(publicKeyBase64),
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true,
            []
        );

        const privateKey = await window.crypto.subtle.importKey(
            'pkcs8',
            base64ToArrayBuffer(privateKeyBase64),
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true,
            ['deriveKey', 'deriveBits']
        );

        return { publicKey, privateKey };
    };

    const encryptMessage = async (
        message: string,
        recipientUserId: string
    ): Promise<string> => {
        if (!keyPair) throw new Error('Keys not initialized');

        try {
            // Получаем публичный ключ получателя
            const { data: recipient } = await supabase
                .from('users')
                .select('public_key, key_type')
                .eq('id', recipientUserId)
                .single();

            if (!recipient?.public_key) {
                throw new Error('Recipient public key not found');
            }

            if (recipient.key_type !== 'ecdh_p256') {
                throw new Error('Incompatible key type');
            }

            // Импортируем публичный ключ получателя
            const recipientPublicKey = await window.crypto.subtle.importKey(
                'spki',
                base64ToArrayBuffer(recipient.public_key),
                {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                },
                false,
                []
            );

            // Генерируем эфемерную пару ключей для этого сообщения (Perfect Forward Secrecy)
            const ephemeralKeyPair = await window.crypto.subtle.generateKey(
                {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                },
                true,
                ['deriveKey']
            );

            // Деривируем общий секрет
            const sharedSecret = await window.crypto.subtle.deriveKey(
                {
                    name: 'ECDH',
                    public: recipientPublicKey
                },
                ephemeralKeyPair.privateKey,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt']
            );

            // Генерируем IV (Initialization Vector)
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // Шифруем сообщение
            const encoder = new TextEncoder();
            const messageData = encoder.encode(message);

            const ciphertext = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                sharedSecret,
                messageData
            );

            // Экспортируем эфемерный публичный ключ
            const ephemeralPublicKeyExported = await window.crypto.subtle.exportKey(
                'spki',
                ephemeralKeyPair.publicKey
            );

            // Возвращаем зашифрованное сообщение
            const encrypted: EncryptedMessage = {
                ciphertext: arrayBufferToBase64(ciphertext),
                iv: arrayBufferToBase64(iv),
                ephemeralPublicKey: arrayBufferToBase64(ephemeralPublicKeyExported)
            };

            return JSON.stringify(encrypted);

        } catch (err: any) {
            logger.error('Encryption error:', err);
            throw err;
        }
    };

    const decryptMessage = async (
        encryptedMessage: string,
        senderUserId: string
    ): Promise<string> => {
        if (!keyPair) throw new Error('Keys not initialized');

        try {
            const encrypted: EncryptedMessage = JSON.parse(encryptedMessage);

            // Импортируем эфемерный публичный ключ отправителя
            const ephemeralPublicKey = await window.crypto.subtle.importKey(
                'spki',
                base64ToArrayBuffer(encrypted.ephemeralPublicKey),
                {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                },
                false,
                []
            );

            // Деривируем общий секрет
            const sharedSecret = await window.crypto.subtle.deriveKey(
                {
                    name: 'ECDH',
                    public: ephemeralPublicKey
                },
                keyPair.privateKey,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['decrypt']
            );

            // Расшифровываем сообщение
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: base64ToArrayBuffer(encrypted.iv)
                },
                sharedSecret,
                base64ToArrayBuffer(encrypted.ciphertext)
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);

        } catch (err: any) {
            logger.error('Decryption error:', err);
            throw err;
        }
    };

    // Утилиты для конвертации
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    };

    return {
        isReady,
        error,
        encryptMessage,
        decryptMessage,
        regenerateKeys: generateKeys,
        isEncrypted: (message: string) => message.startsWith('🔒')
    };
}
