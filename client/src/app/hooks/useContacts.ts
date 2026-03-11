import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUserId } from '../utils/authCache';

interface Contact {
  id: string;
  username?: string;
  avatar_url?: string;
}

/**
 * Хук для получения списка контактов пользователя
 * Возвращает пользователей с которыми есть прямые чаты
 */
export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          setLoading(false);
          return;
        }

        // Получаем все прямые чаты пользователя
        const { data: rooms, error } = await supabase
          .from('rooms')
          .select('target_user_id, target_user(id, username, avatar_url), created_by_user(id, username, avatar_url)')
          .eq('is_direct', true)
          .or(`created_by.eq.${userId},target_user_id.eq.${userId}`);

        if (error) throw error;

        // Извлекаем уникальных пользователей
        const contactMap = new Map<string, Contact>();
        
        rooms?.forEach((room: any) => {
          // Если мы создатель, добавляем target_user
          if (room.target_user && room.target_user.id !== userId) {
            contactMap.set(room.target_user.id, {
              id: room.target_user.id,
              username: room.target_user.username,
              avatar_url: room.target_user.avatar_url,
            });
          }
          // Если мы target, добавляем создателя
          if (room.created_by_user && room.created_by_user.id !== userId) {
            contactMap.set(room.created_by_user.id, {
              id: room.created_by_user.id,
              username: room.created_by_user.username,
              avatar_url: room.created_by_user.avatar_url,
            });
          }
        });

        setContacts(Array.from(contactMap.values()));
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  return { contacts, loading };
}
