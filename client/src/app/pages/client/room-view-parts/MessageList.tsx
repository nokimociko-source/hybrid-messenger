import React, { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Spinner } from 'folds';

import { logger } from '../../../utils/logger';
import { MessageItem } from '../MessageItem';
import { MasterPasswordModal } from '../../../components/MasterPasswordModal';

import * as css from '../CatloverRoomView.css';
import * as listCss from './MessageList.css';

import {
  ChannelPermissions,
  LinkPreview,
  MessageListItem,
  Poll,
  Message,
  Room,
} from './MessageList.types';

interface MessageListProps {
  roomId: string;
  loading: boolean;

  showJumpToUnread: boolean;
  handleJumpToUnread: () => void;
  getUnreadCount: (id: string) => number;

  virtualItems: MessageListItem[];
  room: Room | null;
  virtuosoRef: RefObject<VirtuosoHandle>;
  currentUser: string | null;

  isMultiSelectMode: boolean;
  selectedMessages: Set<string>;
  toggleMessageSelection: (id: string) => void;
  handleLongPress: (id: string) => void;

  addReaction: (msgId: string, emoji: string) => void;
  handleForwardMessage: (msg: Message) => void;
  setReplyingTo: (msg: Message) => void;
  handleDeleteMessage: (id: string) => void;
  startEditMessage: (msg: Message) => void;
  handlePinMessage: (id: string) => void;
  handleUnpinMessage: (id: string) => void;
  setShowUserProfile: (id: string) => void;
  handleViewMedia: (url: string) => void;

  vote: (pollId: string, optionId: string) => void;
  unvote: (pollId: string, optionId: string) => void;
  polls: Poll[];
  linkPreviews: Map<string, LinkPreview>;
  channelPermissions: ChannelPermissions;

  messages: Message[];
  isSavedMessages: boolean;
  lastSelectedId: string | null;
  handleSelectUntilHere: (id: string) => void;
  handleReport: (msg: Message) => void;

  isEncryptionModalOpen: boolean;
  setIsEncryptionModalOpen: (open: boolean) => void;
}

const BOTTOM_OFFSET_PX = 80;

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
  setIsEncryptionModalOpen,
}: MessageListProps) {
  const prevLastItemIdRef = useRef<string | null>(null);
  const didMountRef = useRef(false);

  const [isAtBottom, setIsAtBottom] = useState(true);

  const unreadCount = getUnreadCount(roomId);

  const lastItem = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1] : null;
  const lastItemId = lastItem?.id ?? null;

  const lastMessageIndex = useMemo(() => {
    for (let i = virtualItems.length - 1; i >= 0; i -= 1) {
      if (virtualItems[i].type === 'message' || virtualItems[i].type === 'uploading') {
        return i;
      }
    }
    return Math.max(virtualItems.length - 1, 0);
  }, [virtualItems]);

  const shouldShowFloatingJump = showJumpToUnread || !isAtBottom;

  const jumpButtonLabel = unreadCount > 0 ? `${unreadCount} новых` : 'К последним';

  // Reset state on room change
  useEffect(() => {
    prevLastItemIdRef.current = null;
    didMountRef.current = false;
    setIsAtBottom(true);
  }, [roomId]);

  // Auto-scroll logic
  useEffect(() => {
    if (!virtualItems.length) return;

    if (!didMountRef.current) {
      didMountRef.current = true;
      prevLastItemIdRef.current = lastItemId;

      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: lastMessageIndex,
          behavior: 'auto',
        });
      });

      return;
    }

    const prevLastItemId = prevLastItemIdRef.current;
    const appendedNewItem = prevLastItemId !== null && prevLastItemId !== lastItemId;

    if (appendedNewItem && isAtBottom) {
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: lastMessageIndex,
          behavior: 'smooth',
        });
      });
    }

    prevLastItemIdRef.current = lastItemId;
  }, [virtualItems, lastItemId, lastMessageIndex, isAtBottom, virtuosoRef]);

  const handleJumpToLatest = () => {
    handleJumpToUnread();
    virtuosoRef.current?.scrollToIndex({
      index: lastMessageIndex,
      behavior: 'smooth',
    });
  };

  return (
    <div className={listCss.root}>
      {loading && (
        <div className={listCss.loadingContainer}>
          <Spinner variant="Secondary" />
        </div>
      )}

      {shouldShowFloatingJump && virtualItems.length > 0 && (
        <button
          type="button"
          onClick={handleJumpToLatest}
          className={listCss.jumpButton}
          aria-label="Перейти к новым сообщениям"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={listCss.jumpButtonIcon}
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          <span>{jumpButtonLabel}</span>
        </button>
      )}

      <MasterPasswordModal
        isOpen={isEncryptionModalOpen}
        onClose={() => setIsEncryptionModalOpen(false)}
        onSuccess={() => {
          logger.info('UNLOCKED');
        }}
      />

      {virtualItems.length === 0 && !loading && (
        <div className={listCss.emptyState}>
          <div className={listCss.emptyStateIcon}>💬</div>

          <div className={listCss.emptyStateText}>
            <div className={listCss.emptyStateTitle}>Нет сообщений</div>
            <div className={listCss.emptyStateSubtitle}>
              {room?.type === 'channel'
                ? 'Здесь пока нет публикаций'
                : 'Напишите первое сообщение!'}
            </div>
          </div>
        </div>
      )}

      {virtualItems.length > 0 && (
        <Virtuoso
          key={roomId}
          ref={virtuosoRef}
          data={virtualItems}
          computeItemKey={(index, item) => item.id}
          style={{ height: '100%', width: '100%' }}
          initialTopMostItemIndex={lastMessageIndex}
          followOutput={false}
          atBottomThreshold={BOTTOM_OFFSET_PX}
          atBottomStateChange={(bottom) => setIsAtBottom(bottom)}
          itemContent={(index, item) => {
            if (item.type === 'date') {
              return (
                <div className={listCss.dateHeaderWrap}>
                  <div className={css.DateHeader}>
                    <span>{item.date}</span>
                  </div>
                </div>
              );
            }

            if (item.type === 'uploading') {
              return (
                <div className={`${css.MessageWrapper} ${css.MessageWrapperSelf} ${listCss.messageRow}`}>
                  <div className={`${css.MessageBubble} ${css.MessageBubbleSelf} ${listCss.uploadingBubble}`}>
                    <div className={listCss.uploadingContent}>
                      <Spinner variant="Secondary" />
                      <span className={listCss.uploadingText}>
                        {item.fileName} {item.progress !== undefined ? `(${item.progress}%)` : ''}
                        {item.isEncrypted && ' (зашифровано)'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            const msg = item.message;
            const isSelf = msg.user_id === currentUser;
            const isLayoutSelf = Boolean(isSelf && room?.type !== 'channel');

            return (
              <div
                className={listCss.messageRow}
                data-index={index}
                id={`msg-${msg.id}`}
              >
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
                  isSavedMessages={isSavedMessages}
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
