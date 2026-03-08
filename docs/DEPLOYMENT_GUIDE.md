# Deployment Guide

## ✅ Completed Steps

### 1. Server Dependencies
- ✅ Installed `bcrypt` in `hybrid_messenger/server/`
- ✅ All server dependencies are ready

### 2. Frontend Restart
- ✅ Stopped previous dev server
- ✅ Restarted frontend with `npm run dev`
- ✅ Frontend running on http://localhost:8080/

## 📋 Remaining: Deploy Edge Functions

### Prerequisites

You need to deploy the Supabase Edge Functions. There are two options:

### Option 1: Using Supabase CLI (Recommended)

#### Install Supabase CLI

**Windows (using Scoop):**
```bash
scoop install supabase
```

**Windows (using Chocolatey):**
```bash
choco install supabase
```

**macOS (using Homebrew):**
```bash
brew install supabase/tap/supabase
```

**Linux (using Homebrew):**
```bash
brew install supabase/tap/supabase
```

**Or use npm (local installation):**
```bash
npm install -D supabase
```

#### Deploy Functions

Once Supabase CLI is installed:

```bash
# Navigate to project root
cd hybrid_messenger

# Login to Supabase
supabase login

# Deploy all Edge Functions
supabase functions deploy

# Or deploy specific functions:
supabase functions deploy livekit-token
supabase functions deploy fetch-link-preview
supabase functions deploy get-client-ip
supabase functions deploy upload-sticker-pack
supabase functions deploy validate-sticker-ref
```

### Option 2: Deploy via Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Edge Functions** section
4. Click **Create a new function** or upload existing ones
5. Copy the code from each function folder:
   - `hybrid_messenger/supabase/functions/livekit-token/index.ts`
   - `hybrid_messenger/supabase/functions/fetch-link-preview/index.ts`
   - `hybrid_messenger/supabase/functions/get-client-ip/index.ts`
   - `hybrid_messenger/supabase/functions/upload-sticker-pack/index.ts`
   - `hybrid_messenger/supabase/functions/validate-sticker-ref/index.ts`

### Option 3: Using npx (No Installation Required)

```bash
# Deploy using npx
npx supabase functions deploy livekit-token
npx supabase functions deploy fetch-link-preview
npx supabase functions deploy get-client-ip
npx supabase functions deploy upload-sticker-pack
npx supabase functions deploy validate-sticker-ref
```

## 🗄️ Database RLS Fix

**IMPORTANT:** Before using the application, you must fix the infinite recursion in RLS policies.

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy and run the contents of:
-- hybrid_messenger/database/policies/APPLY_FIX_NOW.sql
```

Or manually execute the fix script:
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy contents from `hybrid_messenger/database/policies/APPLY_FIX_NOW.sql`
4. Run the query

## 🧪 Testing

After deployment, test the following:

### Frontend
- [ ] App loads without errors
- [ ] Can see chat list
- [ ] Can fetch rooms
- [ ] Can see typing indicators
- [ ] Language selector works (Settings)

### Edge Functions
- [ ] LiveKit token generation works (for calls)
- [ ] Link preview fetching works
- [ ] Client IP detection works
- [ ] Sticker pack upload works

### Database
- [ ] Can fetch rooms without 500 errors
- [ ] Can fetch typing indicators without 500 errors
- [ ] Can fetch room members without 500 errors

## 📝 Environment Variables

Make sure these are set in `hybrid_messenger/client/.env`:

```env
VITE_LIVEKIT_URL=wss://catlover-ldwhaxp1.livekit.cloud
VITE_SUPABASE_URL=https://cqqqwhtfssgfergbjqmo.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

## 🚀 Production Deployment

For production deployment:

1. Build the frontend:
   ```bash
   cd hybrid_messenger/client
   npm run build
   ```

2. Deploy to your hosting (Vercel, Netlify, etc.)

3. Ensure Edge Functions are deployed to Supabase

4. Update environment variables in production

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Check the Supabase logs for Edge Function errors
3. Verify RLS policies are correctly applied
4. Ensure all environment variables are set

## ✅ Deployment Checklist

- [ ] bcrypt installed in server
- [ ] Frontend restarted and running
- [ ] RLS policies fixed in database
- [ ] Edge Functions deployed
- [ ] Environment variables configured
- [ ] Frontend builds successfully
- [ ] All tests passing
- [ ] Ready for production
