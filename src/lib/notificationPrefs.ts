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
let audioUnlockBound = false;
let audioUnlocked = false;

function createCtx(): AudioContext | null {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

function ensureAudioUnlockBinding() {
  if (audioUnlockBound || typeof window === "undefined") return;
  audioUnlockBound = true;
  const unlock = async () => {
    const ctx = createCtx();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") await ctx.resume();
      // Play a silent buffer to fully unlock on iOS Safari / some desktops
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      audioUnlocked = ctx.state === "running";
      if (audioUnlocked) removeListeners();
    } catch {}
  };
  const opts = { capture: true, passive: true } as AddEventListenerOptions;
  const events = ["pointerdown", "touchstart", "keydown", "click", "mousedown"];
  const removeListeners = () => {
    events.forEach((e) => window.removeEventListener(e, unlock, opts));
  };
  events.forEach((e) => window.addEventListener(e, unlock, opts));
}

if (typeof window !== "undefined") ensureAudioUnlockBinding();

async function playChime() {
  const ctx = createCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {}
  if (ctx.state !== "running") return; // still blocked by autoplay policy
  const now = ctx.currentTime + 0.02;
  const notes = [880, 1175]; // A5, D6 — short warm ping
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    gain.gain.setValueAtTime(0.0001, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
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
    void playChime().catch(() => {});
  }
  if (prefs.vibration && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try { navigator.vibrate([40, 30, 40]); } catch {}
  }
}

