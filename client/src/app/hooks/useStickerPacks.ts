import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';

export interface Sticker {
  id: string;
  pack_id: string;
  image_url: string;
  emoji_shortcode: string | null;
  order_index: number;
  created_at: string;
}

export interface StickerPack {
  id: string;
  name: string;
  author: string;
  preview_url: string;
  created_at: string;
  stickers: Sticker[];
  orderIndex: number;
}

export interface PackMetadata {
  name: string;
  author: string;
}

interface UseStickerPacksReturn {
  packs: StickerPack[];
  loading: boolean;
  error: Error | null;
  addPack: (packId: string) => Promise<void>;
  removePack: (packId: string) => Promise<void>;
  reorderPacks: (packIds: string[]) => Promise<void>;
  uploadPack: (files: File[], metadata: PackMetadata) => Promise<string>;
}

export function useStickerPacks(): UseStickerPacksReturn {
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserPacks = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      // Query user_sticker_packs with joins to get full pack data
      const { data: userPacks, error: userPacksError } = await supabase
        .from('user_sticker_packs')
        .select(`
          order_index,
          pack_id,
          sticker_packs (
            id,
            name,
            author,
            preview_url,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('order_index', { ascending: true });

      if (userPacksError) throw userPacksError;

      if (!userPacks || userPacks.length === 0) {
        setPacks([]);
        setLoading(false);
        return;
      }

      // Fetch stickers for each pack
      const packIds = userPacks.map((up: any) => up.pack_id);
      const { data: stickers, error: stickersError } = await supabase
        .from('stickers')
        .select('*')
        .in('pack_id', packIds)
        .order('order_index', { ascending: true });

      if (stickersError) throw stickersError;

      // Group stickers by pack_id
      const stickersByPack = (stickers || []).reduce((acc: Record<string, Sticker[]>, sticker: Sticker) => {
        if (!acc[sticker.pack_id]) acc[sticker.pack_id] = [];
        acc[sticker.pack_id].push(sticker);
        return acc;
      }, {});

      // Combine data
      const fullPacks: StickerPack[] = userPacks.map((up: any) => ({
        ...(up.sticker_packs as any),
        stickers: stickersByPack[up.pack_id] || [],
        orderIndex: up.order_index,
      }));

      setPacks(fullPacks);
      setError(null);
    } catch (err) {
      logger.error('Error fetching sticker packs:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserPacks();
  }, [fetchUserPacks]);

  const addPack = useCallback(async (packId: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Check if user already has 50 packs
      const { count } = await supabase
        .from('user_sticker_packs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count && count >= 50) {
        throw new Error('Maximum of 50 sticker packs allowed');
      }

      // Get next order_index
      const { data: existingPacks } = await supabase
        .from('user_sticker_packs')
        .select('order_index')
        .eq('user_id', userId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingPacks && existingPacks.length > 0 
        ? existingPacks[0].order_index + 1 
        : 0;

      const { error: insertError } = await supabase
        .from('user_sticker_packs')
        .insert({
          user_id: userId,
          pack_id: packId,
          order_index: nextOrderIndex,
        });

      if (insertError) throw insertError;

      await fetchUserPacks();
    } catch (err) {
      logger.error('Error adding sticker pack:', err);
      setError(err as Error);
      throw err;
    }
  }, [fetchUserPacks]);

  const removePack = useCallback(async (packId: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { error: deleteError } = await supabase
        .from('user_sticker_packs')
        .delete()
        .eq('user_id', userId)
        .eq('pack_id', packId);

      if (deleteError) throw deleteError;

      await fetchUserPacks();
    } catch (err) {
      logger.error('Error removing sticker pack:', err);
      setError(err as Error);
      throw err;
    }
  }, [fetchUserPacks]);

  const reorderPacks = useCallback(async (packIds: string[]) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Update order_index for each pack
      const updates = packIds.map((packId, index) => ({
        user_id: userId,
        pack_id: packId,
        order_index: index,
      }));

      // Use upsert to update order_index
      const { error: updateError } = await supabase
        .from('user_sticker_packs')
        .upsert(updates, { onConflict: 'user_id,pack_id' });

      if (updateError) throw updateError;

      await fetchUserPacks();
    } catch (err) {
      logger.error('Error reordering sticker packs:', err);
      setError(err as Error);
      throw err;
    }
  }, [fetchUserPacks]);

  const uploadPack = useCallback(async (files: File[], metadata: PackMetadata): Promise<string> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      if (files.length === 0) throw new Error('No files provided');
      if (files.length > 50) throw new Error('Maximum 50 stickers per pack');

      // Validate files
      for (const file of files) {
        if (!['image/webp', 'image/png'].includes(file.type)) {
          throw new Error(`Invalid file format: ${file.name}. Only WebP and PNG are allowed.`);
        }
        if (file.size > 512 * 1024) {
          throw new Error(`File too large: ${file.name}. Maximum size is 512KB.`);
        }
      }

      // Create sticker pack record
      const { data: packData, error: packError } = await supabase
        .from('sticker_packs')
        .insert({
          name: metadata.name,
          author: metadata.author,
          preview_url: '', // Will be updated after uploading first sticker
        })
        .select()
        .single();

      if (packError) throw packError;

      const packId = packData.id;
      const stickerIds: string[] = [];
      let previewUrl = '';

      // Upload files to Supabase Storage
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop() || 'webp';
        const fileName = `${Date.now()}_${i}.${fileExt}`;
        const filePath = `stickers/${packId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file, {
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        const imageUrl = urlData.publicUrl;

        // Use first image as preview
        if (i === 0) {
          previewUrl = imageUrl;
        }

        // Create sticker record
        const { data: stickerData, error: stickerError } = await supabase
          .from('stickers')
          .insert({
            pack_id: packId,
            image_url: imageUrl,
            order_index: i,
          })
          .select()
          .single();

        if (stickerError) throw stickerError;

        stickerIds.push(stickerData.id);
      }

      // Update pack with preview URL
      const { error: updateError } = await supabase
        .from('sticker_packs')
        .update({ preview_url: previewUrl })
        .eq('id', packId);

      if (updateError) throw updateError;

      // Add pack to user's collection
      await addPack(packId);

      return packId;
    } catch (err) {
      logger.error('Error uploading sticker pack:', err);
      setError(err as Error);
      throw err;
    }
  }, [addPack]);

  return {
    packs,
    loading,
    error,
    addPack,
    removePack,
    reorderPacks,
    uploadPack,
  };
}
