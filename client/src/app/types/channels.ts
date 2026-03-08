// Type definitions for Broadcast Channels feature

export type ChannelPermissions = {
  canPost: boolean;
  canManageAdmins: boolean;
  canViewStats: boolean;
  canModifySettings: boolean;
};

export type MessageViewStats = {
  viewCount: number;
  viewers: Array<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    viewed_at: string;
  }>;
};

export type ChannelDiscoveryItem = {
  id: string;
  name: string;
  avatar_url?: string;
  topic?: string;
  subscriber_count: number;
  category?: string;
  is_subscribed: boolean;
};
