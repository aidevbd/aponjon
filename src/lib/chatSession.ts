import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "aponjon_chat_session";
const SESSION_EXPIRY_HOURS = 24;
const SESSION_EVENT = "aponjon-chat-session-changed";

// Use sessionStorage so the chat session is scoped to the tab —
// closing the tab/browser invalidates the session (defence-in-depth for shared devices).
const sessionStore: Storage | null =
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
    ? window.sessionStorage
    : null;

export interface ChatSession {
  token: string;
  contactId: string;
  name: string;
  photoUrl: string | null;
  createdAt: number;
}

export function getChatSession(): ChatSession | null {
  if (!sessionStore) return null;
  try {
    // Migration: if an older localStorage session exists, drop it (no longer trusted).
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    const raw = sessionStore.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: ChatSession = JSON.parse(raw);
    const elapsed = Date.now() - session.createdAt;
    if (elapsed > SESSION_EXPIRY_HOURS * 60 * 60 * 1000) {
      sessionStore.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStore.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveChatSession(session: ChatSession) {
  if (!sessionStore) return;
  sessionStore.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearChatSession() {
  if (!sessionStore) return;
  sessionStore.removeItem(SESSION_KEY);
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export { SESSION_EVENT as CHAT_SESSION_CHANGED_EVENT };

export async function createChatSession(phone: string, secretCode: string): Promise<ChatSession | null> {
  const { data, error } = await supabase.rpc("create_chat_session", {
    p_phone: phone,
    p_secret_code: secretCode,
  });
  if (error) throw error;
  const result = data as any;
  if (!result?.success) {
    if (result?.error === "RATE_LIMITED") throw new Error("RATE_LIMITED");
    return null;
  }
  const session: ChatSession = {
    token: result.token,
    contactId: result.contact_id,
    name: result.name,
    photoUrl: result.photo_url || null,
    createdAt: Date.now(),
  };
  saveChatSession(session);
  return session;
}

export async function getChatContacts(token: string) {
  const { data, error } = await supabase.rpc("get_chat_contacts", { p_token: token });
  if (error) throw error;
  return (data || []) as { id: string; name: string; phone: string; photo_url: string | null }[];
}

export async function sendMessage(token: string, receiverId: string, content?: string, imageUrl?: string, replyToId?: string) {
  const { data, error } = await supabase.rpc("send_message", {
    p_token: token,
    p_receiver_id: receiverId,
    p_content: content || null,
    p_image_url: imageUrl || null,
    p_reply_to_id: replyToId || null,
  });
  if (error) throw error;
  return data as string;
}

export type ChatReaction = { emoji: string; reactor_id: string };
export type ChatMessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;

  edited_at: string | null;
  original_content: string | null;
  reply_to_id: string | null;
  reply_content: string | null;
  reply_sender_id: string | null;
  is_pinned: boolean;
  unsent_at: string | null;
  has_edit_history: boolean;
  reactions: ChatReaction[];
};

export async function getMessages(token: string, otherId: string) {
  const { data, error } = await supabase.rpc("get_messages", {
    p_token: token,
    p_other_id: otherId,
  });
  if (error) throw error;
  return (data || []) as unknown as ChatMessageRow[];
}

export async function reactToMessage(token: string, messageId: string, emoji: string) {
  const { error } = await supabase.rpc("react_to_message" as any, {
    p_token: token, p_message_id: messageId, p_emoji: emoji,
  });
  if (error) throw error;
}

export async function unsendMessage(token: string, messageId: string) {
  const { error } = await supabase.rpc("unsend_message" as any, {
    p_token: token, p_message_id: messageId,
  });
  if (error) throw error;
}

export async function removeMessageForMe(token: string, messageId: string) {
  const { error } = await supabase.rpc("remove_message_for_me" as any, {
    p_token: token, p_message_id: messageId,
  });
  if (error) throw error;
}

export async function getMessageEditHistory(token: string, messageId: string) {
  const { data, error } = await supabase.rpc("get_message_edit_history" as any, {
    p_token: token, p_message_id: messageId,
  });
  if (error) throw error;
  return (data || []) as { previous_content: string; edited_at: string }[];
}

export async function getUnreadCounts(token: string) {
  const { data, error } = await supabase.rpc("get_unread_counts", { p_token: token });
  if (error) throw error;
  return (data || []) as { sender_id: string; unread_count: number }[];
}

export async function deleteMessage(token: string, messageId: string) {
  const { data, error } = await supabase.rpc("delete_message", { p_token: token, p_message_id: messageId });
  if (error) throw error;
  return data as boolean;
}

export async function editMessage(token: string, messageId: string, newContent: string) {
  const { data, error } = await supabase.rpc("edit_message" as any, { p_token: token, p_message_id: messageId, p_new_content: newContent });
  if (error) throw error;
  return data as unknown as boolean;
}

export async function uploadChatImage(file: File, sessionToken?: string): Promise<string> {
  const compressed = await compressChatImage(file);
  const fileName = `chat/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  // Use fetch directly so we can attach the chat-session header that storage RLS validates
  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string;
  const anonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const headers: Record<string, string> = {
    "Content-Type": "image/webp",
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
  // Prefer authenticated admin session (required for storage RLS when no chat-session token exists)
  const { data: authData } = await supabase.auth.getSession();
  if (authData.session?.access_token) {
    headers["Authorization"] = `Bearer ${authData.session.access_token}`;
  }
  if (sessionToken) headers["x-chat-session"] = sessionToken;

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/chat-images/${encodeURIComponent(fileName)}`,
    { method: "POST", headers, body: compressed }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }

  // Bucket is private — store the object path; callers sign it before displaying.
  return fileName;
}

// Cache of signed URLs by path (valid ~1h; we refresh at 50min)
const _signedUrlCache = new Map<string, { url: string; exp: number }>();

export function extractChatImagePath(urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith("chat/")) return urlOrPath;
  const m = urlOrPath.match(/\/chat-images\/(.+?)(?:\?.*)?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function getSignedChatImageUrl(urlOrPath: string, sessionToken?: string): Promise<string | null> {
  try {
    const path = extractChatImagePath(urlOrPath);
    if (!path) return null;
    const cached = _signedUrlCache.get(path);
    if (cached && cached.exp > Date.now()) return cached.url;

    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string;
    const anonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    };
    // Prefer authenticated admin session; fall back to anon + optional chat-session header
    try {
      const { data: authData } = await supabase.auth.getSession();
      if (authData.session?.access_token) {
        headers["Authorization"] = `Bearer ${authData.session.access_token}`;
      }
    } catch { /* ignore — fall back to anon */ }
    if (sessionToken) headers["x-chat-session"] = sessionToken;

    const res = await fetch(`${supabaseUrl}/functions/v1/sign-chat-image`, {
      method: "POST",
      headers,
      body: JSON.stringify({ path }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (!json?.signedUrl) return null;
    _signedUrlCache.set(path, { url: json.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
    return json.signedUrl as string;
  } catch {
    // Network error or unexpected failure — degrade gracefully so message loading never fails
    return null;
  }
}


export async function signMessagesImages<T extends { image_url: string | null }>(
  messages: T[],
  sessionToken?: string,
): Promise<T[]> {
  const paths = new Set<string>();
  for (const m of messages) {
    const p = m.image_url ? extractChatImagePath(m.image_url) : null;
    if (p) paths.add(p);
  }
  const map = new Map<string, string>();
  await Promise.all(
    Array.from(paths).map(async (p) => {
      const url = await getSignedChatImageUrl(p, sessionToken);
      if (url) map.set(p, url);
    }),
  );
  return messages.map((m) => {
    if (!m.image_url) return m;
    const p = extractChatImagePath(m.image_url);
    if (!p) return m;
    const signed = map.get(p);
    return signed ? { ...m, image_url: signed } : m;
  });
}

function compressChatImage(file: File, maxWidth = 600, quality = 0.6): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/webp",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Load failed")); };
    img.src = url;
  });
}
