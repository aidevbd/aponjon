import { useEffect } from "react";
import { toast } from "sonner";
import {
  flushOfflineQueue,
  getOfflineQueueCountForContact,
  type QueuedChatMessage,
} from "@/lib/offlineChatQueue";

type Params = {
  enabled: boolean;
  selectedContactId: string | undefined | null;
  onDeliveredForSelected: () => void;
  onQueueCountChanged: (count: number) => void;
};

/**
 * On mount / when we come back online, flush the offline queue and notify
 * the caller so it can refresh the visible thread and queue badge.
 */
export function useOfflineQueueFlusher({
  enabled,
  selectedContactId,
  onDeliveredForSelected,
  onQueueCountChanged,
}: Params) {
  useEffect(() => {
    if (!enabled) return;
    const deliverQueued = async () => {
      const result = await flushOfflineQueue((item: QueuedChatMessage) => {
        if (selectedContactId && selectedContactId === item.receiverId) {
          onDeliveredForSelected();
        }
      });
      if (result.sent > 0) toast.success(`${result.sent}টি pending মেসেজ পাঠানো হয়েছে`);
      if (selectedContactId) {
        onQueueCountChanged(getOfflineQueueCountForContact(selectedContactId));
      }
    };
    if (navigator.onLine) void deliverQueued();
    window.addEventListener("online", deliverQueued);
    return () => window.removeEventListener("online", deliverQueued);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedContactId]);
}
