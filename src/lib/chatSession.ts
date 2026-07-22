import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "aponjon_chat_session";
const SESSION_EVENT = "aponjon-chat-session-changed";

/**
 * Storage strategy:
 * - Trusted device: localStorage (persists across tab/browser close, up to 30 days server-side)
 * - Untrusted device: sessionStorage (tab-scoped; server-side max 24h)
 *
 * We read from BOTH on load so switching "remember me" doesn't leave a stale copy.
 */
const localStore: Storage | null =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? window.localStorage
    : null;
const tabStore: Storage | null =
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
    ? window.sessionStorage
    : null;

export interface ChatSession {
  token: string;
  contactId: string;
  name: string;
  photoUrl: string | null;
  createdAt: number;
  /** Server-side expiry (ms). Client uses for warnings only; server enforces. */
  expiresAt: number;
  /** true = localStorage + 30d; false = sessionStorage + 24h */
  trusted: boolean;
}

function readFromStore(store: Storage | null): ChatSession | null {
  if (!store) return null;
  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: ChatSession = JSON.parse(raw);
    if (s.expiresAt && s.expiresAt < Date.now()) {
      store.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    store.removeItem(SESSION_KEY);
    return null;
  }
}

export function getChatSession(): ChatSession | null {
  return readFromStore(localStore) ?? readFromStore(tabStore);
}

export function saveChatSession(session: ChatSession) {
  const target = session.trusted ? localStore : tabStore;
  const other = session.trusted ? tabStore : localStore;
  try { other?.removeItem(SESSION_KEY); } catch { /* ignore */ }
  target?.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearChatSession() {
  try { localStore?.removeItem(SESSION_KEY); } catch { /* ignore */ }
  try { tabStore?.removeItem(SESSION_KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export { SESSION_EVENT as CHAT_SESSION_CHANGED_EVENT };

export type DeviceKind = "mobile" | "tablet" | "desktop";

export interface DeviceInfo {
  kind: DeviceKind;
  os: string;   // "Android", "iOS", "iPadOS", "Windows", "macOS", "Linux", "ChromeOS", ""
  browser: string; // "Chrome", "Edge", "Opera", "Firefox", "Safari", "Samsung Internet", "Browser"
  label: string;   // e.g. "Chrome · Android মোবাইল"
}

/** Detects device kind, OS, and browser from the UA string. */
export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === "undefined") {
    return { kind: "desktop", os: "", browser: "Browser", label: "Unknown" };
  }
  const ua = navigator.userAgent;
  const uaData = (navigator as any).userAgentData;

  // Browser (order matters — Edg/OPR/Samsung must come before Chrome; Chrome before Safari)
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\/|Opera\//.test(ua) ? "Opera" :
    /SamsungBrowser\//.test(ua) ? "Samsung Internet" :
    /FxiOS\//.test(ua) ? "Firefox" :
    /CriOS\//.test(ua) ? "Chrome" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Browser";

  // OS — iPadOS 13+ reports as Mac; disambiguate via touch points
  const isIpadOS =
    /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  const os =
    /Android/.test(ua) ? "Android" :
    /iPad/.test(ua) || isIpadOS ? "iPadOS" :
    /iPhone|iPod/.test(ua) ? "iOS" :
    /CrOS/.test(ua) ? "ChromeOS" :
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" : "";

  // Device kind — trust UA-Client-Hints when present, else fall back to UA heuristics
  let kind: DeviceKind = "desktop";
  if (uaData?.mobile === true) kind = "mobile";
  else if (os === "iPadOS" || /Tablet/i.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) kind = "tablet";
  else if (os === "Android" || os === "iOS" || /Mobi|Mobile|Phone/i.test(ua)) kind = "mobile";

  const kindBn = kind === "mobile" ? "মোবাইল" : kind === "tablet" ? "ট্যাবলেট" : "ডেস্কটপ";
  const label = os ? `${browser} · ${os} ${kindBn}` : `${browser} · ${kindBn}`;
  return { kind, os, browser, label };
}

/** Backwards-compat short label used when creating a session. */
export function getDeviceLabel(): string {
  return getDeviceInfo().label;
}


export async function createChatSession(
  phone: string,
  secretCode: string,
  trusted: boolean = false,
): Promise<ChatSession | null> {
  const { data, error } = await supabase.rpc("create_chat_session", {
    p_phone: phone,
    p_secret_code: secretCode,
    p_trusted: trusted,
    p_device_label: getDeviceLabel(),
  } as any);
  if (error) throw error;
  const result = data as any;
  if (!result?.success) {
    if (result?.error === "RATE_LIMITED") throw new Error("RATE_LIMITED");
    return null;
  }
  const expiresAt = result.expires_at
    ? new Date(result.expires_at).getTime()
    : Date.now() + (trusted ? 30 * 24 : 24) * 60 * 60 * 1000;
  const session: ChatSession = {
    token: result.token,
    contactId: result.contact_id,
    name: result.name,
    photoUrl: result.photo_url || null,
    createdAt: Date.now(),
    expiresAt,
    trusted: !!result.trusted,
  };
  saveChatSession(session);
  return session;
}

/** Sliding refresh — call periodically while user is active. Returns new expiry, or null if session invalid. */
export async function touchChatSession(token: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("touch_chat_session" as any, { p_token: token });
  if (error) return null;
  const r = data as any;
  if (!r?.valid) return null;
  const exp = r.expires_at ? new Date(r.expires_at).getTime() : null;
  if (exp) {
    const cur = getChatSession();
    if (cur && cur.token === token && cur.expiresAt !== exp) {
      saveChatSession({ ...cur, expiresAt: exp });
    }
  }
  return exp;
}

/** Promote the current session's device to trusted (30 days). Returns new expiry ms or null. */
export async function trustCurrentChatSession(token: string, deviceLabel?: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("trust_current_chat_session" as any, {
    p_token: token,
    p_device_label: deviceLabel ?? null,
  });
  if (error) return null;
  const r = data as any;
  if (!r?.valid) return null;
  const exp = r.expires_at ? new Date(r.expires_at).getTime() : null;
  const cur = getChatSession();
  if (cur && cur.token === token) {
    saveChatSession({ ...cur, trusted: true, expiresAt: exp ?? cur.expiresAt });
  }
  return exp;
}

export type ActiveChatSession = {
  id: string;
  device_label: string | null;
  trusted_device: boolean;
  is_current: boolean;
  created_at: string;
  last_used_at: string;
  expires_at: string;
};

export async function listChatSessions(token: string): Promise<ActiveChatSession[]> {
  const { data, error } = await supabase.rpc("list_my_chat_sessions" as any, { p_token: token });
  if (error) throw error;
  return (data || []) as ActiveChatSession[];
}

export async function revokeChatSession(token: string, sessionId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("revoke_chat_session" as any, {
    p_token: token, p_session_id: sessionId,
  });
  if (error) throw error;
  return !!data;
}

export async function revokeAllOtherChatSessions(token: string): Promise<number> {
  const { data, error } = await supabase.rpc("revoke_all_other_chat_sessions" as any, { p_token: token });
  if (error) throw error;
  return Number(data) || 0;
}

export async function revokeAllChatSessions(token: string): Promise<number> {
  const { data, error } = await supabase.rpc("revoke_all_chat_sessions" as any, { p_token: token });
  if (error) throw error;
  return Number(data) || 0;
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
