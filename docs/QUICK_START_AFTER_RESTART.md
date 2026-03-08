# Quick Start After Restart

## ✅ What's Done

1. ✅ **bcrypt installed** in `hybrid_messenger/server/`
2. ✅ **Frontend restarted** - running on http://localhost:8080/
3. ✅ **i18n system fixed** - 8 languages supported
4. ✅ **Environment variables configured** - Supabase keys in `.env`

## 🔴 Critical: Fix Database RLS Policies

The app will still show errors because of infinite recursion in database policies.

### Quick Fix (2 minutes)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy and Run the Fix**
   - Open: `hybrid_messenger/database/policies/APPLY_FIX_NOW.sql`
   - Copy ALL the SQL code
   - Paste into Supabase SQL Editor
   - Click "Run"

4. **Verify It Worked**
   - Run this test query:
   ```sql
   SELECT * FROM public.rooms LIMIT 1;
   ```
   - Should return results without errors

## 🎯 After RLS Fix

Once the RLS policies are fixed:

1. **Refresh the app** - http://localhost:8080/
2. **Check browser console** - should see no 500 errors
3. **Try these actions:**
   - View chat list
   - See typing indicators
   - Create a new room
   - Send a message

## 📱 Deploy Edge Functions (Optional but Recommended)

For full functionality, deploy Edge Functions:

```bash
# Option 1: Using npx (no installation needed)
npx supabase functions deploy livekit-token
npx supabase functions deploy fetch-link-preview
npx supabase functions deploy get-client-ip
npx supabase functions deploy upload-sticker-pack
npx supabase functions deploy validate-sticker-ref

# Option 2: Using Supabase CLI (if installed)
supabase functions deploy
```

## 🌍 Multi-Language Support

The app now supports 8 languages:
- 🇬🇧 English
- 🇷🇺 Русский
- 🇩🇪 Deutsch
- 🇪🇸 Español
- 🇫🇷 Français
- 🇨🇳 中文
- 🇯🇵 日本語
- 🇰🇷 한국어

Access language selector in Settings.

## 📋 Checklist

- [ ] RLS policies fixed in Supabase
- [ ] App loads without 500 errors
- [ ] Can view chat list
- [ ] Can see typing indicators
- [ ] Language selector works
- [ ] (Optional) Edge Functions deployed

## 🆘 Troubleshooting

**Still seeing 500 errors?**
- Make sure you ran the entire SQL script from `APPLY_FIX_NOW.sql`
- Refresh the browser (Ctrl+F5)
- Check Supabase logs for errors

**Edge Functions not working?**
- Deploy them using the commands above
- Check function logs in Supabase Dashboard

**Language not changing?**
- Check browser console for errors
- Verify locale files exist in `hybrid_messenger/client/public/locales/`

## 📞 Next Steps

1. Fix RLS policies (critical)
2. Test the app
3. Deploy Edge Functions (optional)
4. Deploy to production when ready

See `DEPLOYMENT_GUIDE.md` for full deployment instructions.
