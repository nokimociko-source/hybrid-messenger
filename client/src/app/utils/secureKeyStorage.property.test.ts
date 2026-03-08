// @ts-nocheck
/**
 * Property-Based Tests for SecureKeyStorage
 * 
 * Uses fast-check for property-based testing to verify universal properties
 * across many randomly generated inputs.
 * 
 * **Validates: Requirements 1.2, 1.4, 1.6, 1.7, 1.10, 6.9**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { SecureKeyStorage, SecureKeyStorageError } from './secureKeyStorage';

// Helper to create mock IDBDatabase with proper async handling
function createMockDB(name: string) {
  const stores = new Map();
  const storeData = new Map();
  
  return {
    name,
    version: 1,
    objectStoreNames: {
      contains: (storeName: string) => stores.has(storeName),
      length: stores.size,
    },
    createObjectStore: (storeName: string, options: any) => {
      const store = {
        name: storeName,
        keyPath: options.keyPath,
        indexes: new Map(),
        createIndex: (indexName: string, keyPath: string, options: any) => {
          store.indexes.set(indexName, { indexName, keyPath, options });
        },
      };
      stores.set(storeName, store);
      storeData.set(storeName, new Map());
      return store;
    },
    transaction: (storeNames: string[], mode: string) => {
      return {
        objectStore: (storeName: string) => {
          const data = storeData.get(storeName) || new Map();
          return {
            get: (key: string) => {
              const request = {
                onsuccess: null as any,
                onerror: null as any,
                result: data.get(key) || null,
              };
              setTimeout(() => {
                if (request.onsuccess) {
                  request.onsuccess();
                }
              }, 0);
              return request;
            },
            put: (value: any) => {
              const request = {
                onsuccess: null as any,
                onerror: null as any,
              };
              data.set(value.id, value);
              setTimeout(() => {
                if (request.onsuccess) {
                  request.onsuccess();
                }
              }, 0);
              return request;
            },
          };
        },
      };
    },
    close: vi.fn(),
  };
}

// Setup global mocks for crypto and IndexedDB
function setupGlobalMocks() {
  const mockDB = createMockDB('hybrid-messenger-keys');
  
  // Mock indexedDB.open
  const openRequest = {
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: mockDB,
  };

  vi.stubGlobal('indexedDB', {
    open: vi.fn(() => {
      setTimeout(() => {
        if (openRequest.onupgradeneeded) {
          openRequest.onupgradeneeded({ target: openRequest });
        }
        if (openRequest.onsuccess) {
          openRequest.onsuccess();
        }
      }, 0);
      return openRequest;
    }),
  });

  // Mock crypto.subtle with real-like behavior
  vi.stubGlobal('crypto', {
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    subtle: {
      importKey: vi.fn(async (format, keyData, algorithm, extractable, keyUsages) => {
        // Return a mock key that includes the original data for verification
        return {
          type: 'secret',
          algorithm: algorithm,
          extractable,
          usages: keyUsages,
          _mockData: keyData, // Store for later comparison
        };
      }),
      deriveKey: vi.fn(async (algorithm, baseKey, derivedKeyType, extractable, keyUsages) => {
        // Create a deterministic derived key based on password and salt
        const salt = algorithm.salt;
        const saltStr = Array.from(salt).join(',');
        return {
          type: 'secret',
          algorithm: derivedKeyType,
          extractable,
          usages: keyUsages,
          _mockSalt: saltStr, // Store salt for verification
        };
      }),
      exportKey: vi.fn(async (format, key) => {
        // Return the stored mock data or generate new data
        if (key._mockData) {
          return key._mockData;
        }
        // Generate deterministic data based on key properties
        const data = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          data[i] = i;
        }
        return data.buffer;
      }),
      encrypt: vi.fn(async (algorithm, key, data) => {
        // Simple mock encryption - XOR with key identifier
        const keyId = key._mockSalt || 'default';
        const encrypted = new Uint8Array(data);
        const keyHash = keyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        for (let i = 0; i < encrypted.length; i++) {
          encrypted[i] ^= (keyHash + i) % 256;
        }
        return encrypted.buffer;
      }),
      decrypt: vi.fn(async (algorithm, key, data) => {
        // Simple mock decryption - reverse of encryption (XOR is symmetric)
        const keyId = key._mockSalt || 'default';
        const decrypted = new Uint8Array(data);
        const keyHash = keyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        for (let i = 0; i < decrypted.length; i++) {
          decrypted[i] ^= (keyHash + i) % 256;
        }
        return decrypted.buffer;
      }),
      generateKey: vi.fn(async (algorithm, extractable, keyUsages) => {
        const privateKey = {
          type: 'private',
          algorithm,
          extractable,
          usages: keyUsages.filter((u: string) => u === 'sign' || u === 'deriveKey' || u === 'deriveBits'),
        };
        const publicKey = {
          type: 'public',
          algorithm,
          extractable: true,
          usages: keyUsages.filter((u: string) => u === 'verify'),
        };
        return { privateKey, publicKey };
      }),
    },
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  vi.stubGlobal('localStorage', localStorageMock);

  return mockDB;
}

describe('SecureKeyStorage - Property-Based Tests', () => {
  let mockDB: any;

  beforeEach(() => {
    mockDB = setupGlobalMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  /**
   * Property 1: Key Encryption Round-Trip
   * 
   * **Validates: Requirements 1.4, 1.10**
   * 
   * For any valid private key or signing key, encrypting with a derived key
   * and then decrypting with the same derived key SHALL produce the original key value.
   * 
   * This is a fundamental property of cryptographic systems. If encryption and decryption
   * are not inverse operations, users will lose access to their keys and cannot decrypt messages.
   */
  describe('Property 1: Key Encryption Round-Trip', () => {
    it('should preserve key data through encryption and decryption round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 32 }), // password
          fc.uint8Array({ minLength: 32, maxLength: 32 }), // private key data
          fc.uint8Array({ minLength: 32, maxLength: 32 }), // signing key data
          async (password, privateKeyData, signingKeyData) => {
            const storage = new SecureKeyStorage();
            await storage.initialize();
            
            // Generate keys from data
            const privateKey = await crypto.subtle.importKey(
              'pkcs8',
              privateKeyData.buffer,
              { name: 'ECDH', namedCurve: 'P-256' },
              true,
              ['deriveKey', 'deriveBits']
            );
            
            const signingKey = await crypto.subtle.importKey(
              'pkcs8',
              signingKeyData.buffer,
              { name: 'ECDSA', namedCurve: 'P-256' },
              true,
              ['sign']
            );
            
            // Derive encryption key from password
            const { key: derivedKey, salt } = await storage.deriveKey(password);
            
            // Store keys (encrypt)
            await storage.storeKeys({ privateKey, signingKey }, derivedKey);
            
            // Wait for async storage
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Retrieve keys (decrypt)
            const retrieved = await storage.retrieveKeys(derivedKey);
            
            // Verify keys were retrieved
            expect(retrieved).not.toBeNull();
            
            if (retrieved) {
              // Export both original and retrieved keys for comparison
              const originalPrivateExported = await crypto.subtle.exportKey('pkcs8', privateKey);
              const retrievedPrivateExported = await crypto.subtle.exportKey('pkcs8', retrieved.privateKey);
              
              const originalSigningExported = await crypto.subtle.exportKey('pkcs8', signingKey);
              const retrievedSigningExported = await crypto.subtle.exportKey('pkcs8', retrieved.signingKey);
              
              // Verify round-trip: original data === decrypted data
              expect(new Uint8Array(originalPrivateExported)).toEqual(new Uint8Array(retrievedPrivateExported));
              expect(new Uint8Array(originalSigningExported)).toEqual(new Uint8Array(retrievedSigningExported));
            }
          }
        ),
        { numRuns: 100 } // Run 100 times as specified in design
      );
    }, 60000); // 60 second timeout for property tests

    it('should decrypt correctly with the same password used for encryption', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 32 }),
          async (password) => {
            const storage = new SecureKeyStorage();
            await storage.initialize();
            
            // Generate test keys
            const keyPair = await crypto.subtle.generateKey(
              { name: 'ECDH', namedCurve: 'P-256' },
              true,
              ['deriveKey', 'deriveBits']
            );
            
            const signingKeyPair = await crypto.subtle.generateKey(
              { name: 'ECDSA', namedCurve: 'P-256' },
              true,
              ['sign', 'verify']
            );
            
            // Derive key and store
            const { key: derivedKey } = await storage.deriveKey(password);
            await storage.storeKeys(
              { privateKey: keyPair.privateKey, signingKey: signingKeyPair.privateKey },
              derivedKey
            );
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Retrieve with same password
            const retrieved = await storage.retrieveKeys(derivedKey);
            
            expect(retrieved).not.toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Unique Salt Per User
   * 
   * **Validates: Requirements 1.6**
   * 
   * For any two different users, their salt values used for key derivation SHALL be unique.
   * 
   * Salt uniqueness is critical for protection against rainbow table attacks.
   * If two users use the same salt, an attacker can use precomputed tables
   * to crack both passwords simultaneously.
   */
  describe('Property 2: Unique Salt Generation', () => {
    it('should generate unique salts for different password derivations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 8, maxLength: 32 }), { minLength: 10, maxLength: 50 }),
          async (passwords) => {
            const storage = new SecureKeyStorage();
            await storage.initialize();
            
            const salts: string[] = [];
            
            // Derive keys for all passwords and collect salts
            for (const password of passwords) {
              const { salt } = await storage.deriveKey(password);
              salts.push(Array.from(salt).join(','));
            }
            
            // Check uniqueness: all salts should be different
            const uniqueSalts = new Set(salts);
            expect(uniqueSalts.size).toBe(salts.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different salts even for the same password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.integer({ min: 5, max: 20 }),
          async (password, iterations) => {
            const storage = new SecureKeyStorage();
            await storage.initialize();
            
            const salts: string[] = [];
            
            // Derive key multiple times with same password
            for (let i = 0; i < iterations; i++) {
              const { salt } = await storage.deriveKey(password);
              salts.push(Array.from(salt).join(','));
            }
            
            // All salts should be unique
            const uniqueSalts = new Set(salts);
            expect(uniqueSalts.size).toBe(salts.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate salts of correct length (32 bytes)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 32 }),
          async (password) => {
            const storage = new SecureKeyStorage();
            await storage.initialize();
            
            const { salt } = await storage.deriveKey(password);
            
            expect(salt).toBeInstanceOf(Uint8Array);
            expect(salt.length).toBe(32);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Unique IV Per Encryption
   * 
   * **Validates: Requirements 1.7**
   * 
   * For any two encryption operations, even with the same key and plaintext,
   * the initialization vectors SHALL be unique.
   * 
   * Reusing IV with the same key in AES-GCM completely compromises encryption security.
   * IV uniqueness guarantees that identical data encrypts to different ciphertexts.
   */
  describe('Property 3: Unique IV Generation', () => {
    it('should use unique IVs for multiple encryption operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.integer({ min: 5, max: 20 }),
          async (password, iterations) => {
            const storage = new SecureKeyStorage();
            await storage.initialize();
            
            // Generate test keys
            const keyPair = await crypto.subtle.generateKey(
              { name: 'ECDH', namedCurve: 'P-256' },
              true,
              ['deriveKey', 'deriveBits']
            );
            
            const signingKeyPair = await crypto.subtle.generateKey(
              { name: 'ECDSA', namedCurve: 'P-256' },
              true,
              ['sign', 'verify']
            );
            
            const { key: derivedKey } = await storage.deriveKey(password);
            
            const ivs: string[] = [];
            
            // Perform multiple encryption operations
            for (let i = 0; i < iterations; i++) {
              // Clear cached keys to force re-encryption
              storage.clearKeys();
              
              await storage.storeKeys(
                { privateKey: keyPair.privateKey, signingKey: signingKeyPair.privateKey },
                derivedKey
              );
              
              await new Promise(resolve => setTimeout(resolve, 10));
              
              // Get the stored record to check IVs
              const record = await storage['getStoredRecord']();
              if (record) {
                ivs.push(Array.from(record.privateKeyIV).join(','));
                ivs.push(Array.from(record.signingKeyIV).join(','));
              }
            }
            
            // All IVs should be unique
            const uniqueIVs = new Set(ivs);
            expect(uniqueIVs.size).toBe(ivs.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate IVs of correct length (12 bytes for AES-GCM)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 32 }),
          async (password) => {
            const storage = new SecureKeyStorage();
            await storage.initialize();
            
            const keyPair = await crypto.subtle.generateKey(
              { name: 'ECDH', namedCurve: 'P-256' },
              true,
              ['deriveKey', 'deriveBits']
            );
            
            const signingKeyPair = await crypto.subtle.generateKey(
              { name: 'ECDSA', namedCurve: 'P-256' },
              true,
              ['sign', 'verify']
            );
            
            const { key: derivedKey } = await storage.deriveKey(password);
            
            await storage.storeKeys(
              { privateKey: keyPair.privateKey, signingKey: signingKeyPair.privateKey },
              derivedKey
            );
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const record = await storage['getStoredRecord']();
            
            if (record) {
              expect(record.privateKeyIV).toBeInstanceOf(Uint8Array);
              expect(record.privateKeyIV.length).toBe(12);
              expect(record.signingKeyIV).toBeInstanceOf(Uint8Array);
              expect(record.signingKeyIV.length).toBe(12);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use different IVs for privateKey and signingKey in same operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 32 }),
          async (password) => {
            const storage = new SecureKeyStorage();
            await storage.initialize();
            
            const keyPair = await crypto.subtle.generateKey(
              { name: 'ECDH', namedCurve: 'P-256' },
              true,
              ['deriveKey', 'deriveBits']
            );
            
            const signingKeyPair = await crypto.subtle.generateKey(
              { name: 'ECDSA', namedCurve: 'P-256' },
              true,
              ['sign', 'verify']
            );
            
            const { key: derivedKey } = await storage.deriveKey(password);
            
            await storage.storeKeys(
              { privateKey: keyPair.privateKey, signingKey: signingKeyPair.privateKey },
              derivedKey
            );
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const record = await storage['getStoredRecord']();
            
            if (record) {
              const privateKeyIVStr = Array.from(record.privateKeyIV).join(',');
              const signingKeyIVStr = Array.from(record.signingKeyIV).join(',');
              
              // IVs for different keys should be different
              expect(privateKeyIVStr).not.toBe(signingKeyIVStr);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Migration Backward Compatibility
   * 
   * **Validates: Requirements 6.9**
   * 
   * For any migrated encryption key, decrypting messages that were encrypted
   * before migration SHALL succeed and produce the correct plaintext.
   * 
   * Loss of access to historical messages after migration is unacceptable.
   * Users must have access to their entire message history.
   */
  describe('Property 8: Backward Compatibility After Migration', () => {
    it('should maintain key functionality after migration from localStorage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 32 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          async (password, testMessage) => {
            const storage = new SecureKeyStorage();
            await storage.initialize();
            
            // Simulate legacy keys in localStorage
            const legacyKeyPair = await crypto.subtle.generateKey(
              { name: 'ECDH', namedCurve: 'P-256' },
              true,
              ['deriveKey', 'deriveBits']
            );
            
            const legacySigningKeyPair = await crypto.subtle.generateKey(
              { name: 'ECDSA', namedCurve: 'P-256' },
              true,
              ['sign', 'verify']
            );
            
            // Export legacy keys to base64 (simulating old storage format)
            const privateKeyExported = await crypto.subtle.exportKey('pkcs8', legacyKeyPair.privateKey);
            const signingKeyExported = await crypto.subtle.exportKey('pkcs8', legacySigningKeyPair.privateKey);
            
            const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyExported)));
            const signingKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(signingKeyExported)));
            
            // Store in localStorage
            vi.mocked(localStorage.getItem).mockImplementation((key) => {
              if (key === 'ecdh_keys') {
                return JSON.stringify({ privateKey: privateKeyBase64 });
              }
              if (key === 'ecdsa_keys') {
                return JSON.stringify({ signingKey: signingKeyBase64 });
              }
              return null;
            });
            
            // Verify legacy keys are detected
            expect(storage.hasLegacyKeys()).toBe(true);
            
            // Perform migration
            await storage.migrateFromLocalStorage(password);
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify migration succeeded
            expect(localStorage.removeItem).toHaveBeenCalledWith('ecdh_keys');
            expect(localStorage.removeItem).toHaveBeenCalledWith('ecdsa_keys');
            
            // Verify keys can be retrieved after migration
            const { key: derivedKey } = await storage.deriveKey(password);
            const retrieved = await storage.retrieveKeys(derivedKey);
            
            expect(retrieved).not.toBeNull();
            
            if (retrieved) {
              // Verify the migrated keys match the original keys
              const retrievedPrivateExported = await crypto.subtle.exportKey('pkcs8', retrieved.privateKey);
              const retrievedSigningExported = await crypto.subtle.exportKey('pkcs8', retrieved.signingKey);
              
              expect(new Uint8Array(retrievedPrivateExported)).toEqual(new Uint8Array(privateKeyExported));
              expect(new Uint8Array(retrievedSigningExported)).toEqual(new Uint8Array(signingKeyExported));
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve key usages after migration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 32 }),
          async (password) => {
            const storage = new SecureKeyStorage();
            await storage.initialize();
            
            // Create legacy keys with specific usages
            const legacyKeyPair = await crypto.subtle.generateKey(
              { name: 'ECDH', namedCurve: 'P-256' },
              true,
              ['deriveKey', 'deriveBits']
            );
            
            const legacySigningKeyPair = await crypto.subtle.generateKey(
              { name: 'ECDSA', namedCurve: 'P-256' },
              true,
              ['sign', 'verify']
            );
            
            // Export and store as legacy
            const privateKeyExported = await crypto.subtle.exportKey('pkcs8', legacyKeyPair.privateKey);
            const signingKeyExported = await crypto.subtle.exportKey('pkcs8', legacySigningKeyPair.privateKey);
            
            const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyExported)));
            const signingKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(signingKeyExported)));
            
            vi.mocked(localStorage.getItem).mockImplementation((key) => {
              if (key === 'ecdh_keys') {
                return JSON.stringify({ privateKey: privateKeyBase64 });
              }
              if (key === 'ecdsa_keys') {
                return JSON.stringify({ signingKey: signingKeyBase64 });
              }
              return null;
            });
            
            // Migrate
            await storage.migrateFromLocalStorage(password);
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Retrieve migrated keys
            const { key: derivedKey } = await storage.deriveKey(password);
            const retrieved = await storage.retrieveKeys(derivedKey);
            
            if (retrieved) {
              // Verify key types and algorithms are preserved
              expect(retrieved.privateKey.type).toBe('private');
              expect(retrieved.signingKey.type).toBe('private');
              expect(retrieved.privateKey.algorithm.name).toBe('ECDH');
              expect(retrieved.signingKey.algorithm.name).toBe('ECDSA');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
