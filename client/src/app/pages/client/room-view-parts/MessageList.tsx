import { logger } from '../../../utils/logger';
import React, { RefObject } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Spinner } from 'folds';
import * as css from '../CatloverRoomView.css';
import { MessageItem } from '../MessageItem';
import { MasterPasswordModal } from '../../../components/MasterPasswordModal';

interface MessageListProps {
    roomId: string;
    loading: boolean;
    showJumpToUnread: boolean;
    handleJumpToUnread: () => void;
    getUnreadCount: (id: string) => number;
    virtualItems: any[];
    room: any;
    virtuosoRef: RefObject<VirtuosoHandle>;
    currentUser: string | null;
    isMultiSelectMode: boolean;
    selectedMessages: Set<string>;
    toggleMessageSelection: (id: string) => void;
    handleLongPress: (id: string) => void;
    addReaction: (msgId: string, emoji: string) => void;
    handleForwardMessage: (msg: any) => void;
    setReplyingTo: (msg: any) => void;
    handleDeleteMessage: (id: string) => void;
    startEditMessage: (msg: any) => void;
    handlePinMessage: (id: string) => void;
    handleUnpinMessage: (id: string) => void;
    setShowUserProfile: (id: string) => void;
    handleViewMedia: (url: string) => void;
    vote: (pollId: string, optionId: string) => void;
    unvote: (pollId: string, optionId: string) => void;
    polls: any[];
    linkPreviews: Map<string, any>;
    channelPermissions: any;
    messages: any[];
    isSavedMessages: boolean;
    lastSelectedId: string | null;
    handleSelectUntilHere: (id: string) => void;
    handleReport: (msg: any) => void;
    isEncryptionModalOpen: boolean;
    setIsEncryptionModalOpen: (open: boolean) => void;
}

export function MessageList({
    roomId,
    loading,
    showJumpToUnread,
    handleJumpToUnread,
    getUnreadCount,
    virtualItems,
    room,
    virtuosoRef,
    currentUser,
    isMultiSelectMode,
    selectedMessages,
    toggleMessageSelection,
    handleLongPress,
    addReaction,
    handleForwardMessage,
    setReplyingTo,
    handleDeleteMessage,
    startEditMessage,
    handlePinMessage,
    handleUnpinMessage,
    setShowUserProfile,
    handleViewMedia,
    vote,
    unvote,
    polls,
    linkPreviews,
    channelPermissions,
    messages,
    isSavedMessages,
    lastSelectedId,
    handleSelectUntilHere,
    handleReport,
    isEncryptionModalOpen,
    setIsEncryptionModalOpen
}: MessageListProps) {
    return (
        <div style={{ flexGrow: 1, position: 'relative' }} className={css.MessageTimeline}>
            {loading && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spinner variant="Secondary" />
                </div>
            )}

            {/* Jump to Unread Button */}
            {showJumpToUnread && (
                <div
                    onClick={handleJumpToUnread}
                    style={{
                        position: 'fixed',
                        bottom: '120px',
                        right: '40px',
                        background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.95) 0%, rgba(0, 200, 255, 0.95) 100%)',
                        color: '#000',
                        padding: '12px 20px',
                        borderRadius: '24px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(0, 242, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: '600',
                        fontSize: '14px',
                        zIndex: 50,
                        transition: 'all 0.2s',
                        animation: 'slideUp 0.3s ease-out'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        (e.currentTarget.style as any).boxShadow = '0 6px 24px rgba(0, 242, 255, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        (e.currentTarget.style as any).boxShadow = '0 4px 20px rgba(0, 242, 255, 0.4)';
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                    <span>{getUnreadCount(roomId || '')} новых</span>
                </div>
            )}

            <MasterPasswordModal
                isOpen={isEncryptionModalOpen}
                onClose={() => setIsEncryptionModalOpen(false)}
                onSuccess={() => {
                    logger.info('UNLOCKED');
                }}
            />

            {virtualItems.length === 0 && !loading && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: '20px',
                    animation: 'fadeIn 0.4s ease-out'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'rgba(0, 242, 255, 0.08)',
                        border: '1px solid rgba(0, 242, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '36px'
                    }}>
                        💬
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                            Нет сообщений
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>
                            {room?.type === 'channel' ? 'Здесь пока нет публикаций' : 'Напишите первое сообщение!'}
                        </div>
                    </div>
                </div>
            )}

            {virtualItems.length > 0 && (
                <Virtuoso
                    ref={virtuosoRef}
                    data={virtualItems}
                    initialTopMostItemIndex={virtualItems.length - 1}
                    followOutput="smooth"
                    style={{ height: '100%', width: '100%' }}
                    totalCount={virtualItems.length}
                    itemContent={(index, item) => {
                        if (item.type === 'date') {
                            return (
                                <div className={css.DateHeader} style={{ padding: '20px 0' }}>
                                    <span>{item.date}</span>
                                </div>
                            );
                        }

                        if (item.type === 'uploading') {
                            return (
                                <div className={`${css.MessageWrapper} ${css.MessageWrapperSelf}`} style={{ paddingBottom: '16px' }}>
                                    <div className={`${css.MessageBubble} ${css.MessageBubbleSelf}`} style={{ opacity: 0.7 }}>
                                        <Spinner variant="Secondary" />
                                    </div>
                                </div>
                            );
                        }

                        const msg = item.message;
                        const isSelf = msg.user_id === currentUser;
                        const isLayoutSelf = isSelf && room?.type !== 'channel';

                        return (
                            <div style={{ paddingBottom: '16px' }}>
                                <MessageItem
                                    msg={msg}
                                    currentUser={currentUser}
                                    room={room}
                                    isLayoutSelf={isLayoutSelf}
                                    isMultiSelectMode={isMultiSelectMode}
                                    isSelected={selectedMessages.has(msg.id)}
                                    onSelect={toggleMessageSelection}
                                    onLongPress={handleLongPress}
                                    onReaction={addReaction}
                                    onForward={handleForwardMessage}
                                    onReply={setReplyingTo}
                                    onDelete={handleDeleteMessage}
                                    onEdit={startEditMessage}
                                    onPin={handlePinMessage}
                                    onUnpin={handleUnpinMessage}
                                    onViewProfile={setShowUserProfile}
                                    onViewMedia={handleViewMedia}
                                    onVote={vote}
                                    onUnvote={unvote}
                                    polls={polls}
                                    linkPreviews={linkPreviews}
                                    channelPermissions={channelPermissions}
                                    allMessages={messages}
                                    isSavedMessages={!!isSavedMessages}
                                    lastSelectedId={lastSelectedId}
                                    onSelectUntilHere={handleSelectUntilHere}
                                    onReport={handleReport}
                                />
                            </div>
                        );
                    }}
                />
            )}
        </div>
    );
}
