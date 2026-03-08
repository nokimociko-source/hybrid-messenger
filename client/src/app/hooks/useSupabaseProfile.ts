import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, uploadMediaFile } from './supabaseHelpers';

export function useSupabaseProfile() {
    const [profile, setProfile] = useState<{
        id: string;
        username: string;
        avatar_url: string | null;
        about: string | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        const { id } = await getCurrentUser();
        if (!id) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            logger.error('Error fetching profile:', error.message);
        } else {
            setProfile(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updateUserAvatar = useCallback(async (file: File) => {
        setLoading(true);
        const { id } = await getCurrentUser();
        if (!id) {
            setLoading(false);
            return null;
        }

        const publicUrl = await uploadMediaFile(file);
        if (publicUrl) {
            const { error } = await supabase
                .from('users')
                .update({ avatar_url: publicUrl })
                .eq('id', id);

            if (error) {
                logger.error('Error updating avatar:', error.message);
            } else {
                await fetchProfile();
            }
        }
        setLoading(false);
        return publicUrl;
    }, [fetchProfile]);

    return { profile, loading, updateUserAvatar };
}
