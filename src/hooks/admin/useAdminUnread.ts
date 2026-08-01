import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { swallow } from "@/lib/devLog";

/** Total unread admin messages, refreshed live on new message inserts. */
export function useAdminUnread() {
  const [totalUnread, setTotalUnread] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const { data } = await supabase.rpc("get_admin_unread_counts");
      const total = ((data || []) as { unread_count: number }[]).reduce(
        (sum, d) => sum + d.unread_count,
        0,
      );
      setTotalUnread(total);
    } catch (e) { swallow("AdminDashboard.loadUnreadCount", e); }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        void loadUnreadCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadUnreadCount]);

  return { totalUnread, setTotalUnread, loadUnreadCount };
}
