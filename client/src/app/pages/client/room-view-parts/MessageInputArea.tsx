import React, { RefObject } from 'react';
import { Icon, Icons } from 'folds';
import * as css from '../CatloverRoomView.css';
import { FormattingToolbar } from '../../../components/FormattingToolbar';
import { EmojiPicker } from '../../../components/EmojiPicker';
import { MentionAutocomplete } from '../../../components/MentionAutocomplete';
import { ChannelMessageInput } from '../../../components/ChannelMessageInput';

interface MessageInputAreaProps {
    roomId: string;
    replyingTo: any | null;
    setReplyingTo: (msg: any | null) => void;
    editingMessage: any | null;
    setEditingMessage: (msg: any | null) => void;
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    inputRef: RefObject<HTMLInputElement>;
    fileInputRef: RefObject<HTMLInputElement>;
    videoPreviewRef: RefObject<HTMLVideoElement>;
    isRecording: boolean;
    isCircleMode: boolean;
    recordingTime: number;
    showFormattingToolbar: boolean;
    setShowFormattingToolbar: (show: boolean) => void;
    showEmojiPicker: boolean;
    setShowEmojiPicker: (show: boolean) => void;
    showMentionAutocomplete: boolean;
    setShowMentionAutocomplete: (show: boolean) => void;
    mentionMembers: any[];
    mentionQuery: string;
    mentionPosition: any;
    isMobile: boolean;
    cancelRecording: () => void;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    setCursorPosition: (pos: number) => void;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFormat: (format: "bold" | "italic" | "code" | "strikethrough" | "link") => void;
    handleMentionSelect: (member: any) => void;
    handleActionButtonClick: () => void;
    toggleMode: () => void;
}

export function MessageInputArea({
    roomId,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    inputValue,
    setInputValue,
    inputRef,
    fileInputRef,
    videoPreviewRef,
    isRecording,
    isCircleMode,
    recordingTime,
    showFormattingToolbar,
    setShowFormattingToolbar,
    showEmojiPicker,
    setShowEmojiPicker,
    showMentionAutocomplete,
    setShowMentionAutocomplete,
    mentionMembers,
    mentionQuery,
    mentionPosition,
    isMobile,
    cancelRecording,
    handleInputChange,
    handleKeyDown,
    setCursorPosition,
    handleFileSelect,
    handleFormat,
    handleMentionSelect,
    handleActionButtonClick,
    toggleMode
}: MessageInputAreaProps) {
    const formatRecordingTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <ChannelMessageInput roomId={roomId}>
            <div className={css.InputAreaContainer}>
                {replyingTo && (
                    <div className={`${css.EditBar} glass-panel`} style={{ marginBottom: '8px', borderRadius: '12px', border: '1px solid rgba(0, 242, 255, 0.2)' }}>
                        <Icon size="200" src={Icons.ArrowLeft} style={{ color: '#00f2ff' }} />
                        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                            <div style={{ color: '#00f2ff', fontSize: '12px', fontWeight: 'bold' }}>
                                Ответ {replyingTo.users?.username || 'Неизвестно'}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {replyingTo.content || '📎 Медиа'}
                            </div>
                        </div>
                        <div onClick={() => setReplyingTo(null)} style={{ cursor: 'pointer', color: '#888' }}>
                            <Icon size="200" src={Icons.Cross} />
                        </div>
                    </div>
                )}

                {editingMessage && (
                    <div className={`${css.EditBar} glass-panel`} style={{ marginBottom: '8px', borderRadius: '12px', border: '1px solid rgba(0, 242, 255, 0.2)' }}>
                        <Icon size="200" src={Icons.Pencil} style={{ color: '#00f2ff' }} />
                        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                            <div style={{ color: '#00f2ff', fontSize: '12px', fontWeight: 'bold' }}>Редактирование</div>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {editingMessage.content}
                            </div>
                        </div>
                        <div onClick={() => { setEditingMessage(null); setInputValue(''); }} style={{ cursor: 'pointer', color: '#888' }}>
                            <Icon size="200" src={Icons.Cross} />
                        </div>
                    </div>
                )}

                {showFormattingToolbar && !isRecording && (
                    <FormattingToolbar onFormat={handleFormat} />
                )}

                <div className={`${css.FloatingInputPill} glass-input`}>
                    {!isRecording && !editingMessage && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={css.IconButton}
                            title="Прикрепить"
                        >
                            <Icon size={isMobile ? "100" : "200"} src={Icons.Attachment} />
                        </div>
                    )}

                    {!isRecording && !editingMessage && (
                        <div
                            onClick={() => setShowFormattingToolbar(!showFormattingToolbar)}
                            className={css.IconButton}
                            title="Форматирование"
                            style={{ color: showFormattingToolbar ? '#00f2ff' : undefined }}
                        >
                            <svg width={isMobile ? "16" : "20"} height={isMobile ? "16" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                            </svg>
                        </div>
                    )}

                    <input
                        id="room-file-input"
                        name="room-files"
                        type="file"
                        accept="*/*"
                        multiple
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                        aria-label="Прикрепить файлы"
                    />

                    {!isRecording && !editingMessage && (
                        <div
                            className={css.IconButton}
                            title="Смайлики"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowEmojiPicker(!showEmojiPicker);
                            }}
                            style={{ position: 'relative' }}
                        >
                            <Icon size={isMobile ? "100" : "200"} src={Icons.Smile} />

                            {showEmojiPicker && (
                                <EmojiPicker
                                    onSelect={(emoji) => setInputValue((prev: string) => prev + emoji)}
                                    onClose={() => setShowEmojiPicker(false)}
                                />
                            )}
                        </div>
                    )}

                    {isRecording ? (
                        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px' }}>
                            {isCircleMode && (
                                <video ref={videoPreviewRef} autoPlay muted playsInline style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ff3333' }} />
                            )}
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff3333', animation: 'pulse 1.5s infinite' }} />
                            <span style={{ color: '#ff3333', fontWeight: 'bold', fontSize: '14px' }}>{isCircleMode ? 'Видео...' : 'Голос...'} {formatRecordingTime(recordingTime)}</span>
                            <div style={{ flexGrow: 1 }} />
                            <div onClick={cancelRecording} style={{ cursor: 'pointer', color: '#888', fontSize: '13px' }}>Отмена</div>
                        </div>
                    ) : (
                        <input
                            id="room-message-input"
                            name="room-message"
                            type="text"
                            ref={inputRef}
                            placeholder="Написать сообщение..."
                            className={css.InputField}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart || 0)}
                            aria-label="Текст сообщения"
                        />
                    )}

                    {showMentionAutocomplete && mentionMembers.length > 0 && (
                        <MentionAutocomplete
                            roomId={roomId}
                            members={mentionMembers}
                            searchQuery={mentionQuery}
                            position={mentionPosition}
                            onSelect={handleMentionSelect}
                            onClose={() => setShowMentionAutocomplete(false)}
                        />
                    )}

                    <div className={css.SendButton} onClick={handleActionButtonClick} style={{ backgroundColor: isRecording ? '#ff3333' : undefined, color: isRecording ? '#fff' : undefined }}>
                        <Icon size={isMobile ? "100" : "200"} src={(inputValue.trim() || isRecording || editingMessage) ? Icons.Send : (isCircleMode ? Icons.VideoCamera : Icons.Mic)} />
                    </div>

                    {!isRecording && !editingMessage && (
                        <div onClick={toggleMode} className={css.IconButton} style={{ color: isCircleMode ? '#00f2ff' : undefined }} title={isCircleMode ? 'Голос' : 'Видео'}>
                            <Icon size={isMobile ? "100" : "200"} src={isCircleMode ? Icons.Mic : Icons.VideoCamera} />
                        </div>
                    )}
                </div>
            </div>
        </ChannelMessageInput>
    );
}
