import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { swallow } from "@/lib/devLog";
import type { PresenceMap } from "@/components/admin/adminChatTypes";

/**
 * Live presence for the admin chat: initial fetch, 15s polling and
 * realtime `user_presence` row updates for the visible contacts.
 */
export function useAdminChatPresence(adminContactId: string | null, contactIds: string[]) {
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});
  const idsKey = contactIds.join(",");

  useEffect(() => {
    if (!adminContactId || contactIds.length === 0) return;
    let stopped = false;
    const ids = contactIds;

    const refresh = async () => {
      try {
        const { data } = await supabase.rpc("get_user_presence", { p_contact_ids: ids });
        if (stopped || !data) return;
        const map: PresenceMap = {};
        (data as any[]).forEach((p) => {
          map[p.contact_id] = { lastSeen: p.last_seen_at, isOnline: p.is_online };
        });
        setPresenceMap(map);
      } catch (e) { swallow("AdminChat.fetchPresence", e); }
    };

    refresh();
    const poll = setInterval(refresh, 15000);
    const idSet = new Set(ids);
    const channel = supabase
      .channel(`presence-embed-${adminContactId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        const row: any = payload.new || payload.old;
        if (!row || !idSet.has(row.contact_id)) return;
        setPresenceMap((prev) => ({
          ...prev,
          [row.contact_id]: { lastSeen: row.last_seen_at, isOnline: !!row.is_online },
        }));
      })
      .subscribe();

    return () => { stopped = true; clearInterval(poll); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminContactId, idsKey]);

  return { presenceMap, setPresenceMap };
}
