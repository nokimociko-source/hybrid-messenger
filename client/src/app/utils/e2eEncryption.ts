import { logger } from './logger';
// E2E Encryption utility (without React hooks)
// This can be used in any context, not just React components

import { SecureKeyStorage } from './secureKeyStorage';

interface EncryptedMessage {
    ciphertext: string;
    iv: string;
    ephemeralPublicKey: string;
}

interface SignedMessage {
    ciphertext: string;
    iv: string;
    ephemeralPublicKey: string;
    signature: string; // ECDSA signature in base64
    timestamp: number; // Unix timestamp in milliseconds
    senderVerificationKey: string; // Base64 encoded public key
}

class E2EEncryption {
    private static instance: E2EEncryption;
    private keyPair: CryptoKeyPair | null = null;
    private signingKeyPair: CryptoKeyPair | null = null;
    private isInitialized = false;
    private secureKeyStorage: SecureKeyStorage | null = null;
    private derivedKey: CryptoKey | null = null;

    private constructor() {}

    static getInstance(): E2EEncryption {
        if (!E2EEncryption.instance) {
            E2EEncryption.instance = new E2EEncryption();
        }
        return E2EEncryption.instance;
    }

    /**
     * Initialize E2E encryption with SecureKeyStorage integration
     * @param secureKeyStorage - Instance of SecureKeyStorage for secure key management
     * @param derivedKey - Key derived from user's password for decrypting stored keys
     */
    async initialize(secureKeyStorage?: SecureKeyStorage, derivedKey?: CryptoKey): Promise<void> {
        if (this.isInitialized) return;

        try {
            // If SecureKeyStorage is provided, use it
            if (secureKeyStorage && derivedKey) {
                this.secureKeyStorage = secureKeyStorage;
                this.derivedKey = derivedKey;

                // Initialize SecureKeyStorage if not already initialized
                await this.secureKeyStorage.initialize();

                // Try to retrieve keys from SecureKeyStorage
                const keys = await this.secureKeyStorage.retrieveKeys(derivedKey);
                
                if (keys) {
                    // We have the private key and signing key from SecureKeyStorage
                    // We need to get the public key for the keyPair
                    const publicKey = await this.derivePublicKey(keys.privateKey);
                    this.keyPair = {
                        publicKey,
                        privateKey: keys.privateKey
                    };
                    this.isInitialized = true;
                    return;
                }
            }

            // Fallback: Check for legacy keys in localStorage (for backward compatibility)
            const stored = localStorage.getItem('ecdh_keys');
            
            if (stored) {
                const { publicKey, privateKey } = JSON.parse(stored);
                this.keyPair = await this.importKeyPair(publicKey, privateKey);
                this.isInitialized = true;
            }
        } catch (err) {
            logger.error('E2E initialization error:', err);
        }
    }

    /**
     * Derive public key from private key
     */
    private async derivePublicKey(privateKey: CryptoKey): Promise<CryptoKey> {
        // Export private key
        const privateKeyData = await crypto.subtle.exportKey('pkcs8', privateKey);
        
        // Re-import as key pair to get public key
        const keyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        
        // For now, we'll need to store the public key separately or derive it differently
        // This is a limitation - we should store public key in the database
        // For backward compatibility, let's try to get it from localStorage or database
        const stored = localStorage.getItem('ecdh_keys');
        if (stored) {
            const { publicKey } = JSON.parse(stored);
            return await crypto.subtle.importKey(
                'spki',
                this.base64ToArrayBuffer(publicKey),
                { name: 'ECDH', namedCurve: 'P-256' },
                true,
                []
            );
        }
        
        // If not in localStorage, get from database
        const { supabase } = await import('../../supabaseClient');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            const { data: userData } = await supabase
                .from('users')
                .select('public_key')
                .eq('id', user.id)
                .single();
            
            if (userData?.public_key) {
                return await crypto.subtle.importKey(
                    'spki',
                    this.base64ToArrayBuffer(userData.public_key),
                    { name: 'ECDH', namedCurve: 'P-256' },
                    true,
                    []
                );
            }
        }
        
        // Last resort: return the public key from the generated pair
        return keyPair.publicKey;
    }

    private async importKeyPair(
        publicKeyBase64: string,
        privateKeyBase64: string
    ): Promise<CryptoKeyPair> {
        const publicKey = await window.crypto.subtle.importKey(
            'spki',
            this.base64ToArrayBuffer(publicKeyBase64),
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            []
        );

        const privateKey = await window.crypto.subtle.importKey(
            'pkcs8',
            this.base64ToArrayBuffer(privateKeyBase64),
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );

        return { publicKey, privateKey };
    }

    /**
     * Save keys using SecureKeyStorage
     * @param privateKey - ECDH private key
     * @param signingKey - ECDSA signing key
     */
    async saveKeys(privateKey: CryptoKey, signingKey: CryptoKey): Promise<void> {
        if (!this.secureKeyStorage || !this.derivedKey) {
            throw new Error('SecureKeyStorage not initialized. Call initialize() with SecureKeyStorage first.');
        }

        await this.secureKeyStorage.storeKeys(
            { privateKey, signingKey },
            this.derivedKey
        );
    }

    /**
     * Clear keys from memory (call on logout)
     */
    clearKeys(): void {
        this.keyPair = null;
        this.signingKeyPair = null;
        this.derivedKey = null;
        this.isInitialized = false;
        
        if (this.secureKeyStorage) {
            this.secureKeyStorage.clearKeys();
        }
    }

    /**
     * Generate ECDSA P-256 key pair for message signing
     * @returns Object containing signing key (private) and verification key (public)
     */
    async generateSigningKeyPair(): Promise<{
        signingKey: CryptoKey;
        verificationKey: CryptoKey;
    }> {
        try {
            // Generate ECDSA P-256 key pair
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256'
                },
                true, // extractable
                ['sign', 'verify']
            );

            // Store the key pair in memory
            this.signingKeyPair = keyPair;

            // Export verification key to base64 for storage in user profile
            const verificationKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);
            const verificationKeyBase64 = this.arrayBufferToBase64(verificationKeyData);

            // Store signing key in SecureKeyStorage if available
            if (this.secureKeyStorage && this.derivedKey && this.keyPair) {
                await this.secureKeyStorage.storeKeys(
                    {
                        privateKey: this.keyPair.privateKey,
                        signingKey: keyPair.privateKey
                    },
                    this.derivedKey
                );
            }

            // Upload verification key to user profile
            await this.uploadVerificationKey(verificationKeyBase64);

            return {
                signingKey: keyPair.privateKey,
                verificationKey: keyPair.publicKey
            };
        } catch (err) {
            logger.error('Error generating signing key pair:', err);
            throw new Error('Failed to generate signing key pair');
        }
    }

    /**
     * Upload verification key to user profile in database
     * @param verificationKeyBase64 - Base64 encoded verification key
     */
    private async uploadVerificationKey(verificationKeyBase64: string): Promise<void> {
        try {
            const { supabase } = await import('../../supabaseClient');
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('User not authenticated');
            }

            const { error } = await supabase
                .from('users')
                .update({
                    verification_key: verificationKeyBase64
                })
                .eq('id', user.id);

            if (error) {
                throw error;
            }
        } catch (err) {
            logger.error('Error uploading verification key:', err);
            throw new Error('Failed to upload verification key to user profile');
        }
    }

    /**
     * Export verification key to base64 format
     * @returns Base64 encoded verification key
     */
    async exportVerificationKey(): Promise<string> {
        if (!this.signingKeyPair) {
            throw new Error('Signing key pair not initialized');
        }

        const verificationKeyData = await crypto.subtle.exportKey('spki', this.signingKeyPair.publicKey);
        return this.arrayBufferToBase64(verificationKeyData);
    }

    /**
     * Sign encrypted message data with ECDSA
     * @param encryptedData - Encrypted message data (ciphertext + iv + ephemeralPublicKey)
     * @param timestamp - Message timestamp
     * @returns Base64 encoded signature
     */
    private async signMessage(encryptedData: ArrayBuffer, timestamp: number): Promise<string> {
        if (!this.signingKeyPair) {
            throw new Error('Signing key pair not initialized. Call generateSigningKeyPair() first.');
        }

        try {
            // Create data to sign: encrypted data + timestamp
            const timestampBuffer = new BigUint64Array([BigInt(timestamp)]).buffer;
            const dataToSign = new Uint8Array([
                ...new Uint8Array(encryptedData),
                ...new Uint8Array(timestampBuffer)
            ]);

            // Sign with ECDSA P-256
            const signature = await crypto.subtle.sign(
                {
                    name: 'ECDSA',
                    hash: { name: 'SHA-256' }
                },
                this.signingKeyPair.privateKey,
                dataToSign
            );

            // Return signature as base64
            return this.arrayBufferToBase64(signature);
        } catch (err) {
            logger.error('Error signing message:', err);
            throw new Error('Failed to sign message');
        }
    }

    /**
     * Verify ECDSA signature on encrypted message
     * @param encryptedData - Encrypted message data (ciphertext + iv + ephemeralPublicKey)
     * @param timestamp - Message timestamp
     * @param signature - Base64 encoded signature
     * @param senderVerificationKey - Base64 encoded sender's verification key
     * @returns True if signature is valid and timestamp is recent
     */
    private async verifySignature(
        encryptedData: ArrayBuffer,
        timestamp: number,
        signature: string,
        senderVerificationKey: string
    ): Promise<boolean> {
        try {
            // Check message timestamp (< 5 minutes to prevent replay attacks)
            const currentTime = Date.now();
            const messageAge = currentTime - timestamp;
            const FIVE_MINUTES_MS = 5 * 60 * 1000;

            if (messageAge > FIVE_MINUTES_MS) {
                logger.warn('Message rejected: timestamp too old (potential replay attack)', {
                    messageAge: Math.floor(messageAge / 1000) + 's',
                    maxAge: '5 minutes'
                });
                return false;
            }

            if (messageAge < 0) {
                logger.warn('Message rejected: timestamp in the future', {
                    messageAge: Math.floor(messageAge / 1000) + 's'
                });
                return false;
            }

            // Import sender's verification key
            const verificationKey = await crypto.subtle.importKey(
                'spki',
                this.base64ToArrayBuffer(senderVerificationKey),
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256'
                },
                false,
                ['verify']
            );

            // Create data to verify: encrypted data + timestamp
            const timestampBuffer = new BigUint64Array([BigInt(timestamp)]).buffer;
            const dataToVerify = new Uint8Array([
                ...new Uint8Array(encryptedData),
                ...new Uint8Array(timestampBuffer)
            ]);

            // Verify ECDSA signature
            const isValid = await crypto.subtle.verify(
                {
                    name: 'ECDSA',
                    hash: { name: 'SHA-256' }
                },
                verificationKey,
                this.base64ToArrayBuffer(signature),
                dataToVerify
            );

            if (!isValid) {
                logger.warn('Message rejected: invalid signature');
            }

            return isValid;
        } catch (err) {
            logger.error('Error verifying signature:', err);
            return false;
        }
    }

    async encryptMessage(message: string, recipientUserId: string): Promise<string> {
        if (!this.isInitialized || !this.keyPair) {
            // Try to initialize with legacy keys if SecureKeyStorage not available
            await this.initialize();
            if (!this.keyPair) {
                throw new Error('Keys not initialized. Please initialize with SecureKeyStorage or legacy keys.');
            }
        }

        try {
            // Get recipient's public key from Supabase
            const { supabase } = await import('../../supabaseClient');
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

            // Import recipient's public key
            const recipientPublicKey = await window.crypto.subtle.importKey(
                'spki',
                this.base64ToArrayBuffer(recipient.public_key),
                { name: 'ECDH', namedCurve: 'P-256' },
                false,
                []
            );

            // Generate ephemeral key pair for this message (Perfect Forward Secrecy)
            const ephemeralKeyPair = await window.crypto.subtle.generateKey(
                { name: 'ECDH', namedCurve: 'P-256' },
                true,
                ['deriveKey']
            );

            // Derive shared secret
            const sharedSecret = await window.crypto.subtle.deriveKey(
                { name: 'ECDH', public: recipientPublicKey },
                ephemeralKeyPair.privateKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            );

            // Generate IV
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // Encrypt message
            const encoder = new TextEncoder();
            const messageData = encoder.encode(message);

            const ciphertext = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                sharedSecret,
                messageData
            );

            // Export ephemeral public key
            const ephemeralPublicKeyExported = await window.crypto.subtle.exportKey(
                'spki',
                ephemeralKeyPair.publicKey
            );

            // Create encrypted message
            const encrypted: EncryptedMessage = {
                ciphertext: this.arrayBufferToBase64(ciphertext),
                iv: this.arrayBufferToBase64(iv),
                ephemeralPublicKey: this.arrayBufferToBase64(ephemeralPublicKeyExported)
            };

            // If signing key pair is available, sign the message
            if (this.signingKeyPair) {
                const timestamp = Date.now();
                
                // Create data to sign (combine all encrypted data)
                const encryptedDataToSign = new Uint8Array([
                    ...new Uint8Array(ciphertext),
                    ...new Uint8Array(iv),
                    ...new Uint8Array(ephemeralPublicKeyExported)
                ]).buffer;

                // Sign the encrypted data
                const signature = await this.signMessage(encryptedDataToSign, timestamp);

                // Get sender's verification key
                const verificationKey = await this.exportVerificationKey();

                // Return signed message
                const signedMessage: SignedMessage = {
                    ...encrypted,
                    signature,
                    timestamp,
                    senderVerificationKey: verificationKey
                };

                return JSON.stringify(signedMessage);
            }

            // Return unsigned message (backward compatibility)
            return JSON.stringify(encrypted);
        } catch (err: any) {
            logger.error('Encryption error:', err);
            throw err;
        }
    }

    async decryptMessage(encryptedMessage: string, senderUserId: string): Promise<string> {
        if (!this.isInitialized || !this.keyPair) {
            // Try to initialize with legacy keys if SecureKeyStorage not available
            await this.initialize();
            if (!this.keyPair) {
                throw new Error('Keys not initialized. Please initialize with SecureKeyStorage or legacy keys.');
            }
        }

        try {
            const parsed = JSON.parse(encryptedMessage);

            // Check if message has signature (SignedMessage vs EncryptedMessage)
            const isSignedMessage = 'signature' in parsed && 'timestamp' in parsed && 'senderVerificationKey' in parsed;

            if (isSignedMessage) {
                const signedMessage: SignedMessage = parsed;

                // Create encrypted data for verification (same format as signing)
                const encryptedData = new Uint8Array([
                    ...new Uint8Array(this.base64ToArrayBuffer(signedMessage.ciphertext)),
                    ...new Uint8Array(this.base64ToArrayBuffer(signedMessage.iv)),
                    ...new Uint8Array(this.base64ToArrayBuffer(signedMessage.ephemeralPublicKey))
                ]).buffer;

                // Verify signature before decrypting
                const isValid = await this.verifySignature(
                    encryptedData,
                    signedMessage.timestamp,
                    signedMessage.signature,
                    signedMessage.senderVerificationKey
                );

                if (!isValid) {
                    throw new Error('Signature verification failed. Message may be tampered or replayed.');
                }
            }

            // Proceed with decryption (works for both signed and unsigned messages)
            const encrypted: EncryptedMessage = parsed;

            // Import ephemeral public key
            const ephemeralPublicKey = await window.crypto.subtle.importKey(
                'spki',
                this.base64ToArrayBuffer(encrypted.ephemeralPublicKey),
                { name: 'ECDH', namedCurve: 'P-256' },
                false,
                []
            );

            // Derive shared secret
            const sharedSecret = await window.crypto.subtle.deriveKey(
                { name: 'ECDH', public: ephemeralPublicKey },
                this.keyPair.privateKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );

            // Decrypt message
            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: this.base64ToArrayBuffer(encrypted.iv) },
                sharedSecret,
                this.base64ToArrayBuffer(encrypted.ciphertext)
            );

            return new TextDecoder().decode(decrypted);
        } catch (err: any) {
            logger.error('Decryption error:', err);
            throw err;
        }
    }

    private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// Export singleton instance
export const e2eEncryption = E2EEncryption.getInstance();

// Export class as default for dynamic imports
export default E2EEncryption;

// Helper function to check if message is encrypted
export function isEncrypted(message: string): boolean {
    return message.startsWith('🔒');
}

// Helper function to decrypt message if needed
export async function decryptIfNeeded(message: string, senderUserId: string): Promise<string> {
    if (!isEncrypted(message)) {
        return message;
    }

    const e2eEnabled = localStorage.getItem('e2e_enabled') === 'true';
    if (!e2eEnabled) {
        return message;
    }

    try {
        const encryptedContent = message.slice(2); // Remove 🔒 prefix
        return await e2eEncryption.decryptMessage(encryptedContent, senderUserId);
    } catch (err) {
        logger.error('Failed to decrypt message:', err);
        return '🔒 [Не удалось расшифровать]';
    }
}
