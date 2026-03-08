import { logger } from './logger';
/**
 * Key Migration Module
 * 
 * Handles migration of legacy encryption keys from localStorage to secure IndexedDB storage.
 * Provides backup, verification, and rollback capabilities to ensure safe migration.
 * 
 * Features:
 * - Detection of legacy keys in localStorage
 * - Automatic backup creation before migration
 * - Migration verification through test message encryption/decryption
 * - Rollback capability on migration failure
 * - Safe deletion of legacy keys after successful migration
 */

import { SecureKeyStorage, SecureKeyStorageError } from './secureKeyStorage';

/**
 * Status of the migration process
 */
export interface MigrationStatus {
  hasLegacyKeys: boolean;
  migrationRequired: boolean;
  migrationCompleted: boolean;
  error?: string;
}

/**
 * Backup of legacy keys for rollback
 */
interface LegacyKeysBackup {
  ecdhKeys: string | null;
  ecdsaKeys: string | null;
  timestamp: number;
}

/**
 * Structure of legacy keys stored in localStorage
 */
interface LegacyKeys {
  privateKey: string;
  publicKey?: string;
  signingKey?: string;
  verificationKey?: string;
}

/**
 * Custom error class for migration operations
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * KeyMigration class
 * 
 * Manages the migration of encryption keys from localStorage to IndexedDB
 * with backup and verification capabilities.
 */
export class KeyMigration {
  private secureKeyStorage: SecureKeyStorage;
  private backup: LegacyKeysBackup | null = null;

  constructor(secureKeyStorage: SecureKeyStorage) {
    this.secureKeyStorage = secureKeyStorage;
  }

  /**
   * Check the current migration status
   * 
   * @returns Status indicating if migration is needed or completed
   */
  async checkMigrationStatus(): Promise<MigrationStatus> {
    try {
      const hasLegacyKeys = this.secureKeyStorage.hasLegacyKeys();
      
      // Check if keys exist in IndexedDB
      let hasNewKeys = false;
      try {
        await this.secureKeyStorage.initialize();
        const salt = await this.secureKeyStorage.getSalt();
        hasNewKeys = salt !== null;
      } catch (error) {
        // If initialization fails, assume no new keys
        hasNewKeys = false;
      }

      return {
        hasLegacyKeys,
        migrationRequired: hasLegacyKeys && !hasNewKeys,
        migrationCompleted: !hasLegacyKeys && hasNewKeys
      };
    } catch (error) {
      return {
        hasLegacyKeys: false,
        migrationRequired: false,
        migrationCompleted: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform migration of keys from localStorage to IndexedDB
   * 
   * @param password - Password to encrypt keys with
   * @returns True if migration succeeded, false otherwise
   */
  async migrate(password: string): Promise<boolean> {
    try {
      // 1. Check if migration is needed
      const status = await this.checkMigrationStatus();
      if (!status.migrationRequired) {
        throw new MigrationError(
          'Migration not required',
          'MIGRATION_NOT_REQUIRED',
          false
        );
      }

      // 2. Create backup of legacy keys
      this.backup = this.createBackup();
      if (!this.backup.ecdhKeys) {
        throw new MigrationError(
          'No legacy keys found to migrate',
          'NO_LEGACY_KEYS',
          false
        );
      }

      // 3. Initialize secure storage
      await this.secureKeyStorage.initialize();

      // 4. Load legacy keys
      const legacyKeys = this.loadLegacyKeys();
      if (!legacyKeys) {
        throw new MigrationError(
          'Failed to load legacy keys',
          'LOAD_FAILED',
          true
        );
      }

      // 5. Derive encryption key from password
      const { key: derivedKey, salt } = await this.secureKeyStorage.deriveKey(password);

      // 6. Import legacy keys as CryptoKey objects
      const privateKey = await this.importLegacyKey(
        legacyKeys.privateKey,
        'ECDH'
      );

      const signingKey = legacyKeys.signingKey
        ? await this.importLegacyKey(legacyKeys.signingKey, 'ECDSA')
        : await this.generateDefaultSigningKey();

      // 7. Store keys in IndexedDB with encryption
      await this.secureKeyStorage.storeKeys(
        { privateKey, signingKey },
        derivedKey
      );

      // 8. Verify migration
      const verified = await this.verifyMigration(derivedKey);
      if (!verified) {
        throw new MigrationError(
          'Migration verification failed',
          'VERIFICATION_FAILED',
          true
        );
      }

      // 9. Delete legacy keys from localStorage
      this.deleteLegacyKeys();

      // 10. Clear backup after successful migration
      this.backup = null;

      return true;
    } catch (error) {
      logger.error('Migration failed:', error);
      
      // Attempt rollback
      await this.rollback();

      return false;
    }
  }

  /**
   * Verify migration by testing key retrieval and encryption/decryption
   * 
   * @param derivedKey - The derived key used for encryption
   * @returns True if verification succeeded
   */
  async verifyMigration(derivedKey?: CryptoKey): Promise<boolean> {
    try {
      // If no derived key provided, we can't verify
      if (!derivedKey) {
        logger.warn('Cannot verify migration without derived key');
        return false;
      }

      // 1. Try to retrieve keys from IndexedDB
      const retrievedKeys = await this.secureKeyStorage.retrieveKeys(derivedKey);
      if (!retrievedKeys) {
        logger.error('Failed to retrieve keys from IndexedDB');
        return false;
      }

      // 2. Verify keys are valid CryptoKey objects
      if (!retrievedKeys.privateKey || !retrievedKeys.signingKey) {
        logger.error('Retrieved keys are invalid');
        return false;
      }

      // 3. Test encryption/decryption with private key
      // Create a test message
      const testMessage = new TextEncoder().encode('Migration verification test');
      
      // Generate a test ephemeral key pair for ECDH
      const ephemeralKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits']
      );

      // Derive a shared secret using the retrieved private key
      const sharedSecret = await crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: ephemeralKeyPair.publicKey
        },
        retrievedKeys.privateKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Encrypt test message
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sharedSecret,
        testMessage
      );

      // Decrypt test message
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        sharedSecret,
        encrypted
      );

      // Verify decrypted message matches original
      const decryptedText = new TextDecoder().decode(decrypted);
      const originalText = new TextDecoder().decode(testMessage);
      
      if (decryptedText !== originalText) {
        logger.error('Decrypted message does not match original');
        return false;
      }

      // 4. Test signing with signing key
      const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        retrievedKeys.signingKey,
        testMessage
      );

      if (!signature || signature.byteLength === 0) {
        logger.error('Failed to create signature with signing key');
        return false;
      }

      logger.info('Migration verification successful');
      return true;
    } catch (error) {
      logger.error('Migration verification failed:', error);
      return false;
    }
  }

  /**
   * Rollback migration by restoring legacy keys from backup
   */
  async rollback(): Promise<void> {
    try {
      if (!this.backup) {
        logger.warn('No backup available for rollback');
        return;
      }

      logger.info('Rolling back migration...');

      // Restore legacy keys to localStorage
      if (this.backup.ecdhKeys) {
        localStorage.setItem('ecdh_keys', this.backup.ecdhKeys);
      }
      if (this.backup.ecdsaKeys) {
        localStorage.setItem('ecdsa_keys', this.backup.ecdsaKeys);
      }

      // Clear any partially migrated data from IndexedDB
      try {
        this.secureKeyStorage.clearKeys();
      } catch (error) {
        logger.error('Failed to clear IndexedDB during rollback:', error);
      }

      logger.info('Migration rolled back successfully. Legacy keys preserved.');
      
      // Clear backup
      this.backup = null;
    } catch (error) {
      logger.error('Rollback failed:', error);
      throw new MigrationError(
        'Failed to rollback migration',
        'ROLLBACK_FAILED',
        false
      );
    }
  }

  /**
   * Load legacy keys from localStorage
   * 
   * @returns Legacy keys object or null if not found
   */
  loadLegacyKeys(): LegacyKeys | null {
    try {
      const ecdhStored = localStorage.getItem('ecdh_keys');
      const ecdsaStored = localStorage.getItem('ecdsa_keys');

      if (!ecdhStored) {
        return null;
      }

      const ecdhKeys = JSON.parse(ecdhStored);
      const ecdsaKeys = ecdsaStored ? JSON.parse(ecdsaStored) : null;

      return {
        privateKey: ecdhKeys.privateKey,
        publicKey: ecdhKeys.publicKey,
        signingKey: ecdsaKeys?.signingKey || undefined,
        verificationKey: ecdsaKeys?.verificationKey || undefined
      };
    } catch (error) {
      logger.error('Failed to load legacy keys:', error);
      return null;
    }
  }

  /**
   * Delete legacy keys from localStorage
   */
  deleteLegacyKeys(): void {
    try {
      localStorage.removeItem('ecdh_keys');
      localStorage.removeItem('ecdsa_keys');
      logger.info('Legacy keys deleted from localStorage');
    } catch (error) {
      logger.error('Failed to delete legacy keys:', error);
      throw new MigrationError(
        'Failed to delete legacy keys',
        'DELETE_FAILED',
        true
      );
    }
  }

  /**
   * Import a legacy key from base64 string to CryptoKey
   * 
   * @param keyData - Base64 encoded key data
   * @param algorithm - Algorithm type (ECDH or ECDSA)
   * @returns Imported CryptoKey
   */
  async importLegacyKey(
    keyData: string,
    algorithm: 'ECDH' | 'ECDSA'
  ): Promise<CryptoKey> {
    try {
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
    } catch (error) {
      logger.error(`Failed to import legacy ${algorithm} key:`, error);
      throw new MigrationError(
        `Failed to import legacy ${algorithm} key`,
        'IMPORT_FAILED',
        true
      );
    }
  }

  /**
   * Create a backup of legacy keys before migration
   * 
   * @returns Backup object containing legacy keys
   */
  private createBackup(): LegacyKeysBackup {
    return {
      ecdhKeys: localStorage.getItem('ecdh_keys'),
      ecdsaKeys: localStorage.getItem('ecdsa_keys'),
      timestamp: Date.now()
    };
  }

  /**
   * Generate a default signing key if none exists in legacy storage
   * 
   * @returns Generated signing key
   */
  private async generateDefaultSigningKey(): Promise<CryptoKey> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      return keyPair.privateKey;
    } catch (error) {
      logger.error('Failed to generate default signing key:', error);
      throw new MigrationError(
        'Failed to generate default signing key',
        'KEY_GENERATION_FAILED',
        true
      );
    }
  }

  /**
   * Convert base64 string to ArrayBuffer
   * 
   * @param base64 - Base64 encoded string
   * @returns ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export factory function for creating migration instance
export function createKeyMigration(secureKeyStorage: SecureKeyStorage): KeyMigration {
  return new KeyMigration(secureKeyStorage);
}

// Export default
export default KeyMigration;
