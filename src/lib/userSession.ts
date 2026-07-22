/**
 * Unified end-user session for view / edit / chat.
 *
 * Historically the app had three independent "prove you own this phone" flows
 * (add-form secret input, /access verify, /chat inline login). This module
 * consolidates the *user* (non-admin) session state so a single verification
 * unlocks view, edit, and chat for the same phone number.
 *
 * The chat session is still handled by `chatSession.ts` (RPC-issued token) —
 * this module carries the *edit* credentials (secret code OR OTP session token)
 * and a contact snapshot for the /me page.
 */

const ME_KEY = "aponjon_me_session";
const EXPIRY_HOURS = 24;

const store: Storage | null =
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
    ? window.sessionStorage
    : null;

export type MeAuth =
  | { type: "secret"; phone: string; secretCode: string }
  | { type: "otp"; phone: string; sessionToken: string };

export interface MeSession {
  auth: MeAuth;
  contact: any; // full contact row snapshot (used for read-only display)
  createdAt: number;
}

export function getMeSession(): MeSession | null {
  if (!store) return null;
  try {
    const raw = store.getItem(ME_KEY);
    if (!raw) return null;
    const s: MeSession = JSON.parse(raw);
    if (Date.now() - s.createdAt > EXPIRY_HOURS * 60 * 60 * 1000) {
      store.removeItem(ME_KEY);
      return null;
    }
    return s;
  } catch {
    store.removeItem(ME_KEY);
    return null;
  }
}

export function saveMeSession(auth: MeAuth, contact: any) {
  if (!store) return;
  const session: MeSession = { auth, contact, createdAt: Date.now() };
  store.setItem(ME_KEY, JSON.stringify(session));
}

export function updateMeContactSnapshot(contact: any) {
  const existing = getMeSession();
  if (!existing) return;
  saveMeSession(existing.auth, contact);
}

export function clearMeSession() {
  if (!store) return;
  store.removeItem(ME_KEY);
}
