/**
 * Dedicated Supabase client for *email ownership proof* only.
 *
 * Why a second client?
 * The auto-generated main client uses the default PKCE flow. With PKCE the
 * magic link only works inside the same browser profile that requested it
 * (the code verifier lives in that browser's localStorage). In practice users
 * open the link from the Gmail app or another browser, so the exchange fails
 * and verification appears "broken".
 *
 * This client uses the implicit flow: the emailed link comes back with the
 * tokens directly in the URL hash, so it works from any browser/device.
 * It has its own storage key so it never touches the admin auth session.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const emailAuth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: "implicit",
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: false,
    storageKey: "aponjon-email-verify-auth",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
