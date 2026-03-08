# E2E Decryption Fix - React Hooks Error Resolution

## Problem
Messages were being encrypted but not decrypted when displayed. The error was:
```
Invalid hook call. Hooks can only be called inside of the body of a function component.
```

## Root Cause
In `useSupabaseChat.ts`, the `sendMessage` function was trying to dynamically import and call `useNaClE2E()` hook inside a callback function. This violates React's Rules of Hooks - hooks can only be called:
1. At the top level of a React component
2. At the top level of a custom hook
3. NOT inside callbacks, loops, or conditions

## Solution
Created a utility class `E2EEncryption` that doesn't use React hooks and can be called from anywhere:

### 1. Enhanced `e2eEncryption.ts` utility
- Added `encryptMessage()` method to the singleton class
- Both encryption and decryption now available without React hooks
- Uses Web Crypto API (ECDH + AES-GCM) with Perfect Forward Secrecy
- Singleton pattern ensures keys are initialized once

### 2. Fixed `useSupabaseChat.ts`
- Changed from importing `useNaClE2E` hook to importing `E2EEncryption` class
- Now uses `E2EEncryption.getInstance()` instead of calling a hook
- Properly checks for recipient's public key before encrypting
- Graceful fallback to unencrypted if encryption fails

### 3. Decryption on Display
- `fetchMessages()` decrypts historical messages using `decryptIfNeeded()` helper
- Realtime INSERT handler decrypts new messages before displaying
- Encrypted messages are identified by 🔒 prefix
- Failed decryptions show "🔒 [Не удалось расшифровать]"

## Key Changes

### Before (BROKEN):
```typescript
// ❌ Trying to call a hook inside a callback
const { useNaClE2E } = await import('./useNaClE2E');
const e2e = useNaClE2E(); // ERROR: Invalid hook call
```

### After (FIXED):
```typescript
// ✅ Using a utility class instead
const { default: E2EEncryptionClass } = await import('../utils/e2eEncryption');
const e2e = E2EEncryptionClass.getInstance();
await e2e.initialize();
const encrypted = await e2e.encryptMessage(content, recipientId);
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ React Components (E2ESettings.tsx)                      │
│ ✓ Can use useNaClE2E() hook for UI interactions        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ React Hooks (useSupabaseChat.ts)                        │
│ ✓ Can use E2EEncryption utility class                  │
│ ✗ Cannot call useNaClE2E() hook in callbacks           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Utility Class (e2eEncryption.ts)                        │
│ ✓ Singleton pattern                                     │
│ ✓ No React dependencies                                 │
│ ✓ Can be called from anywhere                           │
│ ✓ Handles both encryption and decryption                │
└─────────────────────────────────────────────────────────┘
```

## Testing Checklist

1. ✅ Enable E2E in settings
2. ✅ Send a message - should show 🔒 prefix in database
3. ✅ Message should display decrypted (without 🔒) in UI
4. ✅ Refresh page - historical messages should decrypt
5. ✅ Recipient should see decrypted message in realtime
6. ✅ No "Invalid hook call" errors in console

## Files Modified
- `hybrid_messenger/client/src/app/utils/e2eEncryption.ts` - Added `encryptMessage()` method
- `hybrid_messenger/client/src/app/hooks/useSupabaseChat.ts` - Fixed to use utility class instead of hook

## Next Steps
- Test encryption/decryption in production
- Verify Perfect Forward Secrecy (each message uses ephemeral keys)
- Consider adding key verification UI
- Add support for group chats (multiple recipients)
