import { logger } from '../../utils/logger';
import React, { useState } from 'react';
import { Icon, Icons, Spinner, Scroll } from 'folds';
import { supabase } from '../../../supabaseClient';
import { useSupabaseRooms } from '../../hooks/useSupabaseChat';
import { useNavigate } from 'react-router-dom';
import { HOME_PATH } from '../paths';
import { CatloverAvatar } from '../../components/CatloverAvatar';

type SearchedUser = {
    id: string;
    username: string;
    avatar_url: string | null;
    about: string | null;
};

export function CatloverUserSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchedUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { createDirectRoom } = useSupabaseRooms();
    const navigate = useNavigate();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const searchTerm = query.trim();
        if (!searchTerm) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Try RPC search (Robust)
            const { data, error: rpcError } = await supabase.rpc('search_users', { search_query: searchTerm });

            let searchData = data;

            if (rpcError) {
                logger.warn('RPC Search error, falling back to direct:', rpcError);
                // 2. Fallback to direct table query if RPC fails or is missing (due to cache)
                const { data: directData, error: directError } = await supabase
                    .from('users')
                    .select('id, username, avatar_url, about')
                    .or(`username.ilike.%${searchTerm}%,id.eq.${searchTerm}`)
                    .limit(20);

                if (directError) {
                    throw directError;
                }
                searchData = directData;
            }

            // 3. If RPC succeeded but returned empty, double check with direct (just in case)
            if (!searchData || searchData.length === 0) {
                const { data: fallbackData } = await supabase
                    .from('users')
                    .select('id, username, avatar_url, about')
                    .ilike('username', `%${searchTerm}%`)
                    .limit(10);
                if (fallbackData && fallbackData.length > 0) {
                    searchData = fallbackData;
                }
            }

            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;

            const processedResults = (searchData || []).map((u: any) => {
                if (u.id === currentUserId) {
                    return {
                        ...u,
                        username: 'Изbranное (You)',
                        about: 'Сохраняйте сообщения и медиа',
                        is_saved_messages: true
                    };
                }
                return u;
            }) as SearchedUser[];

            setResults(processedResults);
        } catch (err: any) {
            logger.error('Final search error:', err);
            setError(err.message || 'Ошибка поиска');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = async (targetUser: SearchedUser) => {
        setLoading(true);
        setError(null);
        try {
            const room = await createDirectRoom(targetUser.id);
            if (room) {
                navigate(`${HOME_PATH}room/${room.id}`);
                onClose();
            } else {
                setError('Не удалось создать чат');
            }
        } catch (err: any) {
            setError('Ошибка при создании чата');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'absolute',
            left: '72px',
            top: 0,
            bottom: 0,
            width: '320px',
            backgroundColor: '#111',
            borderRight: '1px solid rgba(0, 242, 255, 0.1)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '10px 0 30px rgba(0,0,0,0.5)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ flexGrow: 1, fontWeight: 'bold', fontSize: '18px', color: '#fff' }}>Поиск людей</div>
                <div onClick={onClose} style={{ cursor: 'pointer', padding: '4px', borderRadius: '50%', color: '#888' }}>
                    <Icon size="200" src={Icons.Cross} />
                </div>
            </div>

            <div style={{ padding: '16px' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                    <label htmlFor="user-search-input" style={{ display: 'none' }}>Поиск людей</label>
                    <input
                        id="user-search-input"
                        name="user-search"
                        type="text"
                        placeholder="@username, email или телефон"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{
                            flexGrow: 1,
                            backgroundColor: '#222',
                            border: '1px solid rgba(0, 242, 255, 0.2)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            color: '#fff',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        style={{
                            backgroundColor: '#00f2ff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0 12px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <Icon size="200" src={Icons.Search} />
                    </button>
                </form>
            </div>

            <Scroll style={{ flexGrow: 1 }}>
                <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}><Spinner variant="Secondary" /></div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', color: '#ff4b4b', padding: '20px', fontSize: '14px', backgroundColor: 'rgba(255, 75, 75, 0.1)', borderRadius: '8px' }}>
                            {error}
                        </div>
                    ) : results.length > 0 ? (
                        results.map(user => (
                            <div
                                key={user.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px',
                                    backgroundColor: '#1a1a1a',
                                    borderRadius: '12px',
                                    gap: '12px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                <CatloverAvatar
                                    url={user.avatar_url}
                                    displayName={user.username}
                                    size={40}
                                    style={{ backgroundColor: '#333' }}
                                />
                                <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 'bold', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {user.username}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#888', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {user.about || 'Нет описания'}
                                    </div>
                                </div>
                                <div
                                    onClick={() => handleStartChat(user)}
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        backgroundColor: 'rgba(0, 242, 255, 0.1)',
                                        color: '#00f2ff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                    title="Написать"
                                >
                                    <Icon size="200" src={Icons.Send} />
                                </div>
                            </div>
                        ))
                    ) : query && !loading ? (
                        <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Ничего не найдено</div>
                    ) : null}
                </div>
            </Scroll>
        </div>
    );
}
