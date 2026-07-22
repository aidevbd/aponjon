import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresenceMap = Record<string, { is_online: boolean; last_seen_at: string }>;

/**
 * Subscribes to presence of the given contact ids, polling every 20s and
 * listening to realtime updates on user_presence.
 */
export function useChatPresence(sessionActive: boolean, contactIds: string[]) {
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});

  // Serialize ids so effect only re-runs when the actual set changes.
  const idsKey = contactIds.join(",");

  useEffect(() => {
    if (!sessionActive || contactIds.length === 0) return;
    const ids = contactIds;
    const fetchPresence = async () => {
      try {
        const { data } = await supabase.rpc("get_user_presence", { p_contact_ids: ids });
        if (data) {
          const map: PresenceMap = {};
          (data as any[]).forEach((p) => {
            map[p.contact_id] = { is_online: p.is_online, last_seen_at: p.last_seen_at };
          });
          setPresenceMap(map);
        }
      } catch {}
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 20000);
    const idSet = new Set(ids);
    const channel = supabase
      .channel(`presence-user-${ids[0]}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload) => {
          const row: any = payload.new || payload.old;
          if (!row || !idSet.has(row.contact_id)) return;
          setPresenceMap((prev) => ({
            ...prev,
            [row.contact_id]: { is_online: !!row.is_online, last_seen_at: row.last_seen_at },
          }));
        },
      )
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionActive, idsKey]);

  return presenceMap;
}
