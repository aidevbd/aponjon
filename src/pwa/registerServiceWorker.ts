/**
 * Guarded service worker registration for the app shell.
 *
 * This is the ONLY place that registers `/sw.js`. It refuses to register in
 * dev, Lovable preview iframes, and any Lovable-managed host so preview never
 * serves stale HTML from a lingering service worker. It also supports the
 * `?sw=off` kill switch — visiting any URL with that query unregisters the
 * SW so a broken build can be recovered without DevTools.
 */

function isRefusedContext(): boolean {
  // 1. Never register outside production builds.
  if (!import.meta.env.PROD) return true;

  // 2. Never register when embedded in the Lovable editor preview iframe.
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }

  const host = window.location.hostname;

  // 3. Lovable-managed preview & staging hosts.
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return true;
  }

  // 4. Explicit kill switch — `?sw=off` unregisters any existing SW.
  if (new URLSearchParams(window.location.search).has("sw") &&
      new URLSearchParams(window.location.search).get("sw") === "off") {
    return true;
  }

  return false;
}

async function unregisterAppShellWorkers() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => {
          // Only touch our own app-shell worker at `/sw.js`.
          // Leave Firebase Messaging / OneSignal / other scoped workers alone.
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith("/sw.js");
        })
        .map((r) => r.unregister()),
    );
  } catch (err) {
    console.warn("[pwa] failed to unregister stale service workers", err);
  }
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (isRefusedContext()) {
    // Clean up any registration that a previous visit may have left behind.
    await unregisterAppShellWorkers();
    return;
  }

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch (err) {
    console.warn("[pwa] service worker registration failed", err);
  }
}
