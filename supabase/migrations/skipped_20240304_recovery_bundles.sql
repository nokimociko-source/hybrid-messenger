-- Migration: Add Master Key bundles for Password Recovery
-- This allows changing the password without re-encrypting all messages.

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS encrypted_master_key TEXT,
ADD COLUMN IF NOT EXISTS recovery_master_key TEXT;

-- Comments for documentation
COMMENT ON COLUMN users.encrypted_master_key IS 'Master Key encrypted with the user password (AES-GCM)';
COMMENT ON COLUMN users.recovery_master_key IS 'Master Key encrypted with the mnemonic phrase (AES-GCM)';
