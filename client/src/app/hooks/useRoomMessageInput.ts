import { useState, useRef, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import { Message } from './supabaseHelpers';
import { getCurrentMention, replaceMention } from '../utils/mentionUtils';

interface UseRoomMessageInputProps {
    roomId: string | undefined;
    sendMessage: (content: string, mediaUrl?: string, replyTo?: string, options?: any) => Promise<any>;
    updateMessage: (id: string, content: string) => Promise<any>;
    uploadMedia: (file: File, onProgress?: (percent: number) => void) => Promise<string | null>;
    insertMessages: (messages: any) => Promise<any>;
    currentUser: string | null;
    startTyping: () => void;
    stopTyping: () => void;
    getDraft: (roomId: string) => any;
    saveDraft: (roomId: string, content: string, replyTo?: string) => void;
    deleteDraft: (roomId: string) => void;
    getRoomMembers: (roomId: string) => Promise<any[]>;
}

export function useRoomMessageInput({
    roomId,
    sendMessage,
    updateMessage,
    uploadMedia,
    insertMessages,
    currentUser,
    startTyping,
    stopTyping,
    getDraft,
    saveDraft,
    deleteDraft,
    getRoomMembers
}: UseRoomMessageInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isCircleMode, setIsCircleMode] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
    const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
    const [mentionMembers, setMentionMembers] = useState<any[]>([]);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });

    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputValueRef = useRef('');

    // Load draft when room changes
    useEffect(() => {
        if (roomId && !editingMessage) {
            const draft = getDraft(roomId);
            if (draft) {
                setInputValue(draft.content);
                inputValueRef.current = draft.content;
                if (draft.replyTo) {
                    // Note: We might need to fetch the full message object for replyingTo if only ID is saved
                    // For now, we'll let the parent handle the full object or just use ID if possible
                }
            } else {
                setInputValue('');
                inputValueRef.current = '';
            }
        }
    }, [roomId, getDraft, editingMessage]);

    // Save draft when leaving room
    useEffect(() => {
        const currentRoomId = roomId;
        const currentReplyingToId = replyingTo?.id;
        return () => {
            if (currentRoomId && inputValueRef.current.trim()) {
                saveDraft(currentRoomId, inputValueRef.current, currentReplyingToId);
            }
        };
    }, [roomId, replyingTo, saveDraft]);

    // Recording logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: isCircleMode
            });

            if (isCircleMode && videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: isCircleMode ? 'video/webm' : 'audio/webm'
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: isCircleMode ? 'video/webm' : 'audio/webm' });
                const prefix = isCircleMode ? 'video_circle_' : 'voice_';
                const fileName = `${prefix}${Date.now()}.webm`;
                const file = new File([blob], fileName, { type: isCircleMode ? 'video/webm' : 'audio/webm' });

                setIsUploading(true);
                const url = await uploadMedia(file);
                if (url) {
                    await sendMessage('', url, undefined, {
                        file_type: file.type,
                        file_size: file.size,
                        file_name: file.name
                    });
                }
                setIsUploading(false);

                stream.getTracks().forEach(track => track.stop());
                if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            logger.error('Recording failed:', err);
            // Error handling should be managed by parent (modals)
            throw err;
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            const stream = mediaRecorderRef.current.stream;
            mediaRecorderRef.current.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleSendText = async () => {
        if (!inputValue.trim()) return;
        const text = inputValue.trim();
        setInputValue('');
        inputValueRef.current = '';

        if (draftTimeoutRef.current) {
            clearTimeout(draftTimeoutRef.current);
            draftTimeoutRef.current = null;
        }

        if (roomId) {
            await deleteDraft(roomId);
        }

        stopTyping();

        if (editingMessage) {
            await updateMessage(editingMessage.id, text);
            setEditingMessage(null);
        } else {
            await sendMessage(text, undefined, replyingTo?.id);
            setReplyingTo(null);
        }
    };

    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const newCursorPosition = e.target.selectionStart || 0;

        setInputValue(newValue);
        inputValueRef.current = newValue;
        setCursorPosition(newCursorPosition);

        if (roomId) {
            const currentMention = getCurrentMention(newValue, newCursorPosition);

            if (currentMention) {
                setMentionQuery(currentMention.username);
                try {
                    const members = await getRoomMembers(roomId);
                    const filteredMembers = members.filter(member =>
                        member.username.toLowerCase().includes(currentMention.username.toLowerCase())
                    );
                    setMentionMembers(filteredMembers);

                    if (inputRef.current) {
                        const rect = inputRef.current.getBoundingClientRect();
                        setMentionPosition({
                            top: rect.top + window.scrollY - 200,
                            left: rect.left
                        });
                    }
                    setShowMentionAutocomplete(true);
                } catch (error) {
                    logger.error('Error fetching room members:', error);
                }
            } else {
                setShowMentionAutocomplete(false);
            }

            if (draftTimeoutRef.current) {
                clearTimeout(draftTimeoutRef.current);
            }

            if (newValue.trim()) {
                draftTimeoutRef.current = setTimeout(() => {
                    if (inputValueRef.current.trim() && roomId) {
                        saveDraft(roomId, inputValueRef.current, replyingTo?.id);
                    }
                }, 500);
            } else {
                deleteDraft(roomId);
            }
        }

        if (newValue.trim()) {
            startTyping();
        } else {
            stopTyping();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showMentionAutocomplete) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape') {
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            stopTyping();
            handleSendText();
        } else if (e.key === 'Escape' && (editingMessage || replyingTo)) {
            setEditingMessage(null);
            setReplyingTo(null);
            setInputValue('');
            inputValueRef.current = '';
            stopTyping();
        }
    };

    const handleMentionSelect = (username: string) => {
        if (!roomId) return;

        const currentMention = getCurrentMention(inputValue, cursorPosition);
        if (currentMention) {
            const result = replaceMention(inputValue, currentMention.start, cursorPosition, username);
            setInputValue(result.content);
            inputValueRef.current = result.content;
            setCursorPosition(result.cursorPosition);

            if (inputRef.current) {
                inputRef.current.focus();
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.setSelectionRange(result.cursorPosition, result.cursorPosition);
                    }
                }, 0);
            }
        }
        setShowMentionAutocomplete(false);
    };

    const handleFormat = (type: 'bold' | 'italic' | 'code' | 'strikethrough' | 'link', onPrompt?: (config: any) => void) => {
        if (!inputRef.current) return;

        const start = inputRef.current.selectionStart || 0;
        const end = inputRef.current.selectionEnd || 0;
        const selectedText = inputValue.substring(start, end);

        let formattedText = '';
        let cursorOffset = 0;

        if (type === 'link') {
            if (onPrompt) {
                onPrompt({
                    type: 'prompt',
                    title: 'Вставить ссылку',
                    message: 'Введите URL для выбранного текста:',
                    confirmLabel: 'Вставить',
                    cancelLabel: 'Отмена',
                    placeholder: 'https://...',
                    onConfirm: (url: string) => {
                        if (url) {
                            const ft = `[${selectedText || 'ссылка'}](${url})`;
                            const nv = inputValue.substring(0, start) + ft + inputValue.substring(end);
                            setInputValue(nv);
                            inputValueRef.current = nv;
                            setTimeout(() => {
                                if (inputRef.current) {
                                    const np = start + ft.length;
                                    inputRef.current.focus();
                                    inputRef.current.setSelectionRange(np, np);
                                }
                            }, 0);
                        }
                    }
                });
            }
            return;
        }

        switch (type) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                cursorOffset = selectedText ? 0 : 2;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                cursorOffset = selectedText ? 0 : 1;
                break;
            case 'code':
                formattedText = `\`${selectedText}\``;
                cursorOffset = selectedText ? 0 : 1;
                break;
            case 'strikethrough':
                formattedText = `~~${selectedText}~~`;
                cursorOffset = selectedText ? 0 : 2;
                break;
        }

        const newValue = inputValue.substring(0, start) + formattedText + inputValue.substring(end);
        setInputValue(newValue);
        inputValueRef.current = newValue;

        setTimeout(() => {
            if (inputRef.current) {
                const newPosition = selectedText ? start + formattedText.length : start + cursorOffset;
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newPosition, newPosition);
            }
        }, 0);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const mediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
        const shouldCreateAlbum = mediaFiles.length >= 2 && mediaFiles.length <= 10;

        setIsUploading(true);
        try {
            if (shouldCreateAlbum) {
                const groupId = `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const albumMessages = await Promise.all(
                    mediaFiles.map(async (file, index) => {
                        const url = await uploadMedia(file, (p) => {
                            if (index === 0) setUploadProgress(p);
                        });
                        if (!url) throw new Error('Upload failed');

                        let width: number | undefined;
                        let height: number | undefined;

                        if (file.type.startsWith('image/')) {
                            try {
                                const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                                    const image = new Image();
                                    image.onload = () => resolve(image);
                                    image.onerror = reject;
                                    image.src = URL.createObjectURL(file);
                                });
                                width = img.naturalWidth;
                                height = img.naturalHeight;
                                URL.revokeObjectURL(img.src);
                            } catch (err) {
                                logger.warn('Failed to get image dimensions:', err);
                            }
                        }

                        return {
                            room_id: roomId,
                            user_id: currentUser,
                            content: '',
                            media_url: url,
                            media_group_id: groupId,
                            media_order: index,
                            file_type: file.type,
                            file_size: file.size,
                            original_width: width,
                            original_height: height,
                        };
                    })
                );
                await insertMessages(albumMessages);

                const nonMediaFiles = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
                for (const file of nonMediaFiles) {
                    const url = await uploadMedia(file, (p) => setUploadProgress(p));
                    if (url) {
                        const isDocument = !file.type.match(/^(image|video|audio)\//);
                        if (isDocument) {
                            await insertMessages({
                                content: '',
                                media_url: url,
                                file_name: file.name,
                                file_size: file.size,
                                file_type: file.type || 'application/octet-stream'
                            });
                        } else {
                            await sendMessage('', url, undefined, {
                                file_type: file.type,
                                file_size: file.size,
                                file_name: file.name
                            });
                        }
                    }
                }
            } else {
                for (const file of files) {
                    const url = await uploadMedia(file, (percent) => setUploadProgress(percent));
                    if (url) {
                        const isDocument = !file.type.match(/^(image|video|audio)\//);
                        if (isDocument) {
                            await insertMessages({
                                content: '',
                                media_url: url,
                                file_name: file.name,
                                file_size: file.size,
                                file_type: file.type || 'application/octet-stream'
                            });
                        } else {
                            await sendMessage('', url, undefined, {
                                file_type: file.type,
                                file_size: file.size,
                                file_name: file.name
                            });
                        }
                    }
                }
            }
        } catch (err) {
            logger.error('Upload failed:', err);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleActionButtonClick = () => {
        if (inputValue.trim()) {
            handleSendText();
        } else if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const toggleMode = () => setIsCircleMode(!isCircleMode);

    return {
        inputValue,
        setInputValue,
        cursorPosition,
        setCursorPosition,
        editingMessage,
        setEditingMessage,
        replyingTo,
        setReplyingTo,
        isRecording,
        recordingTime,
        isCircleMode,
        isUploading,
        uploadProgress,
        showEmojiPicker,
        setShowEmojiPicker,
        showFormattingToolbar,
        setShowFormattingToolbar,
        showMentionAutocomplete,
        setShowMentionAutocomplete,
        mentionMembers,
        mentionQuery,
        mentionPosition,
        inputRef,
        fileInputRef,
        videoPreviewRef,
        handleSendText,
        handleInputChange,
        handleKeyDown,
        handleFormat,
        handleFileSelect,
        handleMentionSelect,
        handleActionButtonClick,
        toggleMode,
        cancelRecording,
        startRecording,
        stopRecording
    };
}
