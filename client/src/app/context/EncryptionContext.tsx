import { logger } from '../utils/logger';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { encryptText, decryptText } from '../utils/encryption';
import { MnemonicService } from '../utils/MnemonicService';

export interface EncryptionContextType {
    masterKey: string | null;
    isLocked: boolean;
    unlock: (password: string, rememberSession?: boolean) => Promise<boolean>;
    lock: () => void;
    encrypt: (text: string) => Promise<string>;
    decrypt: (encryptedBase64: string) => Promise<string>;
    mnemonic: string | null;
    generateMnemonic: () => string;
    verifyMnemonic: (phrase: string, hash: string) => Promise<boolean>;
    getRoomKey: (roomId: string, version: number) => Promise<string | null>;
    rotateRoomKey: (roomId: string) => Promise<{ version: number, key: string }>;
    currentRoomVersion: (roomId: string) => number;
    recover: (phrase: string, newPassword: string) => Promise<boolean>;
    e2eEnabled: boolean;
    setE2EEnabled: (enabled: boolean) => void;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

export const EncryptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterKey, setMasterKey] = useState<string | null>(null);
    const [mnemonic, setMnemonic] = useState<string | null>(null);
    const [roomKeys, setRoomKeys] = useState<{ [roomId: string]: { [version: number]: string } }>({});
    const [roomVersions, setRoomVersions] = useState<{ [roomId: string]: number }>({});
    const [e2eEnabled, _setE2EEnabled] = useState<boolean>(false);

    // Initialize from sessionStorage on mount
    useEffect(() => {
        const savedKey = sessionStorage.getItem('e2e_session_key');
        if (savedKey) {
            setMasterKey(savedKey);
        }

        const savedE2E = localStorage.getItem('e2e_enabled');
        if (savedE2E === 'true') {
            _setE2EEnabled(true);
        }
    }, []);

    const setE2EEnabled = useCallback((enabled: boolean) => {
        _setE2EEnabled(enabled);
        localStorage.setItem('e2e_enabled', enabled.toString());
    }, []);

    const unlock = useCallback(async (password: string, rememberSession: boolean = true) => {
        try {
            const { supabase } = await import('../../supabaseClient');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data: userData, error } = await supabase
                .from('users')
                .select('encrypted_master_key')
                .eq('id', user.id)
                .single();

            if (error || !userData) return false;

            let finalMK: string;

            if (userData.encrypted_master_key) {
                // Use bundled Master Key
                finalMK = await decryptText(userData.encrypted_master_key, password);
            } else {
                // COMPATIBILITY: Migration path
                finalMK = password;
            }

            setMasterKey(finalMK);
            if (rememberSession) {
                sessionStorage.setItem('e2e_session_key', finalMK);
            }
            return true;
        } catch (e) {
            logger.error('Unlock failed:', e);
            return false;
        }
    }, []);

    const lock = useCallback(() => {
        setMasterKey(null);
        setMnemonic(null);
        sessionStorage.removeItem('e2e_session_key');
    }, []);

    const encrypt = useCallback(async (text: string) => {
        if (!masterKey) throw new Error('Encryption is locked');
        return encryptText(text, masterKey);
    }, [masterKey]);

    const decrypt = useCallback(async (encryptedBase64: string) => {
        if (!masterKey) throw new Error('Encryption is locked');
        return decryptText(encryptedBase64, masterKey);
    }, [masterKey]);

    const generateMnemonic = useCallback(() => {
        const phrase = MnemonicService.generateMnemonic();
        setMnemonic(phrase);
        return phrase;
    }, []);

    const verifyMnemonic = useCallback(async (phrase: string, hash: string) => {
        return MnemonicService.verify(phrase, hash);
    }, []);

    const getRoomKey = useCallback(async (roomId: string, version: number) => {
        if (!masterKey) return null;

        if (roomKeys[roomId]?.[version]) {
            return roomKeys[roomId][version];
        }

        const { supabase } = await import('../../supabaseClient');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('room_keys')
            .select('encrypted_room_key')
            .eq('room_id', roomId)
            .eq('key_version', version)
            .eq('user_id', user.id)
            .maybeSingle();

        if (data && !error) {
            try {
                const decryptedKey = await decryptText(data.encrypted_room_key, masterKey);
                setRoomKeys(prev => ({
                    ...prev,
                    [roomId]: { ...(prev[roomId] || {}), [version]: decryptedKey }
                }));
                return decryptedKey;
            } catch (e) {
                logger.error('Failed to decrypt room key:', e);
            }
        }
        return null;
    }, [masterKey, roomKeys]);

    const rotateRoomKey = useCallback(async (roomId: string) => {
        if (!masterKey) throw new Error('Encryption is locked');

        const { supabase } = await import('../../supabaseClient');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const { data: latest } = await supabase
            .from('room_keys')
            .select('key_version')
            .eq('room_id', roomId)
            .eq('user_id', user.id)
            .order('key_version', { ascending: false })
            .limit(1)
            .maybeSingle();

        const newVersion = (latest?.key_version || 0) + 1;
        const newKey = MnemonicService.generateMnemonic();
        const encryptedKey = await encryptText(newKey, masterKey);

        const { error } = await supabase
            .from('room_keys')
            .insert({
                room_id: roomId,
                key_version: newVersion,
                encrypted_room_key: encryptedKey,
                user_id: user.id
            });

        if (error) throw error;

        setRoomKeys(prev => ({
            ...prev,
            [roomId]: { ...(prev[roomId] || {}), [newVersion]: newKey }
        }));
        setRoomVersions(prev => ({ ...prev, [roomId]: newVersion }));

        return { version: newVersion, key: newKey };
    }, [masterKey]);

    const currentRoomVersion = useCallback((roomId: string) => {
        return roomVersions[roomId] || 1;
    }, [roomVersions]);

    const recover = useCallback(async (phrase: string, newPassword: string) => {
        try {
            const { supabase } = await import('../../supabaseClient');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data: userData } = await supabase
                .from('users')
                .select('recovery_master_key, recovery_phrase_hash')
                .eq('id', user.id)
                .single();

            if (!userData?.recovery_master_key || !userData?.recovery_phrase_hash) {
                throw new Error('Recovery data not found');
            }

            const isValid = await MnemonicService.verify(phrase, userData.recovery_phrase_hash);
            if (!isValid) return false;

            const mk = await decryptText(userData.recovery_master_key, phrase);
            const newEncryptedMK = await encryptText(mk, newPassword);

            const { error } = await supabase
                .from('users')
                .update({ encrypted_master_key: newEncryptedMK })
                .eq('id', user.id);

            if (error) throw error;

            setMasterKey(mk);
            sessionStorage.setItem('e2e_session_key', mk);
            return true;
        } catch (e) {
            logger.error('Recovery failed:', e);
            return false;
        }
    }, []);

    return (
        <EncryptionContext.Provider value={{
            masterKey,
            isLocked: !masterKey,
            unlock,
            lock,
            encrypt,
            decrypt,
            mnemonic,
            generateMnemonic,
            verifyMnemonic,
            getRoomKey,
            rotateRoomKey,
            currentRoomVersion,
            recover,
            e2eEnabled,
            setE2EEnabled
        }}>
            {children}
        </EncryptionContext.Provider>
    );
};

export const useEncryption = () => {
    const context = useContext(EncryptionContext);
    if (context === undefined) {
        throw new Error('useEncryption must be used within an EncryptionProvider');
    }
    return context;
};
