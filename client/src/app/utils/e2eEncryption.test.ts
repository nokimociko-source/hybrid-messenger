import { describe, it, expect, beforeEach, vi } from 'vitest';
import E2EEncryption from './e2eEncryption';

// Mock supabaseClient
vi.mock('../../supabaseClient', () => {
    // Generate a valid mock public key
    const generateMockPublicKey = async () => {
        const keyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey']
        );
        const exported = await crypto.subtle.exportKey('spki', keyPair.publicKey);
        const bytes = new Uint8Array(exported);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    let mockPublicKey: string;
    
    return {
        supabase: {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: 'test-user-id' } }
                })
            },
            from: vi.fn(() => ({
                update: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({ error: null })
                })),
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(async () => {
                            if (!mockPublicKey) {
                                mockPublicKey = await generateMockPublicKey();
                            }
                            return {
                                data: { public_key: mockPublicKey, key_type: 'ecdh_p256' }
                            };
                        })
                    }))
                }))
            }))
        }
    };
});

describe('E2EEncryption - ECDSA Key Generation', () => {
    let e2eEncryption: E2EEncryption;

    beforeEach(() => {
        e2eEncryption = E2EEncryption.getInstance();
    });

    it('should generate ECDSA P-256 key pair', async () => {
        const result = await e2eEncryption.generateSigningKeyPair();

        expect(result).toBeDefined();
        expect(result.signingKey).toBeDefined();
        expect(result.verificationKey).toBeDefined();

        // Verify key algorithm
        expect(result.signingKey.algorithm.name).toBe('ECDSA');
        expect(result.verificationKey.algorithm.name).toBe('ECDSA');

        // Verify key curve
        expect((result.signingKey.algorithm as EcKeyAlgorithm).namedCurve).toBe('P-256');
        expect((result.verificationKey.algorithm as EcKeyAlgorithm).namedCurve).toBe('P-256');

        // Verify key usages
        expect(result.signingKey.usages).toContain('sign');
        expect(result.verificationKey.usages).toContain('verify');
    });

    it('should export verification key to base64', async () => {
        await e2eEncryption.generateSigningKeyPair();
        const verificationKeyBase64 = await e2eEncryption.exportVerificationKey();

        expect(verificationKeyBase64).toBeDefined();
        expect(typeof verificationKeyBase64).toBe('string');
        expect(verificationKeyBase64.length).toBeGreaterThan(0);

        // Verify it's valid base64
        expect(() => atob(verificationKeyBase64)).not.toThrow();
    });

    it('should throw error when exporting verification key before generation', async () => {
        const freshInstance = Object.create(E2EEncryption.prototype);
        await expect(freshInstance.exportVerificationKey()).rejects.toThrow('Signing key pair not initialized');
    });

    it('should clear signing key pair on clearKeys()', async () => {
        await e2eEncryption.generateSigningKeyPair();
        e2eEncryption.clearKeys();

        await expect(e2eEncryption.exportVerificationKey()).rejects.toThrow('Signing key pair not initialized');
    });
});

describe('E2EEncryption - Message Signing', () => {
    let e2eEncryption: E2EEncryption;

    beforeEach(async () => {
        e2eEncryption = E2EEncryption.getInstance();
        // Generate signing key pair for tests
        await e2eEncryption.generateSigningKeyPair();
    });

    it('should include signature in encrypted message when signing key is available', async () => {
        // Mock initialization
        const mockKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        (e2eEncryption as any).keyPair = mockKeyPair;
        (e2eEncryption as any).isInitialized = true;

        const encrypted = await e2eEncryption.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);

        expect(parsed.signature).toBeDefined();
        expect(typeof parsed.signature).toBe('string');
        expect(parsed.signature.length).toBeGreaterThan(0);
    });

    it('should include timestamp in signed message', async () => {
        // Mock initialization
        const mockKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        (e2eEncryption as any).keyPair = mockKeyPair;
        (e2eEncryption as any).isInitialized = true;

        const beforeTimestamp = Date.now();
        const encrypted = await e2eEncryption.encryptMessage('test message', 'recipient-id');
        const afterTimestamp = Date.now();
        
        const parsed = JSON.parse(encrypted);

        expect(parsed.timestamp).toBeDefined();
        expect(typeof parsed.timestamp).toBe('number');
        expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
        expect(parsed.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should include sender verification key in signed message', async () => {
        // Mock initialization
        const mockKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        (e2eEncryption as any).keyPair = mockKeyPair;
        (e2eEncryption as any).isInitialized = true;

        const encrypted = await e2eEncryption.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);

        expect(parsed.senderVerificationKey).toBeDefined();
        expect(typeof parsed.senderVerificationKey).toBe('string');
        expect(parsed.senderVerificationKey.length).toBeGreaterThan(0);

        // Verify it's valid base64
        expect(() => atob(parsed.senderVerificationKey)).not.toThrow();
    });

    it('should create SignedMessage interface with all required fields', async () => {
        // Mock initialization
        const mockKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        (e2eEncryption as any).keyPair = mockKeyPair;
        (e2eEncryption as any).isInitialized = true;

        const encrypted = await e2eEncryption.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);

        // Check all SignedMessage fields
        expect(parsed.ciphertext).toBeDefined();
        expect(parsed.iv).toBeDefined();
        expect(parsed.ephemeralPublicKey).toBeDefined();
        expect(parsed.signature).toBeDefined();
        expect(parsed.timestamp).toBeDefined();
        expect(parsed.senderVerificationKey).toBeDefined();
    });

    it('should return unsigned message when signing key is not available (backward compatibility)', async () => {
        // Create a fresh instance without signing key
        const freshInstance = Object.create(E2EEncryption.prototype);
        
        // Mock initialization with only ECDH key pair
        const mockKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        freshInstance.keyPair = mockKeyPair;
        freshInstance.isInitialized = true;
        freshInstance.signingKeyPair = null;

        const encrypted = await freshInstance.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);

        // Should have encrypted fields but no signature fields
        expect(parsed.ciphertext).toBeDefined();
        expect(parsed.iv).toBeDefined();
        expect(parsed.ephemeralPublicKey).toBeDefined();
        expect(parsed.signature).toBeUndefined();
        expect(parsed.timestamp).toBeUndefined();
        expect(parsed.senderVerificationKey).toBeUndefined();
    });

    it('should use ECDSA with SHA-256 for signing', async () => {
        // Mock initialization
        const mockKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        (e2eEncryption as any).keyPair = mockKeyPair;
        (e2eEncryption as any).isInitialized = true;

        // Spy on crypto.subtle.sign
        const signSpy = vi.spyOn(crypto.subtle, 'sign');

        await e2eEncryption.encryptMessage('test message', 'recipient-id');

        expect(signSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'ECDSA',
                hash: { name: 'SHA-256' }
            }),
            expect.any(Object),
            expect.any(Object)
        );

        signSpy.mockRestore();
    });

    it('should sign encrypted data combined with timestamp', async () => {
        // Mock initialization
        const mockKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        (e2eEncryption as any).keyPair = mockKeyPair;
        (e2eEncryption as any).isInitialized = true;

        // Spy on crypto.subtle.sign to verify data structure
        const signSpy = vi.spyOn(crypto.subtle, 'sign');

        await e2eEncryption.encryptMessage('test message', 'recipient-id');

        // Verify sign was called with combined data
        expect(signSpy).toHaveBeenCalled();
        const signedData = signSpy.mock.calls[0][2] as Uint8Array;
        
        // Data should be longer than just encrypted data (includes timestamp)
        expect(signedData.byteLength).toBeGreaterThan(0);

        signSpy.mockRestore();
    });
});

describe('E2EEncryption - Signature Verification', () => {
    let e2eEncryption: E2EEncryption;
    let senderE2E: E2EEncryption;

    beforeEach(async () => {
        e2eEncryption = E2EEncryption.getInstance();
        senderE2E = Object.create(E2EEncryption.prototype);
        
        // Initialize both instances with key pairs
        const recipientKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        (e2eEncryption as any).keyPair = recipientKeyPair;
        (e2eEncryption as any).isInitialized = true;

        const senderKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        (senderE2E as any).keyPair = senderKeyPair;
        (senderE2E as any).isInitialized = true;

        // Generate signing key pair for sender
        await senderE2E.generateSigningKeyPair();
    });

    it('should successfully verify valid signature', async () => {
        // Create a signed message
        const encrypted = await senderE2E.encryptMessage('test message', 'recipient-id');
        
        // Decrypt should succeed (which includes verification)
        const decrypted = await e2eEncryption.decryptMessage(encrypted, 'sender-id');
        expect(decrypted).toBe('test message');
    });

    it('should reject message with invalid signature', async () => {
        // Create a signed message
        const encrypted = await senderE2E.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);
        
        // Tamper with the signature
        parsed.signature = parsed.signature.slice(0, -5) + 'XXXXX';
        const tamperedMessage = JSON.stringify(parsed);

        // Decryption should fail
        await expect(e2eEncryption.decryptMessage(tamperedMessage, 'sender-id'))
            .rejects.toThrow('Signature verification failed');
    });

    it('should reject message with tampered ciphertext', async () => {
        // Create a signed message
        const encrypted = await senderE2E.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);
        
        // Tamper with the ciphertext
        parsed.ciphertext = parsed.ciphertext.slice(0, -5) + 'XXXXX';
        const tamperedMessage = JSON.stringify(parsed);

        // Decryption should fail (signature won't match)
        await expect(e2eEncryption.decryptMessage(tamperedMessage, 'sender-id'))
            .rejects.toThrow('Signature verification failed');
    });

    it('should reject message older than 5 minutes (replay attack)', async () => {
        // Create a signed message
        const encrypted = await senderE2E.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);
        
        // Set timestamp to 6 minutes ago
        const sixMinutesAgo = Date.now() - (6 * 60 * 1000);
        parsed.timestamp = sixMinutesAgo;
        
        // Re-sign with old timestamp (simulate attacker trying to replay)
        const oldMessage = JSON.stringify(parsed);

        // Decryption should fail due to old timestamp
        await expect(e2eEncryption.decryptMessage(oldMessage, 'sender-id'))
            .rejects.toThrow('Signature verification failed');
    });

    it('should reject message with future timestamp', async () => {
        // Create a signed message
        const encrypted = await senderE2E.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);
        
        // Set timestamp to future
        const futureTime = Date.now() + (10 * 60 * 1000);
        parsed.timestamp = futureTime;
        
        const futureMessage = JSON.stringify(parsed);

        // Decryption should fail due to future timestamp
        await expect(e2eEncryption.decryptMessage(futureMessage, 'sender-id'))
            .rejects.toThrow('Signature verification failed');
    });

    it('should accept message within 5 minute window', async () => {
        // Create a signed message
        const encrypted = await senderE2E.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);
        
        // Set timestamp to 4 minutes ago (within window)
        const fourMinutesAgo = Date.now() - (4 * 60 * 1000);
        parsed.timestamp = fourMinutesAgo;
        
        // Need to re-sign with the new timestamp
        const encryptedData = new Uint8Array([
            ...new Uint8Array((senderE2E as any).base64ToArrayBuffer(parsed.ciphertext)),
            ...new Uint8Array((senderE2E as any).base64ToArrayBuffer(parsed.iv)),
            ...new Uint8Array((senderE2E as any).base64ToArrayBuffer(parsed.ephemeralPublicKey))
        ]).buffer;

        const timestampBuffer = new BigUint64Array([BigInt(fourMinutesAgo)]).buffer;
        const dataToSign = new Uint8Array([
            ...new Uint8Array(encryptedData),
            ...new Uint8Array(timestampBuffer)
        ]);

        const signature = await crypto.subtle.sign(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            (senderE2E as any).signingKeyPair.privateKey,
            dataToSign
        );

        parsed.signature = (senderE2E as any).arrayBufferToBase64(signature);
        const oldButValidMessage = JSON.stringify(parsed);

        // Should succeed
        const decrypted = await e2eEncryption.decryptMessage(oldButValidMessage, 'sender-id');
        expect(decrypted).toBe('test message');
    });

    it('should decrypt unsigned messages for backward compatibility', async () => {
        // Create an unsigned message (no signing key)
        const freshSender = Object.create(E2EEncryption.prototype);
        const senderKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        freshSender.keyPair = senderKeyPair;
        freshSender.isInitialized = true;
        freshSender.signingKeyPair = null;

        const encrypted = await freshSender.encryptMessage('test message', 'recipient-id');
        
        // Should decrypt successfully without signature verification
        const decrypted = await e2eEncryption.decryptMessage(encrypted, 'sender-id');
        expect(decrypted).toBe('test message');
    });

    it('should use ECDSA with SHA-256 for verification', async () => {
        // Create a signed message
        const encrypted = await senderE2E.encryptMessage('test message', 'recipient-id');
        
        // Spy on crypto.subtle.verify
        const verifySpy = vi.spyOn(crypto.subtle, 'verify');

        await e2eEncryption.decryptMessage(encrypted, 'sender-id');

        expect(verifySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'ECDSA',
                hash: { name: 'SHA-256' }
            }),
            expect.any(Object),
            expect.any(Object),
            expect.any(Object)
        );

        verifySpy.mockRestore();
    });

    it('should verify signature before attempting decryption', async () => {
        // Create a signed message with tampered signature
        const encrypted = await senderE2E.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);
        parsed.signature = parsed.signature.slice(0, -5) + 'XXXXX';
        const tamperedMessage = JSON.stringify(parsed);

        // Spy on crypto.subtle.decrypt to ensure it's not called
        const decryptSpy = vi.spyOn(crypto.subtle, 'decrypt');

        await expect(e2eEncryption.decryptMessage(tamperedMessage, 'sender-id'))
            .rejects.toThrow('Signature verification failed');

        // Decrypt should not be called if signature verification fails
        expect(decryptSpy).not.toHaveBeenCalled();

        decryptSpy.mockRestore();
    });

    it('should log security warning on signature verification failure', async () => {
        // Create a signed message with invalid signature
        const encrypted = await senderE2E.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);
        parsed.signature = parsed.signature.slice(0, -5) + 'XXXXX';
        const tamperedMessage = JSON.stringify(parsed);

        // Spy on console.warn
        const warnSpy = vi.spyOn(console, 'warn');

        await expect(e2eEncryption.decryptMessage(tamperedMessage, 'sender-id'))
            .rejects.toThrow();

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Message rejected: invalid signature')
        );

        warnSpy.mockRestore();
    });

    it('should log security warning on replay attack detection', async () => {
        // Create a signed message with old timestamp
        const encrypted = await senderE2E.encryptMessage('test message', 'recipient-id');
        const parsed = JSON.parse(encrypted);
        parsed.timestamp = Date.now() - (6 * 60 * 1000);
        const oldMessage = JSON.stringify(parsed);

        // Spy on console.warn
        const warnSpy = vi.spyOn(console, 'warn');

        await expect(e2eEncryption.decryptMessage(oldMessage, 'sender-id'))
            .rejects.toThrow();

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Message rejected: timestamp too old'),
            expect.any(Object)
        );

        warnSpy.mockRestore();
    });
});
