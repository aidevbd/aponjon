import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    let path: string = (body?.path ?? "").toString();
    if (!path) {
      return new Response(JSON.stringify({ error: "Missing path" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // If a full URL was passed, extract the object path after /chat-images/
    const m = path.match(/\/chat-images\/(.+)$/);
    if (m) path = decodeURIComponent(m[1]);
    // Normalize: only allow the chat/ prefix keys we upload
    if (!/^chat\/[A-Za-z0-9_.\-]+$/.test(path)) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorize: admin JWT OR valid chat-session token
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    let authorized = false;

    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const jwt = authHeader.slice(7);
      // Reject the anon key masquerading as a user JWT
      if (jwt !== ANON) {
        const anonClient = createClient(SUPABASE_URL, ANON);
        const { data: claims } = await anonClient.auth.getClaims(jwt);
        const sub = claims?.claims?.sub;
        if (sub) {
          const { data: contact } = await admin
            .from("contacts")
            .select("id")
            .eq("auth_user_id", sub)
            .eq("is_admin", true)
            .maybeSingle();
          if (contact) authorized = true;
        }
      }
    }

    if (!authorized) {
      const sessionToken = req.headers.get("x-chat-session");
      if (sessionToken) {
        const { data } = await admin
          .from("chat_sessions")
          .select("contact_id, expires_at")
          .eq("session_token", sessionToken)
          .maybeSingle();
        if (data && new Date(data.expires_at).getTime() > Date.now()) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error } = await admin.storage
      .from("chat-images")
      .createSignedUrl(path, 60 * 60); // 1 hour

    if (error || !signed) {
      return new Response(JSON.stringify({ error: error?.message || "Sign failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ signedUrl: signed.signedUrl, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
