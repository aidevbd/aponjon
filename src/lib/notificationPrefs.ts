// Per-device notification preferences for new chat messages.
// Persisted in localStorage; safe defaults if unset.

export type NotificationPrefs = {
  sound: boolean;
  vibration: boolean;
};

const STORAGE_KEY = "aponjon.notificationPrefs.v1";
const DEFAULTS: NotificationPrefs = { sound: true, vibration: true };
const CHANGE_EVENT = "aponjon:notification-prefs-changed";

export function getNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      sound: typeof parsed?.sound === "boolean" ? parsed.sound : DEFAULTS.sound,
      vibration: typeof parsed?.vibration === "boolean" ? parsed.vibration : DEFAULTS.vibration,
    };
  } catch {
    return DEFAULTS;
  }
}

export function setNotificationPrefs(prefs: NotificationPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: prefs }));
  } catch {}
}

export function subscribeNotificationPrefs(handler: (prefs: NotificationPrefs) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<NotificationPrefs>).detail);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

function playChime() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [880, 1175]; // A5, D6 — short warm ping
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    gain.gain.setValueAtTime(0.0001, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.24);
  });
}

/** Fire audio + haptic notification for a new incoming chat message, respecting prefs. */
export function notifyNewMessage() {
  const prefs = getNotificationPrefs();
  if (prefs.sound) {
    try { playChime(); } catch {}
  }
  if (prefs.vibration && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try { navigator.vibrate([40, 30, 40]); } catch {}
  }
}
