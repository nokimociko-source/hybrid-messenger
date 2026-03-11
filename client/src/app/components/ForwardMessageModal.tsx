import React, { useState } from 'react';
import { useSupabaseRooms } from '../hooks/useSupabaseRooms';
import { Message, Room } from '../hooks/supabaseHelpers';
import { CatloverModal } from './CatloverModal';
import { CatloverAvatar } from './CatloverAvatar';

interface ForwardMessageModalProps {
    message: Message;
    onClose: () => void;
    onForward: (targetRoomIds: string[]) => Promise<void>;
}

export function ForwardMessageModal({ message, onClose, onForward }: ForwardMessageModalProps) {
    const { rooms, loading } = useSupabaseRooms();
    const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
    const [sending, setSending] = useState(false);

    const toggleRoom = (roomId: string) => {
        setSelectedRoomIds(prev => 
            prev.includes(roomId) 
                ? prev.filter(id => id !== roomId) 
                : [...prev, roomId]
        );
    };

    const handleForward = async () => {
        if (selectedRoomIds.length === 0) return;
        setSending(true);
        try {
            await onForward(selectedRoomIds);
            onClose();
        } finally {
            setSending(false);
        }
    };

    return (
        <CatloverModal isOpen={true} onClose={onClose} title="Переслать сообщение">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh' }}>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '14px', borderLeft: '3px solid #00f2ff' }}>
                    <div style={{ color: '#00f2ff', fontWeight: 'bold', marginBottom: '4px' }}>
                        {message.users?.username}
                    </div>
                    <div style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {message.content || (message.media_url ? '📎 Медиа' : 'Сообщение')}
                    </div>
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Загрузка чатов...</div>
                    ) : rooms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Нет доступных чатов</div>
                    ) : (
                        rooms.map((room: Room) => (
                            <div 
                                key={room.id}
                                onClick={() => toggleRoom(room.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    background: selectedRoomIds.includes(room.id) ? 'rgba(0, 242, 255, 0.15)' : 'transparent',
                                    border: `1px solid ${selectedRoomIds.includes(room.id) ? 'rgba(0, 242, 255, 0.4)' : 'rgba(255,255,255,0.05)'}`,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <CatloverAvatar url={room.avatar_url} displayName={room.displayName || 'Room'} size={36} />
                                <div style={{ flex: 1, fontWeight: '500' }}>{room.displayName}</div>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    border: `2px solid ${selectedRoomIds.includes(room.id) ? '#00f2ff' : 'rgba(255,255,255,0.3)'}`,
                                    background: selectedRoomIds.includes(room.id) ? '#00f2ff' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {selectedRoomIds.includes(room.id) && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button 
                    onClick={handleForward}
                    disabled={selectedRoomIds.length === 0 || sending}
                    style={{
                        padding: '12px',
                        background: '#00f2ff',
                        color: '#000',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        cursor: selectedRoomIds.length > 0 ? 'pointer' : 'not-allowed',
                        opacity: selectedRoomIds.length > 0 ? 1 : 0.5,
                        transition: 'all 0.2s'
                    }}
                >
                    {sending ? 'Отправка...' : `Переслать в ${selectedRoomIds.length} ${selectedRoomIds.length === 1 ? 'чат' : 'чата'}`}
                </button>
            </div>
        </CatloverModal>
    );
}
