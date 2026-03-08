# 📁 Структура проекта

Проект полностью организован для удобной навигации и разработки.

## Корневая структура

```
hybrid_messenger/
├── README.md           # Главный README проекта
├── client/             # Frontend приложение
├── server/             # Backend сервер
├── supabase/           # Supabase Edge Functions
├── database/           # SQL схемы и миграции
├── scripts/            # Утилиты автоматизации
└── docs/               # Документация
```

## 📂 Детальное описание

### client/
Frontend приложение на React + TypeScript + Vite.

**Структура:**
- `src/app/components/` - React компоненты
- `src/app/hooks/` - Custom React hooks
- `src/app/utils/` - Утилиты и хелперы
- `src/app/pages/` - Страницы приложения
- `src/app/types/` - TypeScript типы
- `public/` - Статические файлы
- `dist/` - Собранное приложение

**Конфигурация:**
- `package.json` - Зависимости
- `tsconfig.json` - TypeScript настройки
- `vite.config.ts` - Vite конфигурация
- `.env` - Переменные окружения

### server/
Backend сервер (если используется).

### supabase/
Supabase Edge Functions для серверной логики.

**Функции:**
- `livekit-token/` - Генерация токенов для видеозвонков
- `fetch-link-preview/` - Получение превью ссылок
- `get-client-ip/` - Получение IP клиента
- `upload-sticker-pack/` - Загрузка стикерпаков
- `validate-sticker-ref/` - Валидация стикеров

См. [supabase/functions/README.md](../supabase/functions/README.md)

### database/
Все SQL файлы организованы по категориям.

**Структура:**
- `schemas/` - Схемы таблиц (9 файлов)
- `migrations/` - Миграции БД (12 файлов)
- `policies/` - RLS политики (4 файла)

См. [database/README.md](../database/README.md)

### scripts/
Утилиты для автоматизации разработки.

**Скрипты:**
- `auto-fix.sh` - Автоисправление кода
- `check-issues.js` - Проверка проблем
- `replace-console.js` - Замена console.log

См. [scripts/README.md](../scripts/README.md)

### docs/
Вся документация проекта.

**Структура:**
- `audit/` - Результаты аудита кода (11 файлов)
- `components/` - Документация компонентов (10 файлов)
- `features/` - Описание функций (8 файлов)
- `guides/` - Руководства (13 файлов)
- `migrations/` - Инструкции по миграции (13 файлов)

**Главные файлы:**
- `README.md` - Главная документация
- `PROJECT_STATUS.md` - Статус проекта
- `FEATURES_STATUS.md` - Статус функций
- `ARCHITECTURE_IMPROVEMENTS.md` - Улучшения архитектуры

## 🎯 Навигация

### Для разработчиков
1. Начните с [README.md](../README.md)
2. Изучите [docs/guides/](guides/) для настройки
3. Проверьте [docs/audit/START_HERE.md](audit/START_HERE.md) для аудита

### Для работы с БД
1. Откройте [database/README.md](../database/README.md)
2. Примените схемы из `database/schemas/`
3. Запустите миграции из `database/migrations/`
4. Настройте политики из `database/policies/`

### Для понимания функций
1. Смотрите [docs/features/](features/)
2. Читайте [docs/PROJECT_STATUS.md](PROJECT_STATUS.md)
3. Проверяйте [docs/components/](components/) для UI

## 📊 Статистика

- **Всего MD файлов:** 64
- **SQL файлов:** 25
- **Компонентов:** 150+
- **Hooks:** 100+
- **Edge Functions:** 5

## 🔄 Обновления

Последнее обновление структуры: 3 марта 2026

**Изменения:**
- ✅ Все SQL файлы перемещены в `database/`
- ✅ Все MD файлы организованы в `docs/`
- ✅ Создана папка `scripts/` для утилит
- ✅ Удалена пустая папка `tests/`
- ✅ Добавлены README для навигации
