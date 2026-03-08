import { logger } from './logger';
/**
 * MessageParser - Parses and serializes sticker references in messages
 * 
 * Handles [sticker:pack_id:sticker_id] format parsing and validation
 * per Requirements 8.1, 8.2, 8.3, 8.5, 8.6
 */

import { supabase } from '../../supabaseClient';

export interface StickerReference {
  packId: string;
  stickerId: string;
  imageUrl?: string;
}

export interface MessageContent {
  type: 'text' | 'sticker' | 'emoji';
  value: string;
  stickerRef?: StickerReference;
}

export interface ParsedMessage {
  type: 'text' | 'sticker' | 'mixed';
  content: MessageContent[];
}

export class MessageParser {
  // Regex to match [sticker:pack_id:sticker_id] format
  private static readonly STICKER_REF_REGEX = /\[sticker:([a-zA-Z0-9-]+):([a-zA-Z0-9-]+)\]/g;

  /**
   * Parses message content and extracts sticker references
   * Supports mixed content with text and multiple stickers
   */
  static parse(content: string): ParsedMessage {
    const messageContent: MessageContent[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Reset regex state
    this.STICKER_REF_REGEX.lastIndex = 0;

    // Find all sticker references
    while ((match = this.STICKER_REF_REGEX.exec(content)) !== null) {
      // Add text before sticker if any
      if (match.index > lastIndex) {
        const textValue = content.substring(lastIndex, match.index);
        if (textValue.trim().length > 0) {
          messageContent.push({
            type: 'text',
            value: textValue,
          });
        }
      }

      // Add sticker reference
      messageContent.push({
        type: 'sticker',
        value: match[0],
        stickerRef: {
          packId: match[1],
          stickerId: match[2],
        },
      });

      lastIndex = this.STICKER_REF_REGEX.lastIndex;
    }

    // Add remaining text after last sticker
    if (lastIndex < content.length) {
      const textValue = content.substring(lastIndex);
      if (textValue.trim().length > 0) {
        messageContent.push({
          type: 'text',
          value: textValue,
        });
      }
    }

    // Determine message type
    let messageType: 'text' | 'sticker' | 'mixed';
    if (messageContent.length === 0) {
      messageType = 'text';
      messageContent.push({ type: 'text', value: content });
    } else if (messageContent.length === 1 && messageContent[0].type === 'sticker') {
      messageType = 'sticker';
    } else if (messageContent.every((c) => c.type === 'text')) {
      messageType = 'text';
    } else {
      messageType = 'mixed';
    }

    return {
      type: messageType,
      content: messageContent,
    };
  }

  /**
   * Serializes parsed message back to string format
   * Ensures idempotency: parse -> serialize -> parse produces equivalent result
   */
  static serialize(parsed: ParsedMessage): string {
    return parsed.content.map((item) => item.value).join('');
  }

  /**
   * Validates that a sticker reference exists in the database
   * Returns true if valid, false otherwise
   */
  static async validateStickerRef(ref: StickerReference): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('stickers')
        .select('id, image_url, pack_id')
        .eq('id', ref.stickerId)
        .eq('pack_id', ref.packId)
        .single();

      if (error || !data) {
        return false;
      }

      // Update imageUrl if available
      if (data.image_url) {
        ref.imageUrl = data.image_url;
      }

      return true;
    } catch (error) {
      logger.error('Error validating sticker reference:', error);
      return false;
    }
  }

  /**
   * Extracts all sticker references from message content
   * Returns array of StickerReference objects
   */
  static extractStickerRefs(content: string): StickerReference[] {
    const refs: StickerReference[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state
    this.STICKER_REF_REGEX.lastIndex = 0;

    while ((match = this.STICKER_REF_REGEX.exec(content)) !== null) {
      refs.push({
        packId: match[1],
        stickerId: match[2],
      });
    }

    return refs;
  }
}
