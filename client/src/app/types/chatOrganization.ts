// Chat Organization Types
// This file contains all TypeScript interfaces and types for chat organization features:
// Chat Folders, Pinned Chats, Archive, Mute Settings, Mentions, and Message Drafts

// ============================================================================
// Chat Folder Types
// ============================================================================

/**
 * Represents a user-defined folder for organizing chats
 */
export interface ChatFolder {
  id: string;
  user_id: string;
  name: string;
  icon?: string;
  color?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * Junction table entry mapping chats to folders (many-to-many relationship)
 */
export interface ChatFolderItem {
  id: string;
  folder_id: string;
  room_id: string;
  added_at: string;
}

// ============================================================================
// Pinned Chat Types
// ============================================================================

/**
 * Represents a pinned chat with its position in the pinned list
 */
export interface PinnedChat {
  id: string;
  user_id: string;
  room_id: string;
  order_index: number;
  pinned_at: string;
}

// ============================================================================
// Archive Types
// ============================================================================

/**
 * Represents an archived chat
 */
export interface ArchivedChat {
  id: string;
  user_id: string;
  room_id: string;
  archived_at: string;
}

// ============================================================================
// Mute Settings Types
// ============================================================================

/**
 * Represents notification mute settings for a specific chat
 */
export interface MuteSetting {
  id: string;
  user_id: string;
  room_id: string;
  muted_until?: string;
  is_indefinite: boolean;
  muted_at: string;
}

/**
 * Available mute duration options
 */
export type MuteDuration = '1h' | '8h' | '1d' | 'indefinite';

// ============================================================================
// Mention Types
// ============================================================================

/**
 * Represents a mention of a user in a message
 */
export interface Mention {
  id: string;
  message_id: string;
  room_id: string;
  mentioned_user_id: string;
  mentioned_by_user_id: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

/**
 * Represents a user item in the mention autocomplete dropdown
 */
export interface MentionAutocompleteItem {
  user_id: string;
  username: string;
  avatar_url?: string;
}

// ============================================================================
// Draft Types
// ============================================================================

/**
 * Represents an unsent message draft for a specific chat
 */
export interface MessageDraft {
  id: string;
  user_id: string;
  room_id: string;
  content: string;
  reply_to?: string;
  updated_at: string;
}

// ============================================================================
// Enhanced Room Type
// ============================================================================

/**
 * Extended Room interface with chat organization metadata
 * This extends the existing Room type from useSupabaseChat
 */
export interface EnhancedRoom {
  // Base room properties (from existing Room type)
  id: string;
  name: string;
  type: 'direct' | 'community';
  topic?: string;
  created_by?: string;
  created_at: string;
  is_direct?: boolean;
  target_user_id?: string;
  avatar_url?: string;
  member_count?: number;
  other_user?: {
    username: string;
    avatar_url: string | null;
  };
  
  // Organization metadata
  isPinned: boolean;
  pinOrder?: number;
  isArchived: boolean;
  isMuted: boolean;
  muteExpiry?: Date;
  unreadMentions: number;
  draft?: MessageDraft;
  folderIds: string[];
}
