/**
 * Secure Key Storage Module
 * 
 * Provides secure storage for E2E encryption keys using IndexedDB with password-based encryption.
 * Keys are encrypted using AES-GCM-256 with a key derived from the user's password via PBKDF2.
 * 
 * Features:
 * - IndexedDB storage (more secure than localStorage)
 * - PBKDF2 key derivation with 100k iterations
 * - AES-GCM-256 encryption for stored keys
 * - Unique salt per user
 * - Unique IV per encryption operation
 * - Legacy key migration from localStorage
 */

// Database configuration
const DB_NAME = 'hybrid-messenger-keys';
const DB_VERSION = 1;
const STORE_NAME = 'encrypted_keys';
const KEY_RECORD_ID = 'user_keys';

// Cryptographic configuration
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';
const AES_KEY_LENGTH = 256;
const AES_IV_LENGTH = 12;
const SALT_LENGTH = 32;

/**
 * Structure of encrypted keys stored in IndexedDB
 */
interface EncryptedKeysRecord {
  id: string;
  encryptedPrivateKey: ArrayBuffer;
  encryptedSigningKey: ArrayBuffer;
  privateKeyIV: ArrayBuffer;
  signingKeyIV: ArrayBuffer;
  salt: ArrayBuffer;
  createdAt: number;
  updatedAt: number;
}

/**
 * Key pair structure for storing/retrieving keys
 */
interface KeyPair {
  privateKey: CryptoKey;
  signingKey: CryptoKey;
}

/**
 * Result of key derivation
 */
interface DerivedKeyResult {
  key: CryptoKey;
  salt: Uint8Array;
}

/**
 * Custom error class for SecureKeyStorage operations
 */
export class SecureKeyStorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'SecureKeyStorageError';
  }
}

/**
 * SecureKeyStorage class
 * 
 * Manages secure storage of cryptographic keys in IndexedDB with password-based encryption.
 */
export class SecureKeyStorage {
  private db: IDBDatabase | null = null;
  private cachedKeys: KeyPair | null = null;
  private derivedKey: CryptoKey | null = null;

  /**
   * Initialize the IndexedDB database and create object stores if needed
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        reject(new SecureKeyStorageError(
          'IndexedDB is not supported in this browser',
          'INDEXEDDB_NOT_SUPPORTED',
          false
        ));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new SecureKeyStorageError(
          'Failed to open IndexedDB',
          'INDEXEDDB_OPEN_FAILED',
          true
        ));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  /**
   * Derive a cryptographic key from a password using PBKDF2
   * 
   * @param password - User's password
   * @param salt - Optional salt (generates new one if not provided)
   * @returns Derived key and salt used
   */
  async deriveKey(password: string, salt?: Uint8Array): Promise<DerivedKeyResult> {
    try {
      // Generate salt if not provided
      const keySalt = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

      // Import password as key material
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      // Derive key using PBKDF2
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: keySalt.buffer as ArrayBuffer,
          iterations: PBKDF2_ITERATIONS,
          hash: PBKDF2_HASH
        },
        passwordKey,
        { name: 'AES-GCM', length: AES_KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );

      return {
        key: derivedKey,
        salt: keySalt
      };
    } catch (error) {
      throw new SecureKeyStorageError(
        'Failed to derive key from password',
        'KEY_DERIVATION_FAILED',
        true
      );
    }
  }

  /**
   * Encrypt and store keys in IndexedDB
   * 
   * @param keys - Private key and signing key to store
   * @param derivedKey - Key derived from user's password for encryption
   */
  async storeKeys(keys: KeyPair, derivedKey: CryptoKey): Promise<void> {
    if (!this.db) {
      throw new SecureKeyStorageError(
        'Database not initialized. Call initialize() first.',
        'DB_NOT_INITIALIZED',
        true
      );
    }

    try {
      // Export keys to raw format
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keys.privateKey);
      const signingKeyData = await crypto.subtle.exportKey('pkcs8', keys.signingKey);

      // Generate unique IVs for each key
      const privateKeyIV = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
      const signingKeyIV = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));

      // Encrypt keys with AES-GCM
      const encryptedPrivateKey = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: privateKeyIV },
        derivedKey,
        privateKeyData
      );

      const encryptedSigningKey = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: signingKeyIV },
        derivedKey,
        signingKeyData
      );

      // CRITICAL FIX: Preserve existing salt to maintain password stability
      // Only generate new salt on first creation
      const existingRecord = await this.getStoredRecord();
      const saltBuffer = existingRecord?.salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH)).buffer as ArrayBuffer;

      // Create record
      const record: EncryptedKeysRecord = {
        id: KEY_RECORD_ID,
        encryptedPrivateKey,
        encryptedSigningKey,
        privateKeyIV: privateKeyIV.buffer as ArrayBuffer,
        signingKeyIV: signingKeyIV.buffer as ArrayBuffer,
        salt: saltBuffer,
        createdAt: existingRecord?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      // Store in IndexedDB
      await this.putRecord(record);

      // Cache keys and derived key in memory
      this.cachedKeys = keys;
      this.derivedKey = derivedKey;
    } catch (error) {
      if (error instanceof SecureKeyStorageError) {
        throw error;
      }
      throw new SecureKeyStorageError(
        'Failed to encrypt and store keys',
        'ENCRYPTION_FAILED',
        true
      );
    }
  }

  /**
   * Retrieve and decrypt keys from IndexedDB
   * 
   * @param derivedKey - Key derived from user's password for decryption
   * @returns Decrypted keys or null if not found
   */
  async retrieveKeys(derivedKey: CryptoKey): Promise<KeyPair | null> {
    if (!this.db) {
      throw new SecureKeyStorageError(
        'Database not initialized. Call initialize() first.',
        'DB_NOT_INITIALIZED',
        true
      );
    }

    // Return cached keys if available
    if (this.cachedKeys) {
      return this.cachedKeys;
    }

    try {
      // Get record from IndexedDB
      const record = await this.getStoredRecord();
      if (!record) {
        return null;
      }

      // Decrypt keys
      const privateKeyData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(record.privateKeyIV) },
        derivedKey,
        record.encryptedPrivateKey
      );

      const signingKeyData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(record.signingKeyIV) },
        derivedKey,
        record.encryptedSigningKey
      );

      // Import keys
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyData,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits']
      );

      const signingKey = await crypto.subtle.importKey(
        'pkcs8',
        signingKeyData,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign']
      );

      const keys: KeyPair = { privateKey, signingKey };

      // Cache keys in memory
      this.cachedKeys = keys;

      return keys;
    } catch (error: any) {
      // Check if it's a decryption error (likely invalid password)
      if (error.name === 'OperationError' || error.message?.includes('decrypt')) {
        throw new SecureKeyStorageError(
          'Invalid password or corrupted data',
          'INVALID_PASSWORD',
          true
        );
      }

      throw new SecureKeyStorageError(
        'Failed to retrieve and decrypt keys',
        'DECRYPTION_FAILED',
        true
      );
    }
  }

  /**
   * Clear keys from memory (call on logout)
   */
  clearKeys(): void {
    this.cachedKeys = null;
    this.derivedKey = null;
  }

  /**
   * Change password by re-encrypting keys with new password
   * CRITICAL: Uses the SAME salt to maintain key derivation consistency
   * 
   * @param oldPassword - Current password
   * @param newPassword - New password to use
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    // 1. Get existing record to retrieve salt
    const existingRecord = await this.getStoredRecord();
    if (!existingRecord) {
      throw new SecureKeyStorageError('No keys to re-encrypt', 'NO_KEYS', false);
    }

    // 2. Derive key from old password with existing salt
    const oldDerivedKey = await this.deriveKey(oldPassword, new Uint8Array(existingRecord.salt));
    
    // 3. Retrieve and decrypt keys with old password
    const keys = await this.retrieveKeys(oldDerivedKey.key);
    
    if (!keys) {
      throw new SecureKeyStorageError('Invalid old password', 'INVALID_PASSWORD', true);
    }

    // 4. Derive new key with THE SAME salt (critical for stability)
    const newDerivedKey = await this.deriveKey(newPassword, new Uint8Array(existingRecord.salt));

    // 5. Re-encrypt keys with new password
    await this.storeKeys(keys, newDerivedKey.key);

    // 6. Update cached derived key
    this.derivedKey = newDerivedKey.key;
  }

  /**
   * Setup automatic cache clearing on page hide/unload and visibility changes
   * Clears sensitive key material from memory when page is hidden for > 5 minutes
   */
  setupAutoClearing(): void {
    let hiddenTime: number | null = null;

    // Clear on page hide/unload
    window.addEventListener('pagehide', () => this.clearKeys());
    window.addEventListener('beforeunload', () => this.clearKeys());

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else {
        hiddenTime = null;
      }
    });

    // Check every minute if page has been hidden > 5 minutes
    setInterval(() => {
      if (hiddenTime && Date.now() - hiddenTime > 5 * 60 * 1000) {
        this.clearKeys();
        hiddenTime = null;
      }
    }, 60000);
  }

  /**
   * Check if legacy keys exist in localStorage
   * 
   * @returns True if legacy keys are found
   */
  hasLegacyKeys(): boolean {
    const ecdhKeys = localStorage.getItem('ecdh_keys');
    const ecdsaKeys = localStorage.getItem('ecdsa_keys');
    return !!(ecdhKeys || ecdsaKeys);
  }

  /**
   * Migrate keys from localStorage to IndexedDB
   * CRITICAL FIX: Preserves existing salt or creates one only once
   * 
   * @param password - Password to encrypt keys with
   */
  async migrateFromLocalStorage(password: string): Promise<void> {
    if (!this.hasLegacyKeys()) {
      throw new SecureKeyStorageError(
        'No legacy keys found in localStorage',
        'NO_LEGACY_KEYS',
        false
      );
    }

    try {
      // Load legacy keys
      const legacyKeys = this.loadLegacyKeys();
      if (!legacyKeys) {
        throw new Error('Failed to load legacy keys');
      }

      // CRITICAL FIX: Check if we already have a record with salt
      const existingRecord = await this.getStoredRecord();
      const salt = existingRecord?.salt 
        ? new Uint8Array(existingRecord.salt)
        : undefined; // Let deriveKey generate new salt only if none exists

      // Derive key from password (with existing salt if available)
      const { key: derivedKey, salt: finalSalt } = await this.deriveKey(password, salt);

      // Import legacy keys
      const privateKey = await this.importLegacyKey(
        legacyKeys.privateKey,
        'ECDH'
      );

      const signingKey = legacyKeys.signingKey
        ? await this.importLegacyKey(legacyKeys.signingKey, 'ECDSA')
        : await this.generateDefaultSigningKey();

      // Store in IndexedDB with encryption (preserving salt)
      await this.storeKeysWithSalt({ privateKey, signingKey }, derivedKey, finalSalt);

      // Verify migration by attempting to retrieve
      const retrieved = await this.retrieveKeys(derivedKey);
      if (!retrieved) {
        throw new Error('Migration verification failed');
      }

      // Delete legacy keys from localStorage
      this.deleteLegacyKeys();
    } catch (error) {
      throw new SecureKeyStorageError(
        `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MIGRATION_FAILED',
        true
      );
    }
  }

  /**
   * Store keys with a specific salt (used during migration)
   */
  private async storeKeysWithSalt(
    keys: KeyPair,
    derivedKey: CryptoKey,
    salt: Uint8Array
  ): Promise<void> {
    if (!this.db) {
      throw new SecureKeyStorageError(
        'Database not initialized',
        'DB_NOT_INITIALIZED',
        true
      );
    }

    try {
      // Export keys to raw format
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keys.privateKey);
      const signingKeyData = await crypto.subtle.exportKey('pkcs8', keys.signingKey);

      // Generate unique IVs
      const privateKeyIV = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
      const signingKeyIV = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));

      // Encrypt keys
      const encryptedPrivateKey = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: privateKeyIV },
        derivedKey,
        privateKeyData
      );

      const encryptedSigningKey = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: signingKeyIV },
        derivedKey,
        signingKeyData
      );

      // Get existing record to preserve createdAt
      const existingRecord = await this.getStoredRecord();

      // Create record
      const record: EncryptedKeysRecord = {
        id: KEY_RECORD_ID,
        encryptedPrivateKey,
        encryptedSigningKey,
        privateKeyIV: privateKeyIV.buffer as ArrayBuffer,
        signingKeyIV: signingKeyIV.buffer as ArrayBuffer,
        salt: salt.buffer as ArrayBuffer,
        createdAt: existingRecord?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      // Store in IndexedDB
      await this.putRecord(record);

      // Cache keys and derived key
      this.cachedKeys = keys;
      this.derivedKey = derivedKey;
    } catch (error) {
      throw new SecureKeyStorageError(
        'Failed to store keys with salt',
        'STORE_WITH_SALT_FAILED',
        true
      );
    }
  }

  /**
   * Get stored record from IndexedDB
   */
  private async getStoredRecord(): Promise<EncryptedKeysRecord | null> {
    if (!this.db) {
      throw new SecureKeyStorageError(
        'Database not initialized',
        'DB_NOT_INITIALIZED',
        true
      );
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY_RECORD_ID);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new SecureKeyStorageError(
          'Failed to retrieve record from IndexedDB',
          'INDEXEDDB_GET_FAILED',
          true
        ));
      };
    });
  }

  /**
   * Put record into IndexedDB
   */
  private async putRecord(record: EncryptedKeysRecord): Promise<void> {
    if (!this.db) {
      throw new SecureKeyStorageError(
        'Database not initialized',
        'DB_NOT_INITIALIZED',
        true
      );
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new SecureKeyStorageError(
          'Failed to store record in IndexedDB',
          'INDEXEDDB_PUT_FAILED',
          true
        ));
      };
    });
  }

  /**
   * Load legacy keys from localStorage
   */
  private loadLegacyKeys(): any {
    const ecdhStored = localStorage.getItem('ecdh_keys');
    const ecdsaStored = localStorage.getItem('ecdsa_keys');

    if (!ecdhStored) {
      return null;
    }

    const ecdhKeys = JSON.parse(ecdhStored);
    const ecdsaKeys = ecdsaStored ? JSON.parse(ecdsaStored) : null;

    return {
      privateKey: ecdhKeys.privateKey,
      signingKey: ecdsaKeys?.signingKey || null
    };
  }

  /**
   * Delete legacy keys from localStorage
   */
  private deleteLegacyKeys(): void {
    localStorage.removeItem('ecdh_keys');
    localStorage.removeItem('ecdsa_keys');
  }

  /**
   * Import legacy key from base64 string
   */
  private async importLegacyKey(
    keyData: string,
    algorithm: 'ECDH' | 'ECDSA'
  ): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyData);

    if (algorithm === 'ECDH') {
      return await crypto.subtle.importKey(
        'pkcs8',
        keyBuffer,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits']
      );
    } else {
      return await crypto.subtle.importKey(
        'pkcs8',
        keyBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign']
      );
    }
  }

  /**
   * Generate a default signing key if none exists
   */
  private async generateDefaultSigningKey(): Promise<CryptoKey> {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );
    return keyPair.privateKey;
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Get the salt from stored record (useful for re-deriving key)
   */
  async getSalt(): Promise<Uint8Array | null> {
    const record = await this.getStoredRecord();
    return record?.salt ? new Uint8Array(record.salt) : null;
  }
}

// Export singleton instance
let instance: SecureKeyStorage | null = null;

export function getSecureKeyStorage(): SecureKeyStorage {
  if (!instance) {
    instance = new SecureKeyStorage();
  }
  return instance;
}

// Export default
export default SecureKeyStorage;
