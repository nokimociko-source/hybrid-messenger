# ⚡ Быстрый старт: Настройка звонков

## 3 шага до работающих звонков

### Шаг 1: Настройте Secrets в Supabase (2 минуты)

1. Откройте: https://supabase.com/dashboard/project/cqqqwhtfssgfergbjqmo/settings/functions
2. Перейдите в **Edge Functions** → **Secrets**
3. Добавьте:
   ```
   LIVEKIT_API_KEY=APILfXpSfDfUL7F
   LIVEKIT_API_SECRET=XZOCWeCQXaJ3qQZejFXWSDOP7qwEEk21ox5PDtXoSZe
   ```

### Шаг 2: Задеплойте Edge Function (1 минута)

```bash
cd hybrid_messenger
npx supabase functions deploy livekit-token
```

### Шаг 3: Протестируйте (30 секунд)

1. Откройте приложение
2. Перейдите в любой чат
3. Нажмите кнопку звонка 📞
4. Проверьте консоль:
   - ✅ "Токен получен от Edge Function"
   - ✅ "Подключение к LiveKit серверу"
   - ✅ "publishing track"

## Готово! 🎉

Звонки работают через безопасный Edge Function.

## Если что-то не работает

### Ошибка: "Edge Function error"

Проверьте, что функция задеплоена:
```bash
supabase functions list
```

Должна быть в списке: `livekit-token`

### Ошибка: "publication of local track timed out"

Это проблема с LiveKit сервером:
1. Зайдите на https://cloud.livekit.io/
2. Проверьте статус проекта `catlover-ldwhaxp1`
3. Если проект удалён, создайте новый и обновите:
   - `VITE_LIVEKIT_URL` в `.env`
   - Secrets в Supabase Dashboard

### Нужна помощь?

См. подробную документацию:
- `SETUP_LIVEKIT_EDGE_FUNCTION.md` — полная настройка
- `LIVEKIT_TROUBLESHOOTING.md` — решение проблем
- `LIVEKIT_SETUP.md` — общая информация

## Что дальше?

После успешной настройки можно:
- ✅ Добавить лимиты звонков
- ✅ Добавить аналитику
- ✅ Добавить проверку прав доступа
- ✅ Настроить запись звонков

См. раздел "Дополнительные возможности" в `SETUP_LIVEKIT_EDGE_FUNCTION.md`
