import type { Message, Room } from '../../../hooks/supabaseHelpers';
import type { Poll } from '../../../hooks/usePolls';
import type { ChannelPermissions } from '../../../types/channels';
import type { LinkPreview } from '../../../types/mediaEnhancements';

export type { Message, Room, Poll, ChannelPermissions, LinkPreview };

export type MessageListItem =
  | {
      type: 'date';
      id: string;
      date: string;
    }
  | {
      type: 'uploading';
      id: string;
      fileName: string;
      progress?: number;
      isEncrypted?: boolean;
    }
  | {
      type: 'message';
      id: string;
      message: Message;
    };
