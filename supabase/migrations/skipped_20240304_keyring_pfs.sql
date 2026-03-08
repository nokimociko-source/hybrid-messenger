-- Keyring Table for PFS
CREATE TABLE IF NOT EXISTS room_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    encrypted_key TEXT NOT NULL, -- Encrypted for the specific user
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, version, user_id)
);

-- Index for fast lookup of room keys for a user
CREATE INDEX idx_room_keys_user_room ON room_keys(user_id, room_id);

-- Policy for room_keys
ALTER TABLE room_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own room keys"
ON room_keys FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own room keys"
ON room_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);
