# 📚 Документация проекта Hybrid Messenger

Вся документация организована по папкам для удобства навигации.

## � Быстрый старт

- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Структура всего проекта
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Текущий статус
- **[audit/START_HERE.md](audit/START_HERE.md)** - Начните с аудита

## �📁 Структура

### `/audit` - Аудит кода
Результаты полного аудита кода (март 2026):
- `START_HERE.md` - Начните отсюда
- `AUDIT_SUMMARY.md` - Краткое резюме
- `CODE_AUDIT_FULL_REPORT.md` - Полный отчет
- `FIX_CRITICAL_ISSUES.md` - Инструкции по исправлению
- `QUICK_FIX_CHECKLIST.md` - Чеклист прогресса

### `/features` - Завершенные функции
Документация по реализованным фичам:
- `ALBUM_INTEGRATION_COMPLETE.md` - Медиа альбомы
- `BLOCKED_USERS_FEATURE.md` - Блокировка пользователей
- `DDOS_PROTECTION_COMPLETE.md` - Защита от DDoS
- `GLOBAL_SEARCH_COMPLETE.md` - Глобальный поиск
- `QUICK_WINS_COMPLETE.md` - Быстрые улучшения

### `/guides` - Руководства
Пошаговые инструкции:
- **E2E Шифрование:**
  - `E2E_QUICK_START.md` - 🚀 Быстрый старт (15 минут)
  - `E2E_IMPLEMENTATION_STATUS.md` - Полный статус реализации
  - `E2E_FLOW_DIAGRAM.md` - Визуальная диаграмма потока
  - `ZERO_KNOWLEDGE_SECURITY.md` - Архитектура безопасности
  - `E2E_ENCRYPTION_GUIDE.md` - Детальное руководство
- `LIVEKIT_TROUBLESHOOTING.md` - Решение проблем LiveKit
- `QUICK_START_CALLS.md` - Быстрый старт звонков
- `SETTINGS_GUIDE.md` - Настройки приложения
- `DDOS_PROTECTION_GUIDE.md` - Настройка защиты от DDoS

### `/migrations` - Миграции БД
SQL миграции и инструкции:
- **E2E Шифрование:**
  - `APPLY_ZERO_KNOWLEDGE_E2E.md` - Инструкция по применению E2E
  - `../database/migrations/enable_zero_knowledge_e2e_step_by_step.md` - Пошаговая SQL миграция (17 шагов)
  - `../database/migrations/QUICK_START_E2E.md` - Быстрый старт
- `APPLY_*.md` - Инструкции по применению миграций
- `FIX_*.md` - Исправления проблем

### `/components` - Документация компонентов
MD файлы с описанием React компонентов:
- `ChannelHeader.md`, `ChannelDiscovery.md`
- `FolderDialog.md`, `FolderPanel.md`
- `SettingsModal.md`, `ProfileSettingsPanel.md`
- И другие...

## 🔗 Связанные разделы

- **[../database/](../database/)** - SQL схемы, миграции, политики
  - `migrations/enable_zero_knowledge_e2e_step_by_step.md` - E2E миграция (17 шагов)
  - `migrations/enable_zero_knowledge_e2e.sql` - E2E миграция (полный файл)
- **[../scripts/](../scripts/)** - Утилиты автоматизации
- **[../supabase/functions/](../supabase/functions/)** - Edge Functions
- **[../client/src/app/utils/e2eEncryption.ts](../client/src/app/utils/e2eEncryption.ts)** - E2E утилита
- **[../client/src/app/hooks/useNaClE2E.ts](../client/src/app/hooks/useNaClE2E.ts)** - E2E React hook
- **[../client/src/app/components/E2ESettings.tsx](../client/src/app/components/E2ESettings.tsx)** - E2E настройки UI

## 📊 Статус проекта

- **Готовность:** 94% (146/155 функций)
- **Качество кода:** ⭐⭐⭐⭐☆ (4/5)
- **Последний аудит:** 3 марта 2026
- **MD файлов:** 64
- **SQL файлов:** 25 (в database/)

## 🎯 Для разных ролей

### Разработчик
1. [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Структура проекта
2. [guides/](guides/) - Настройка окружения
3. [audit/](audit/) - Качество кода

### DevOps
1. [../database/](../database/) - Настройка БД
2. [migrations/](migrations/) - Применение миграций
3. [../supabase/functions/](../supabase/functions/) - Деплой функций

## 📝 Последние изменения

**3 марта 2026:**
- ✅ **E2E Шифрование готово к применению!**
  - Создана пошаговая SQL миграция (17 шагов)
  - Реализовано ECDH (P-256) + AES-GCM шифрование
  - Perfect Forward Secrecy для каждого сообщения
  - UI компонент настроек E2E
  - Интеграция в useSupabaseChat
  - Полная документация и диаграммы
- ✅ Реорганизована структура проекта
- ✅ Все SQL файлы перемещены в `database/`
- ✅ Все MD файлы организованы в `docs/`
- ✅ Добавлены README для навигации
- ✅ Создан PROJECT_STRUCTURE.md
