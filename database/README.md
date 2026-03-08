# Database

Все SQL файлы для Supabase базы данных.

## Структура

### 📁 schemas/
Основные схемы таблиц - создание новых таблиц и их структура.

**Файлы:**
- `supabase_schema.sql` - главная схема БД
- `broadcast_channels_schema.sql` - схема каналов
- `blocked_users_schema.sql` - блокировка пользователей
- `call_history_schema.sql` - история звонков
- `call_recordings_schema.sql` - записи звонков
- `global_search_schema.sql` - глобальный поиск
- `group_features_schema.sql` - функции групп
- `media_enhancements_schema.sql` - улучшения медиа
- `ddos_protection_schema.sql` - защита от DDoS

### 📁 migrations/
Миграции - изменения существующих таблиц и данных.

**Файлы:**
- `add_ban_fields_to_room_members.sql` - добавление полей бана
- `add_key_type_field.sql` - добавление типа ключа
- `add_slowmode_field.sql` - добавление медленного режима
- `apply_e2e_fields.sql` - применение E2E полей
- `apply_media_enhancements.sql` - применение улучшений медиа
- `blocked_users_safe_migration.sql` - безопасная миграция блокировок
- `chat_list_enhancements.sql` - улучшения списка чатов
- `fix_database_schema.sql` - исправление схемы
- `fix_media_group_id_type.sql` - исправление типа media_group_id
- `ddos_protection_clean_install.sql` - чистая установка DDoS защиты
- `ddos_protection_simple.sql` - простая DDoS защита
- `enable_zero_knowledge_e2e.sql` - 🔒 Zero-Knowledge E2E шифрование
- `enable_zero_knowledge_e2e_step_by_step.md` - ⚡ Пошаговое применение E2E
- `QUICK_START_E2E.md` - 🚀 Быстрый старт E2E (8 минут)

### 📁 policies/
RLS политики и настройки storage.

**Файлы:**
- `fix_rooms_update_policy.sql` - исправление политики обновления комнат
- `storage_avatars_policy.sql` - политика для аватаров
- `supabase_storage_setup.sql` - настройка storage

## Порядок применения

1. Сначала примените схемы из `schemas/`
2. Затем миграции из `migrations/`
3. В конце политики из `policies/`

См. также: [docs/migrations/](../docs/migrations/) для подробных инструкций.
