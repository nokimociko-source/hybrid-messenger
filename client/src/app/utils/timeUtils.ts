// Утилиты для форматирования времени (как в Telegram)

export function formatMessageTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Сегодня - показываем время
  if (diffDays === 0) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  // Вчера
  if (diffDays === 1) {
    return 'вчера';
  }

  // Неделя назад - показываем день недели
  if (diffDays < 7) {
    const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    return days[date.getDay()];
  }

  // Больше недели - показываем дату
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function formatLastSeen(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'только что';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} мин назад`;
  }

  if (diffHours < 24) {
    return `${diffHours} ч назад`;
  }

  if (diffDays === 1) {
    return 'вчера';
  }

  if (diffDays < 7) {
    return `${diffDays} дн назад`;
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function formatTypingText(usernames: string[]): string {
  if (usernames.length === 0) return '';
  if (usernames.length === 1) return `${usernames[0]} печатает...`;
  if (usernames.length === 2) return `${usernames[0]} и ${usernames[1]} печатают...`;
  return `${usernames[0]} и ещё ${usernames.length - 1} печатают...`;
}
