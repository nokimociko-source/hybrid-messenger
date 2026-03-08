export type AdminTab = 'users' | 'rooms' | 'messages' | 'logs' | 'reports' | 'danger';

export interface AdminUser {
    id: string;
    username: string;
    avatar_url: string | null;
    status: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
    user_presence?: {
        status: string;
        updated_at: string;
        last_seen: string;
    }[];
}

export interface AdminRoom {
    id: string;
    name: string;
    type: string;
    created_at: string;
    member_count?: number;
}

export interface AdminMessage {
    id: string;
    content: string;
    room_id: string;
    sender_id: string;
    created_at: string;
    sender?: { username: string };
}

export interface AdminReport {
    id: string;
    reporter_id: string;
    target_id: string;
    target_type: string;
    reason: string;
    description: string;
    status: string;
    created_at: string;
    reporter?: { username: string };
}
