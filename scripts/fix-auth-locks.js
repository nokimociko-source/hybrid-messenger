#!/usr/bin/env node

/**
 * Fix Supabase auth lock issues by replacing direct auth calls with cached version
 * This prevents "Lock broken by another request" errors in React Strict Mode
 */

const fs = require('fs');
const path = require('path');

const hooksToFix = [
  'client/src/app/hooks/useCallHistory.ts',
  'client/src/app/hooks/useChatFolders.ts',
  'client/src/app/hooks/useLiveKitCall.ts',
  'client/src/app/hooks/useMuteSettings.ts',
  'client/src/app/hooks/usePremiumStatus.ts',
  'client/src/app/hooks/useRateLimit.ts',
  'client/src/app/hooks/useStickerPacks.ts',
  'client/src/app/hooks/useTypingIndicator.ts',
  'client/src/app/hooks/useUnreadCount.ts',
  'client/src/app/hooks/useUserPresence.ts',
  'client/src/app/hooks/useWebRTCCall.ts',
  'client/src/app/hooks/useSupabaseCall.ts',
  'client/src/app/hooks/useRoomTyping.ts',
  'client/src/app/hooks/usePolls.ts',
  'client/src/app/hooks/usePinnedChats.ts',
  'client/src/app/hooks/useNaClE2E.ts',
  'client/src/app/hooks/useMentions.ts',
  'client/src/app/hooks/useChannelViewStats.ts',
  'client/src/app/hooks/useChannelSubscription.ts',
  'client/src/app/hooks/useChannelDiscovery.ts',
  'client/src/app/hooks/useArchive.ts',
  'client/src/app/hooks/useE2EEncryption.ts',
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} (not found)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Check if already imports authCache
  if (content.includes('from \'../utils/authCache\'')) {
    console.log(`✅ ${filePath} (already fixed)`);
    return;
  }

  // Add import if needed
  if (content.includes('supabase.auth.getUser()') || 
      content.includes('_cachedUserId') ||
      content.includes('_userPromise')) {
    
    // Add import after supabaseClient import
    if (content.includes('from \'../../supabaseClient\'')) {
      content = content.replace(
        /(import.*from '\.\.\/\.\.\/supabaseClient';)/,
        '$1\nimport { getCurrentUser, getCurrentUserId } from \'../utils/authCache\';'
      );
      modified = true;
    }

    // Replace direct auth calls
    content = content.replace(
      /const\s+{\s*data:\s*{\s*user\s*}\s*}\s*=\s*await\s+supabase\.auth\.getUser\(\);/g,
      'const user = await getCurrentUser();'
    );

    // Replace .then() style calls
    content = content.replace(
      /supabase\.auth\.getUser\(\)\.then\(\(\{\s*data:\s*{\s*user\s*}\s*\}\)\s*=>/g,
      'getCurrentUser().then((user) =>'
    );
    content = content.replace(
      /supabase\.auth\.getUser\(\)\.then\(\(\{\s*data\s*\}\)\s*=>\s*{\s*if\s*\(data\.user\)/g,
      'getCurrentUser().then((user) => { if (user)'
    );

    // Remove local caching code
    if (content.includes('let _cachedUserId')) {
      // Remove cache variable declaration
      content = content.replace(/let _cachedUserId: string \| null = null;\n\n/g, '');
      
      // Remove getCurrentUserId function
      content = content.replace(
        /async function getCurrentUserId\(\): Promise<string \| null> \{[\s\S]*?\n\}\n\n/g,
        ''
      );
      
      // Remove auth state change listener
      content = content.replace(
        /supabase\.auth\.onAuthStateChange\(\(event\) => \{[\s\S]*?\}\);\n\n/g,
        ''
      );
    }

    if (content.includes('let _userPromise')) {
      content = content.replace(/let _userPromise:.*?= null;\n/g, '');
      content = content.replace(/let _cachedUserMeta:.*?= null;\n/g, '');
    }

    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed ${filePath}`);
  } else {
    console.log(`⏭️  ${filePath} (no changes needed)`);
  }
}

console.log('🔧 Fixing Supabase auth lock issues...\n');

hooksToFix.forEach(fixFile);

console.log('\n✅ Done! Auth locks should be fixed.');
console.log('💡 Tip: Restart your dev server to see the changes.');
