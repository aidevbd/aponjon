export type AdminChatUser = {
  id: string;
  name: string;
  phone: string;
  photo_url: string | null;
  last_message_at: string | null;
};

export type AdminChatMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  deleted_by_sender?: boolean;
  edited_at?: string | null;
  original_content?: string | null;
  reply_to_id?: string | null;
  reply_content?: string | null;
  reply_sender_id?: string | null;
  is_pinned?: boolean;
  unsent_at?: string | null;
  has_edit_history?: boolean;
  reactions?: { emoji: string; reactor_id: string }[];
};

export type PresenceEntry = { lastSeen: string; isOnline: boolean };
export type PresenceMap = Record<string, PresenceEntry>;
