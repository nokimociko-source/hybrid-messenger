import React from 'react';
import { Message } from '../../../hooks/supabaseHelpers';

interface MessageReactionsProps {
    msg: Message;
    currentUser: string | null;
    onReaction: (id: string, emoji: string) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
    msg,
    currentUser,
    onReaction
}) => {
    if (!msg.reactions || msg.reactions.length === 0) return null;

    const reactionSummary = msg.reactions.reduce((acc: any, r: any) => {
        if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasCurrentUser: false };
        acc[r.emoji].count += 1;
        if (r.user_id === currentUser) acc[r.emoji].hasCurrentUser = true;
        return acc;
    }, {});

    return (
        <div style={{
            position: 'absolute',
            bottom: '-10px',
            right: '4px',
            display: 'flex',
            gap: '3px',
            flexWrap: 'wrap',
            maxWidth: '180px',
            zIndex: 2
        }}>
            {Object.entries(reactionSummary).map(([emoji, data]: [string, any]) => (
                <div
                    key={emoji}
                    onClick={() => onReaction(msg.id, emoji)}
                    style={{
                        padding: '2px 6px',
                        borderRadius: '10px',
                        backgroundColor: data.hasCurrentUser ? 'rgba(0, 242, 255, 0.2)' : 'rgba(30, 30, 30, 0.95)',
                        border: data.hasCurrentUser ? '1px solid rgba(0, 242, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'all 0.15s',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                        minHeight: '20px'
                    }}
                >
                    <span style={{ fontSize: '13px', lineHeight: '1' }}>{emoji}</span>
                    {data.count > 1 && (
                        <span style={{ fontSize: '10px', color: data.hasCurrentUser ? '#00f2ff' : '#999', fontWeight: '500' }}>{data.count}</span>
                    )}
                </div>
            ))}
        </div>
    );
};
