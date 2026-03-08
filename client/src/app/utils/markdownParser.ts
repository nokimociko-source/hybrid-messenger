/**
 * Markdown Parser - Parses Telegram-style markdown formatting
 * 
 * Supports:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `code`
 * - ```code blocks```
 * - ~~strikethrough~~
 * - [links](url)
 * - @mentions
 */

export interface FormattedSegment {
  type: 'text' | 'bold' | 'italic' | 'code' | 'code_block' | 'strikethrough' | 'link' | 'mention';
  content: string;
  url?: string; // For links
  language?: string; // For code blocks
}

export class MarkdownParser {
  /**
   * Parse markdown text into formatted segments
   */
  static parse(text: string): FormattedSegment[] {
    const segments: FormattedSegment[] = [];
    let currentIndex = 0;

    // Regex patterns (ordered by priority)
    const patterns = [
      // Code blocks (highest priority)
      { regex: /```(\w+)?\n([\s\S]*?)```/g, type: 'code_block' as const },
      // Inline code
      { regex: /`([^`]+)`/g, type: 'code' as const },
      // Bold (** or __)
      { regex: /\*\*([^*]+)\*\*|__([^_]+)__/g, type: 'bold' as const },
      // Italic (* or _)
      { regex: /\*([^*]+)\*|_([^_]+)_/g, type: 'italic' as const },
      // Strikethrough
      { regex: /~~([^~]+)~~/g, type: 'strikethrough' as const },
      // Links
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' as const },
      // Mentions
      { regex: /@(\w+)/g, type: 'mention' as const },
    ];

    // Find all matches
    const matches: Array<{
      index: number;
      length: number;
      type: FormattedSegment['type'];
      content: string;
      url?: string;
      language?: string;
    }> = [];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const fullMatch = match[0];
        const content = match[1] || match[2] || '';
        
        // Check if this match overlaps with existing matches
        const overlaps = matches.some(
          (m) =>
            (match!.index >= m.index && match!.index < m.index + m.length) ||
            (match!.index + fullMatch.length > m.index &&
              match!.index + fullMatch.length <= m.index + m.length)
        );

        if (!overlaps) {
          const matchData: any = {
            index: match.index,
            length: fullMatch.length,
            type: pattern.type,
            content: content,
          };

          // Special handling for code blocks (capture language)
          if (pattern.type === 'code_block') {
            matchData.language = match[1] || 'text';
            matchData.content = match[2] || '';
          }

          // Special handling for links (capture URL)
          if (pattern.type === 'link') {
            matchData.url = match[2];
          }

          matches.push(matchData);
        }
      }
    }

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Build segments
    for (const match of matches) {
      // Add plain text before this match
      if (match.index > currentIndex) {
        const plainText = text.substring(currentIndex, match.index);
        if (plainText) {
          segments.push({ type: 'text', content: plainText });
        }
      }

      // Add formatted segment
      segments.push({
        type: match.type,
        content: match.content,
        url: match.url,
        language: match.language,
      });

      currentIndex = match.index + match.length;
    }

    // Add remaining plain text
    if (currentIndex < text.length) {
      const plainText = text.substring(currentIndex);
      if (plainText) {
        segments.push({ type: 'text', content: plainText });
      }
    }

    // If no formatting found, return as plain text
    if (segments.length === 0) {
      segments.push({ type: 'text', content: text });
    }

    return segments;
  }

  /**
   * Sanitize URL to prevent XSS
   */
  private static sanitizeURL(url: string): string {
    if (!url) return '';
    
    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerURL = url.toLowerCase().trim();
    
    for (const protocol of dangerousProtocols) {
      if (lowerURL.startsWith(protocol)) {
        return '#';
      }
    }
    
    // Only allow http, https, mailto
    if (!lowerURL.startsWith('http://') && 
        !lowerURL.startsWith('https://') && 
        !lowerURL.startsWith('mailto:')) {
      return '#';
    }
    
    return this.escapeHTML(url);
  }

  /**
   * Render formatted segments to React-compatible HTML
   */
  static toHTML(segments: FormattedSegment[]): string {
    return segments
      .map((segment) => {
        switch (segment.type) {
          case 'bold':
            return `<strong>${this.escapeHTML(segment.content)}</strong>`;
          case 'italic':
            return `<em>${this.escapeHTML(segment.content)}</em>`;
          case 'code':
            return `<code class="inline-code">${this.escapeHTML(segment.content)}</code>`;
          case 'code_block':
            return `<pre><code class="code-block language-${this.escapeHTML(segment.language || 'text')}">${this.escapeHTML(
              segment.content
            )}</code></pre>`;
          case 'strikethrough':
            return `<del>${this.escapeHTML(segment.content)}</del>`;
          case 'link':
            return `<a href="${this.sanitizeURL(segment.url || '')}" target="_blank" rel="noopener noreferrer">${this.escapeHTML(
              segment.content
            )}</a>`;
          case 'mention':
            return `<span class="mention">@${this.escapeHTML(segment.content)}</span>`;
          default:
            return this.escapeHTML(segment.content);
        }
      })
      .join('');
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check if text contains any markdown formatting
   */
  static hasFormatting(text: string): boolean {
    const patterns = [
      /\*\*[^*]+\*\*/,
      /__[^_]+__/,
      /\*[^*]+\*/,
      /_[^_]+_/,
      /`[^`]+`/,
      /```[\s\S]+```/,
      /~~[^~]+~~/,
      /\[[^\]]+\]\([^)]+\)/,
    ];

    return patterns.some((pattern) => pattern.test(text));
  }
}
