-- Add is_public column to rooms table for channel visibility
-- This allows channels to be either public (discoverable) or private (invite-only)

-- Add is_public column (defaults to false for existing rooms)
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create index for faster queries on public channels
CREATE INDEX IF NOT EXISTS idx_rooms_is_public 
ON public.rooms(is_public) 
WHERE is_public = true;

-- Create index for channel discovery queries
CREATE INDEX IF NOT EXISTS idx_rooms_type_public 
ON public.rooms(type, is_public) 
WHERE type = 'channel' AND is_public = true;

-- Update existing channels to be public by default (optional - adjust as needed)
-- Comment out if you want existing channels to remain private
UPDATE public.rooms 
SET is_public = true 
WHERE type = 'channel' AND is_public IS NULL;

-- Add comment
COMMENT ON COLUMN public.rooms.is_public IS 'Whether the channel is publicly discoverable (only applies to channels)';
