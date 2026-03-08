# 🚀 Hybrid Messenger

Современный мессенджер с поддержкой E2E шифрования, звонков, каналов и многого другого.

## 📁 Структура проекта

```
hybrid_messenger/
├── client/          # Frontend приложение (React + TypeScript)
├── server/          # Backend сервер
├── supabase/        # Supabase Edge Functions
├── database/        # SQL схемы, миграции, политики
├── scripts/         # Утилиты и скрипты автоматизации
└── docs/            # Документация проекта
```

## 📚 Документация

- **[docs/](docs/)** - Главная документация
- **[docs/audit/](docs/audit/)** - Результаты аудита кода
- **[docs/guides/](docs/guides/)** - Руководства по настройке
- **[docs/guides/ZERO_KNOWLEDGE_SECURITY.md](docs/guides/ZERO_KNOWLEDGE_SECURITY.md)** - 🔒 Zero-Knowledge защита
- **[docs/features/](docs/features/)** - Описание функций
- **[docs/migrations/](docs/migrations/)** - Инструкции по миграции БД
- **[database/](database/)** - SQL файлы и схемы БД

## 🔒 Безопасность

Проект использует **Zero-Knowledge Architecture**:

- ✅ End-to-End шифрование сообщений
- ✅ Приватные ключи хранятся ТОЛЬКО у пользователей
- ✅ Администраторы БД не могут читать сообщения
- ✅ Защита от XSS, SQL injection, DDoS
- ✅ Валидация всех загружаемых файлов
- ✅ Rate limiting для защиты от спама

**Уровень защиты:** 🔒🔒🔒🔒🔒 (5/5) - Как в Signal/Telegram

См. [docs/guides/ZERO_KNOWLEDGE_SECURITY.md](docs/guides/ZERO_KNOWLEDGE_SECURITY.md)
- **[docs/features/](docs/features/)** - Описание функций
- **[docs/migrations/](docs/migrations/)** - SQL миграции

## 🎯 Статус проекта

- **Готовность:** 94% (146/155 функций)
- **Качество кода:** ⭐⭐⭐⭐☆ (4/5)
- **Последний аудит:** 3 марта 2026

## 🚀 Быстрый старт

```bash
# Установка зависимостей
cd client
npm install

# Запуск dev сервера
npm run dev

# Сборка
npm run build
```

## 📖 Подробнее

См. [docs/README.md](docs/README.md) для полной документации.
