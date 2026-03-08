import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';
import { ChatFolder, ChatFolderItem } from '../types/chatOrganization';

interface UseChatFoldersReturn {
  folders: ChatFolder[];
  loading: boolean;
  error: Error | null;
  createFolder: (name: string, icon?: string, color?: string) => Promise<ChatFolder>;
  updateFolder: (id: string, updates: Partial<ChatFolder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  assignChatToFolder: (roomId: string, folderId: string) => Promise<void>;
  removeChatFromFolder: (roomId: string, folderId: string) => Promise<void>;
  getChatsInFolder: (folderId: string) => string[];
  reorderFolders: (folderIds: string[]) => Promise<void>;
}

export function useChatFolders(): UseChatFoldersReturn {
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [folderItems, setFolderItems] = useState<ChatFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch folders and folder items
  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          if (mounted) {
            setLoading(false);
            setError(new Error('Пользователь не авторизован'));
          }
          return;
        }

        // Fetch folders
        const { data: foldersData, error: foldersError } = await supabase
          .from('chat_folders')
          .select('*')
          .eq('user_id', userId)
          .order('order_index', { ascending: true });

        if (foldersError) throw foldersError;

        // Fetch folder items
        const { data: itemsData, error: itemsError } = await supabase
          .from('chat_folder_items')
          .select('*')
          .in('folder_id', (foldersData || []).map(f => f.id));

        if (itemsError) throw itemsError;

        if (mounted) {
          setFolders(foldersData || []);
          setFolderItems(itemsData || []);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        logger.error('Error fetching folders:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Не удалось загрузить папки'));
          setLoading(false);
        }
      }
    }

    fetchData();

    // Subscribe to realtime changes for folders
    const foldersChannel = supabase
      .channel('chat_folders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_folders',
        },
        () => {
          if (mounted) fetchData();
        }
      )
      .subscribe();

    // Subscribe to realtime changes for folder items
    const itemsChannel = supabase
      .channel('chat_folder_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_folder_items',
        },
        () => {
          if (mounted) fetchData();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(foldersChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, []);

  // Create a new folder
  const createFolder = useCallback(async (
    name: string,
    icon?: string,
    color?: string
  ): Promise<ChatFolder> => {
    try {
      // Validate folder name
      if (!name.trim()) {
        throw new Error('Имя папки не может быть пустым');
      }
      if (name.length > 50) {
        throw new Error('Имя папки не может превышать 50 символов');
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      // Get the next order_index
      const maxOrder = folders.reduce((max, f) => Math.max(max, f.order_index), -1);

      const folderData = {
        user_id: userId,
        name: name.trim(),
        icon: icon || null,
        color: color || null,
        order_index: maxOrder + 1,
      };

      const { data, error: insertError } = await supabase
        .from('chat_folders')
        .insert(folderData)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Папка с таким именем уже существует');
        }
        throw insertError;
      }

      return data;
    } catch (err) {
      logger.error('Error creating folder:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось создать папку';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, [folders]);

  // Update an existing folder
  const updateFolder = useCallback(async (
    id: string,
    updates: Partial<ChatFolder>
  ): Promise<void> => {
    try {
      // Validate name if provided
      if (updates.name !== undefined) {
        if (!updates.name.trim()) {
          throw new Error('Имя папки не может быть пустым');
        }
        if (updates.name.length > 50) {
          throw new Error('Имя папки не может превышать 50 символов');
        }
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      // Prepare update data (only allowed fields)
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updateData.name = updates.name.trim();
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.color !== undefined) updateData.color = updates.color;

      const { error: updateError } = await supabase
        .from('chat_folders')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('Папка с таким именем уже существует');
        }
        throw updateError;
      }
    } catch (err) {
      logger.error('Error updating folder:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось обновить папку';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  // Delete a folder
  const deleteFolder = useCallback(async (id: string): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      // Delete folder (cascade will handle folder items)
      const { error: deleteError } = await supabase
        .from('chat_folders')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;
    } catch (err) {
      logger.error('Error deleting folder:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось удалить папку';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  // Assign a chat to a folder
  const assignChatToFolder = useCallback(async (
    roomId: string,
    folderId: string
  ): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      // Verify folder belongs to user
      const folder = folders.find(f => f.id === folderId);
      if (!folder) {
        throw new Error('Папка не найдена');
      }

      // Check if already assigned
      const existingItem = folderItems.find(
        item => item.folder_id === folderId && item.room_id === roomId
      );
      if (existingItem) {
        return; // Already assigned, no error
      }

      const { error: insertError } = await supabase
        .from('chat_folder_items')
        .insert({
          folder_id: folderId,
          room_id: roomId,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          return; // Already exists, no error
        }
        throw insertError;
      }
    } catch (err) {
      logger.error('Error assigning chat to folder:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось добавить чат в папку';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, [folders, folderItems]);

  // Remove a chat from a folder
  const removeChatFromFolder = useCallback(async (
    roomId: string,
    folderId: string
  ): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const { error: deleteError } = await supabase
        .from('chat_folder_items')
        .delete()
        .eq('folder_id', folderId)
        .eq('room_id', roomId);

      if (deleteError) throw deleteError;
    } catch (err) {
      logger.error('Error removing chat from folder:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось удалить чат из папки';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  // Get all chat IDs in a specific folder
  const getChatsInFolder = useCallback((folderId: string): string[] => {
    return folderItems
      .filter(item => item.folder_id === folderId)
      .map(item => item.room_id);
  }, [folderItems]);

  // Reorder folders
  const reorderFolders = useCallback(async (folderIds: string[]): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      // Update order_index for each folder
      const updates = folderIds.map((folderId, index) => 
        supabase
          .from('chat_folders')
          .update({ order_index: index })
          .eq('id', folderId)
          .eq('user_id', userId)
      );

      const results = await Promise.all(updates);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }
    } catch (err) {
      logger.error('Error reordering folders:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось изменить порядок папок';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    assignChatToFolder,
    removeChatFromFolder,
    getChatsInFolder,
    reorderFolders,
  };
}
