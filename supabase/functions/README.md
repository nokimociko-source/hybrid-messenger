# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Catlover messenger.

## Available Functions

### livekit-token
Generates LiveKit access tokens for video/audio calls.

**Endpoint:** `POST /functions/v1/livekit-token`

**Request:**
```json
{
  "roomName": "string",
  "participantName": "string (optional)"
}
```

**Response:**
```json
{
  "token": "string"
}
```

### upload-sticker-pack
Uploads a new sticker pack with validation and storage management.

**Endpoint:** `POST /functions/v1/upload-sticker-pack`

**Request:**
```json
{
  "name": "string (1-100 chars)",
  "author": "string",
  "files": [
    {
      "name": "string",
      "data": "string (base64)",
      "type": "image/webp | image/png"
    }
  ]
}
```

**Validation:**
- Max 50 stickers per pack
- Max 512KB per file
- Allowed formats: WebP, PNG

**Response:**
```json
{
  "packId": "string (UUID)",
  "stickerIds": ["string (UUID)"],
  "previewUrl": "string (URL)"
}
```

### validate-sticker-ref
Validates if a sticker reference exists in the database.

**Endpoint:** `POST /functions/v1/validate-sticker-ref`

**Request:**
```json
{
  "packId": "string (UUID)",
  "stickerId": "string (UUID)"
}
```

**Response:**
```json
{
  "valid": boolean,
  "imageUrl": "string (URL, if valid)"
}
```

## Deployment

To deploy these functions to Supabase:

```bash
# Deploy all functions
supabase functions deploy

# Deploy a specific function
supabase functions deploy upload-sticker-pack
supabase functions deploy validate-sticker-ref
```

## Environment Variables

Make sure the following environment variables are set in your Supabase project:

- `SUPABASE_URL` - Automatically provided
- `SUPABASE_ANON_KEY` - Automatically provided
- `LIVEKIT_API_KEY` - Required for livekit-token function
- `LIVEKIT_API_SECRET` - Required for livekit-token function

## Storage Buckets

The following storage buckets must be created:

- `stickers` - For sticker pack images (public read access)
- `premium-emojis` - For premium emoji animations (public read access)

## Authentication

All functions require authentication via the `Authorization` header with a valid Supabase JWT token.

## CORS

All functions support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
- `Access-Control-Allow-Methods: POST, OPTIONS`
