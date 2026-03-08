import { logger } from '../utils/logger';
/**
 * Example usage of ChannelMessageInput component
 * 
 * This file demonstrates how to integrate ChannelMessageInput
 * into a room view to control message input based on permissions.
 */

import React, { useState } from 'react';
import { Icon, Icons } from 'folds';
import { ChannelMessageInput } from './ChannelMessageInput';
import * as css from '../pages/client/CatloverRoomView.css';

/**
 * Example 1: Basic Usage
 * 
 * Wrap your existing message input UI with ChannelMessageInput.
 * The component will automatically show/hide based on permissions.
 */
export function BasicExample({ roomId }: { roomId: string }) {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    logger.info('Sending message:', inputValue);
    setInputValue('');
  };

  return (
    <div>
      <h2>Messages</h2>
      {/* Your messages list here */}
      
      {/* Wrap the input area with ChannelMessageInput */}
      <ChannelMessageInput roomId={roomId}>
        <div className={css.FloatingInputPill}>
          <input
            type="text"
            className={css.InputField}
            placeholder="Write a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className={css.SendButton} onClick={handleSend}>
            <Icon size="200" src={Icons.Send} />
          </div>
        </div>
      </ChannelMessageInput>
    </div>
  );
}

/**
 * Example 2: With Additional Features
 * 
 * Shows how to integrate ChannelMessageInput with other features
 * like file upload, emoji picker, etc.
 */
export function AdvancedExample({ roomId }: { roomId: string }) {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    logger.info('Sending message:', inputValue);
    setInputValue('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      logger.info('Selected files:', files);
    }
  };

  return (
    <div>
      <h2>Messages</h2>
      {/* Your messages list here */}
      
      {/* The entire input area is wrapped */}
      <ChannelMessageInput roomId={roomId}>
        <div className={css.InputAreaContainer}>
          <div className={css.FloatingInputPill}>
            {/* File upload button */}
            <div className={css.IconButton}>
              <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                <Icon size="200" src={Icons.Attachment} />
              </label>
              <input
                id="file-input"
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            {/* Emoji picker button */}
            <div
              className={css.IconButton}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Icon size="200" src={Icons.Smile} />
            </div>

            {/* Text input */}
            <input
              type="text"
              className={css.InputField}
              placeholder="Write a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Send button */}
            <div className={css.SendButton} onClick={handleSend}>
              <Icon size="200" src={Icons.Send} />
            </div>
          </div>
        </div>
      </ChannelMessageInput>
    </div>
  );
}

/**
 * Example 3: With Edit/Reply Context
 * 
 * Shows how to handle editing and replying while using ChannelMessageInput
 */
export function EditReplyExample({ roomId }: { roomId: string }) {
  const [inputValue, setInputValue] = useState('');
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string } | null>(null);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    if (editingMessage) {
      logger.info('Updating message:', editingMessage.id, inputValue);
      setEditingMessage(null);
    } else if (replyingTo) {
      logger.info('Replying to:', replyingTo.id, inputValue);
      setReplyingTo(null);
    } else {
      logger.info('Sending message:', inputValue);
    }
    
    setInputValue('');
  };

  return (
    <div>
      <h2>Messages</h2>
      {/* Your messages list here */}
      
      <ChannelMessageInput roomId={roomId}>
        <div className={css.InputAreaContainer}>
          {/* Edit bar */}
          {editingMessage && (
            <div className={css.EditBar}>
              <Icon size="200" src={Icons.Pencil} style={{ color: '#00f2ff' }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ color: '#00f2ff', fontSize: '12px', fontWeight: 'bold' }}>
                  Editing
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                  {editingMessage.content}
                </div>
              </div>
              <div
                onClick={() => {
                  setEditingMessage(null);
                  setInputValue('');
                }}
                style={{ cursor: 'pointer', color: '#888' }}
              >
                <Icon size="200" src={Icons.Cross} />
              </div>
            </div>
          )}

          {/* Reply bar */}
          {replyingTo && (
            <div className={css.EditBar}>
              <Icon size="200" src={Icons.ArrowLeft} style={{ color: '#00f2ff' }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ color: '#00f2ff', fontSize: '12px', fontWeight: 'bold' }}>
                  Reply
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                  {replyingTo.content}
                </div>
              </div>
              <div
                onClick={() => setReplyingTo(null)}
                style={{ cursor: 'pointer', color: '#888' }}
              >
                <Icon size="200" src={Icons.Cross} />
              </div>
            </div>
          )}

          {/* Input area */}
          <div className={css.FloatingInputPill}>
            <input
              type="text"
              className={css.InputField}
              placeholder="Write a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                } else if (e.key === 'Escape') {
                  setEditingMessage(null);
                  setReplyingTo(null);
                  setInputValue('');
                }
              }}
            />
            <div className={css.SendButton} onClick={handleSend}>
              <Icon size="200" src={Icons.Send} />
            </div>
          </div>
        </div>
      </ChannelMessageInput>
    </div>
  );
}

/**
 * Example 4: Standalone Disabled State Preview
 * 
 * Shows what the disabled state looks like (for testing/preview purposes)
 */
export function DisabledStatePreview() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#0a0a0a' }}>
      <h2 style={{ color: '#fff', marginBottom: '20px' }}>
        Disabled State Preview
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
        This is what non-admin users see in broadcast channels:
      </p>
      
      {/* Manually render the disabled state for preview */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 24px',
        margin: '0 auto',
        maxWidth: '1100px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 24px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '800px',
        }}>
          <Icon 
            size="200" 
            src={Icons.Lock}
            style={{ color: 'rgba(255, 255, 255, 0.4)' }}
          />
          <span style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px',
            fontWeight: '500',
          }}>
            Only admins can post in this channel
          </span>
        </div>
      </div>
    </div>
  );
}
