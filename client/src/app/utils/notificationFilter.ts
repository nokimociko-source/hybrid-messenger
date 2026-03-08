import { logger } from './logger';
/**
 * Notification Filter Utility
 * 
 * Provides functions for determining whether a notification should be sent
 * based on mute settings and mention detection.
 * 
 * Requirements: 5.7, 10.9
 */

import { supabase } from '../../supabaseClient';
import { isMentioned } from './mentionUtils';

/**
 * Check if a notification should be sent for a message
 * 
 * Rules:
 * - If chat is muted AND message doesn't mention the user: block notification
 * - If chat is muted BUT message mentions the user: allow notification (mentions bypass mute)
 * - If chat is not muted: allow notification
 * 
 * @param roomId - The room ID where the message was sent
 * @param messageContent - The content of the message
 * @param currentUserId - The current user's ID
 * @param currentUsername - The current user's username
 * @returns true if notification should be sent, false if it should be blocked
 */
export async function shouldSendNotification(
  roomId: string,
  messageContent: string,
  currentUserId: string,
  currentUsername: string
): Promise<boolean> {
  try {
    // Check if the chat is muted for this user
    const { data: muteSetting, error } = await supabase
      .from('mute_settings')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('room_id', roomId)
      .maybeSingle();

    if (error) {
      logger.error('Error checking mute status:', error);
      // On error, allow notification (fail open)
      return true;
    }

    // If no mute setting exists, allow notification
    if (!muteSetting) {
      return true;
    }

    // Check if mute is still active
    const isMuted = checkMuteActive(muteSetting);

    // If not muted, allow notification
    if (!isMuted) {
      return true;
    }

    // Chat is muted - check if message mentions the user
    // Mentions bypass mute settings (Requirement 10.9)
    const hasMention = isMentioned(messageContent, currentUsername);

    return hasMention;
  } catch (err) {
    logger.error('Error in shouldSendNotification:', err);
    // On error, allow notification (fail open)
    return true;
  }
}

/**
 * Check if a mute setting is currently active
 * 
 * @param muteSetting - The mute setting record
 * @returns true if the chat is currently muted
 */
function checkMuteActive(muteSetting: {
  is_indefinite: boolean;
  muted_until?: string | null;
}): boolean {
  // If indefinite, always muted
  if (muteSetting.is_indefinite) {
    return true;
  }

  // If has expiry, check if still valid
  if (muteSetting.muted_until) {
    const expiryDate = new Date(muteSetting.muted_until);
    const now = new Date();
    return now < expiryDate;
  }

  return false;
}
