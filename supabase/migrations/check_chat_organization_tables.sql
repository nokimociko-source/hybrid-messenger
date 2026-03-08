-- Проверка существования всех таблиц для организации чатов
-- Выполните этот запрос в Supabase SQL Editor

SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'chat_folders', 
      'chat_folder_items', 
      'pinned_chats', 
      'archived_chats', 
      'mute_settings', 
      'mentions', 
      'message_drafts'
    ) THEN '✅ Нужна для организации чатов'
    ELSE '❌ Не связана с организацией чатов'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'chat_folders', 
    'chat_folder_items', 
    'pinned_chats', 
    'archived_chats', 
    'mute_settings', 
    'mentions', 
    'message_drafts'
  )
ORDER BY table_name;

-- Проверка количества записей в каждой таблице
SELECT 'chat_folders' as table_name, COUNT(*) as record_count FROM public.chat_folders
UNION ALL
SELECT 'chat_folder_items', COUNT(*) FROM public.chat_folder_items
UNION ALL
SELECT 'pinned_chats', COUNT(*) FROM public.pinned_chats
UNION ALL
SELECT 'archived_chats', COUNT(*) FROM public.archived_chats
UNION ALL
SELECT 'mute_settings', COUNT(*) FROM public.mute_settings
UNION ALL
SELECT 'mentions', COUNT(*) FROM public.mentions
UNION ALL
SELECT 'message_drafts', COUNT(*) FROM public.message_drafts;