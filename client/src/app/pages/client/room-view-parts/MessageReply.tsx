import React from 'react';
import { Message } from '../../../hooks/supabaseHelpers';

interface MessageReplyProps {
    replyToId: string | null | undefined;
    allMessages: Message[];
    isLayoutSelf: boolean;
}

export const MessageReply: React.FC<MessageReplyProps> = ({
    replyToId,
    allMessages,
    isLayoutSelf
}) => {
    if (!replyToId) return null;

    const replyMsg = allMessages.find(m => m.id === replyToId);

    const scrollToMessage = () => {
        const element = document.getElementById(`message-${replyToId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div
            style={{
                padding: '6px 10px',
                marginBottom: '6px',
                borderLeft: '2px solid #00f2ff',
                backgroundColor: isLayoutSelf ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                cursor: 'pointer',
                maxWidth: '100%',
                overflow: 'hidden'
            }}
            onClick={scrollToMessage}
        >
            {replyMsg ? (
                <>
                    <div style={{ fontSize: '12px', color: '#00f2ff', fontWeight: '600', marginBottom: '2px' }}>
                        {replyMsg.users?.username || 'Неизвестно'}
                    </div>
                    <div style={{ 
                        fontSize: '13px', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                    }}>
                        {replyMsg.content || '📎 Медиа'}
                    </div>
                </>
            ) : (
                <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>Сообщение удалено</div>
            )}
        </div>
    );
};
