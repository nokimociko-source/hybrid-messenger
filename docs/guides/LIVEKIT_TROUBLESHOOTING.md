# 🔧 Диагностика проблем LiveKit

## Проблема: "publication of local track timed out"

### Причины:

1. **LiveKit сервер недоступен**
   - Проверьте, что сервер `wss://catlover-ldwhaxp1.livekit.cloud` работает
   - Откройте https://cloud.livekit.io/ и проверьте статус проекта

2. **Неверные credentials в Edge Function**
   - Проверьте Supabase Dashboard → Edge Functions → Secrets
   - Убедитесь, что `LIVEKIT_API_KEY` и `LIVEKIT_API_SECRET` настроены

3. **Edge Function не задеплоена**
   - Выполните: `supabase functions deploy livekit-token`
   - Проверьте: `supabase functions list`

4. **Сетевые проблемы**
   - Firewall блокирует WebSocket соединения
   - CORS настройки
   - VPN/Proxy

### Решения:

#### 1. Проверка доступности сервера

Откройте консоль браузера и выполните:

```javascript
const ws = new WebSocket('wss://catlover-ldwhaxp1.livekit.cloud');
ws.onopen = () => console.log('✅ Сервер доступен');
ws.onerror = (e) => console.error('❌ Ошибка подключения:', e);
```

#### 2. Проверка Edge Function

Убедитесь, что Edge Function работает:

```javascript
const { data, error } = await supabase.functions.invoke('livekit-token', {
  body: { roomName: 'test-room', participantName: 'test-user' }
});
console.log('Token:', data?.token);
console.log('Error:', error);
```

Если ошибка, проверьте:
- Edge Function задеплоена
- Secrets настроены в Dashboard
- Пользователь авторизован

#### 3. Проверка логов Edge Function

Посмотрите логи для диагностики:

```bash
supabase functions logs livekit-token --project-ref cqqqwhtfssgfergbjqmo
```

Или в Supabase Dashboard → Edge Functions → livekit-token → Logs

#### 4. Fallback на P2P WebRTC

Если LiveKit недоступен, можно использовать прямое P2P соединение:
- Работает без сервера
- Ограничение: только 1-на-1 звонки
- Используйте `RTCPeerConnection` напрямую

### Текущие улучшения:

✅ **Использование Edge Function** — токены генерируются на сервере (безопаснее)
✅ **Добавлен таймаут 3 секунды** для переключения микрофона/камеры
✅ **Оптимистичное обновление UI** — кнопки реагируют мгновенно
✅ **Откат состояния** при ошибке
✅ **Улучшенное логирование** с эмодзи индикаторами
✅ **API credentials защищены** — не хранятся на клиенте

### Рекомендации:

1. **Настройте Edge Function**
   - См. файл `SETUP_LIVEKIT_EDGE_FUNCTION.md`
   - Добавьте Secrets в Supabase Dashboard
   - Задеплойте функцию: `supabase functions deploy livekit-token`

2. **Проверьте LiveKit Dashboard**
   - Зайдите на https://cloud.livekit.io/
   - Проверьте статус проекта
   - Посмотрите логи подключений

3. **Обновите credentials**
   - Если проект удалён/истёк, создайте новый
   - Обновите Secrets в Supabase Dashboard (не в `.env`!)

3. **Используйте локальный LiveKit сервер**
   - Для разработки можно запустить локально:
   ```bash
   docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
     -e LIVEKIT_KEYS="devkey: secret" \
     livekit/livekit-server --dev
   ```
   - Обновите `VITE_LIVEKIT_URL=ws://localhost:7880`
   - Обновите Secrets в Supabase: `LIVEKIT_API_KEY=devkey`, `LIVEKIT_API_SECRET=secret`

### Текущее поведение:

- ✅ Звонок запускается автоматически (аудио-only)
- ✅ Модальное окно не исчезает сразу
- ✅ Микрофон/камера переключаются с таймаутом
- ⚠️ Если сервер не отвечает > 3 сек, показывается предупреждение
- ✅ UI остаётся отзывчивым даже при проблемах с сервером

### Следующие шаги:

1. Настроить Edge Function (см. `SETUP_LIVEKIT_EDGE_FUNCTION.md`)
2. Проверить доступность LiveKit сервера
3. Если сервер недоступен — создать новый проект на cloud.livekit.io
4. Обновить Secrets в Supabase Dashboard
5. Задеплоить Edge Function
6. Протестировать звонок
