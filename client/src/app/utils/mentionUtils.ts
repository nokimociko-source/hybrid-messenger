/**
 * Mention Detection Utility
 * 
 * Provides functions for detecting and extracting @username mentions from message content.
 * Used by the Mentions feature for autocomplete and mention tracking.
 */

// Regex pattern for detecting @username mentions
// Matches @followed by alphanumeric characters and underscores
const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g;

/**
 * Extract all unique usernames mentioned in a message
 * 
 * @param content - The message content to search for mentions
 * @returns Array of unique usernames (without the @ symbol)
 * 
 * @example
 * extractMentions("Hey @alice and @bob, check this out!")
 * // Returns: ["alice", "bob"]
 */
export function extractMentions(content: string): string[] {
  if (!content) return [];

  const matches = content.matchAll(MENTION_PATTERN);
  const usernames = new Set<string>();

  for (const match of matches) {
    if (match[1]) {
      usernames.add(match[1]);
    }
  }

  return Array.from(usernames);
}

/**
 * Check if a message contains any mentions
 * 
 * @param content - The message content to check
 * @returns true if the message contains at least one mention
 * 
 * @example
 * hasMentions("Hey @alice!")  // Returns: true
 * hasMentions("Hello world")  // Returns: false
 */
export function hasMentions(content: string): boolean {
  if (!content) return false;
  return MENTION_PATTERN.test(content);
}

/**
 * Check if a specific username is mentioned in the content
 * 
 * @param content - The message content to search
 * @param username - The username to look for (without @ symbol)
 * @returns true if the username is mentioned
 * 
 * @example
 * isMentioned("Hey @alice!", "alice")  // Returns: true
 * isMentioned("Hey @bob!", "alice")    // Returns: false
 */
export function isMentioned(content: string, username: string): boolean {
  if (!content || !username) return false;
  
  const mentions = extractMentions(content);
  return mentions.includes(username);
}

/**
 * Highlight mentions in message content by wrapping them in a span
 * 
 * @param content - The message content
 * @param className - Optional CSS class name for the mention span
 * @returns HTML string with mentions wrapped in spans
 * 
 * @example
 * highlightMentions("Hey @alice!", "mention-highlight")
 * // Returns: "Hey <span class=\"mention-highlight\">@alice</span>!"
 */
export function highlightMentions(content: string, className: string = 'mention'): string {
  if (!content) return content;

  return content.replace(
    MENTION_PATTERN,
    `<span class="${className}">$&</span>`
  );
}

/**
 * Get the position of the current mention being typed
 * Used for positioning the autocomplete dropdown
 * 
 * @param content - The message content
 * @param cursorPosition - Current cursor position in the text
 * @returns Object with mention start position and partial username, or null if not in a mention
 * 
 * @example
 * getCurrentMention("Hey @ali", 8)
 * // Returns: { start: 4, username: "ali" }
 */
export function getCurrentMention(
  content: string,
  cursorPosition: number
): { start: number; username: string } | null {
  if (!content || cursorPosition < 0) return null;

  // Find the last @ before cursor
  let atPosition = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (content[i] === '@') {
      atPosition = i;
      break;
    }
    // Stop if we hit a space or newline
    if (content[i] === ' ' || content[i] === '\n') {
      break;
    }
  }

  if (atPosition === -1) return null;

  // Extract the partial username after @
  const afterAt = content.substring(atPosition + 1, cursorPosition);
  
  // Check if it's a valid partial username (only alphanumeric and underscore)
  if (!/^[a-zA-Z0-9_]*$/.test(afterAt)) return null;

  return {
    start: atPosition,
    username: afterAt,
  };
}

/**
 * Replace the current mention with a completed username
 * Used when user selects from autocomplete
 * 
 * @param content - The message content
 * @param mentionStart - Start position of the @ symbol
 * @param cursorPosition - Current cursor position
 * @param username - The username to insert (without @ symbol)
 * @returns Object with new content and new cursor position
 * 
 * @example
 * replaceMention("Hey @ali", 4, 8, "alice")
 * // Returns: { content: "Hey @alice ", cursorPosition: 11 }
 */
export function replaceMention(
  content: string,
  mentionStart: number,
  cursorPosition: number,
  username: string
): { content: string; cursorPosition: number } {
  const before = content.substring(0, mentionStart);
  const after = content.substring(cursorPosition);
  
  // Add @ and username, plus a space after
  const newContent = `${before}@${username} ${after}`;
  const newCursorPosition = mentionStart + username.length + 2; // +2 for @ and space

  return {
    content: newContent,
    cursorPosition: newCursorPosition,
  };
}
