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

// --- Vibration unlock -----------------------------------------------------
// Android Chrome/Firefox use "sticky activation" for the Vibration API: after
// any real tap/key interaction on the page, later realtime callbacks may vibrate.
// Mark activation from the gesture itself and keep a tiny best-effort API call
// so WebViews that need a direct call during the gesture are also primed.
let vibrationUnlockBound = false;
let vibrationUnlocked = false;

// A single soft "knock" — like a gentle tap on a wooden door.
const VIBRATION_PATTERN = [45];

function ensureVibrationUnlockBinding() {
  if (vibrationUnlockBound || typeof window === "undefined") return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  vibrationUnlockBound = true;
  const unlock = () => {
    vibrationUnlocked = true;
    try {
      navigator.vibrate(0);
    } catch {}
    removeListeners();
  };
  const opts = { capture: true, passive: true } as AddEventListenerOptions;
  const events = ["pointerdown", "touchstart", "keydown", "click", "mousedown"];
  const removeListeners = () => {
    events.forEach((e) => window.removeEventListener(e, unlock, opts));
  };
  events.forEach((e) => window.addEventListener(e, unlock, opts));
}

if (typeof window !== "undefined") ensureVibrationUnlockBinding();

function doVibrate(pattern: number | number[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  ensureVibrationUnlockBinding();
  try {
    navigator.vibrate(0);
    const ok = navigator.vibrate(pattern);
    return ok !== false;
  } catch {
    return false;
  }
}

export function triggerVibration(pattern: number | number[] = VIBRATION_PATTERN): boolean {
  const ok = doVibrate(pattern);
  if (!ok) {
    window.setTimeout(() => doVibrate(pattern), 60);
  }
  return ok;
}

/**
 * A warm, soft "envelope arrival" tone — a single bell-like pluck
 * with a gentle harmonic, decaying quickly. Replaces the older 2-note beep
 * so the app feels like a letter arriving, not a device alert.
 */
export async function playChime() {
  const ctx = createCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {}
  if (ctx.state !== "running") return;
  const now = ctx.currentTime + 0.02;

  // Fundamental — a warm mid tone (E5 ≈ 659Hz)
  const fundamental = ctx.createOscillator();
  const fGain = ctx.createGain();
  fundamental.type = "sine";
  fundamental.frequency.setValueAtTime(659, now);
  fGain.gain.setValueAtTime(0.0001, now);
  fGain.gain.exponentialRampToValueAtTime(0.14, now + 0.015);
  fGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  fundamental.connect(fGain).connect(ctx.destination);
  fundamental.start(now);
  fundamental.stop(now + 0.6);

  // Soft harmonic shimmer (octave, very quiet)
  const harmonic = ctx.createOscillator();
  const hGain = ctx.createGain();
  harmonic.type = "sine";
  harmonic.frequency.setValueAtTime(1318, now);
  hGain.gain.setValueAtTime(0.0001, now);
  hGain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
  hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  harmonic.connect(hGain).connect(ctx.destination);
  harmonic.start(now);
  harmonic.stop(now + 0.4);
}

// Shared timestamp so poll + realtime don't double-chime.
let lastNotifyAt = 0;
export function getLastNotifyAt() {
  return lastNotifyAt;
}

/** Fire audio + haptic notification for a new incoming chat message, respecting prefs. */
export function notifyNewMessage() {
  const now = Date.now();
  // Debounce: skip if we chimed within the last 4s (realtime + poll dedup).
  if (now - lastNotifyAt < 4000) return;
  lastNotifyAt = now;

  const prefs = getNotificationPrefs();
  if (prefs.sound) {
    void playChime().catch(() => {});
  }
  if (prefs.vibration) {
    triggerVibration(VIBRATION_PATTERN);
  }
}


