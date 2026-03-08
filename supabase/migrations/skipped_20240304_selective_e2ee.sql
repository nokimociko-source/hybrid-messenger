-- Migration: Add Selective Encryption and Key Rotation fields
-- Date: 2026-03-04
-- Goal: Support per-room encryption toggle and PFS (Perfect Forward Secrecy)

-- 1. Add is_encrypted to rooms to allow selective encryption
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- 2. Add key_version to messages to support key rotation
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS key_version INTEGER DEFAULT 1;

-- 3. Add recovery_phrase_hash to users for mnemonic phrase recovery
ALTER TABLE users
ADD COLUMN IF NOT EXISTS recovery_phrase_hash TEXT;

-- Index for performance when rotating keys
CREATE INDEX IF NOT EXISTS idx_messages_key_version ON messages(room_id, key_version);

COMMENT ON COLUMN rooms.is_encrypted IS 'Whether this room has E2EE enabled';
COMMENT ON COLUMN messages.key_version IS 'The version of the encryption key used for this message';
COMMENT ON COLUMN users.recovery_phrase_hash IS 'Hash of the 12-word recovery phrase (BIP-39 style)';
