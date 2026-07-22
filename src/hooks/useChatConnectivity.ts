import { useEffect, useState } from "react";
import { getOfflineQueueCountForContact } from "@/lib/offlineChatQueue";

/**
 * Tracks navigator online/offline state and the offline-queue count
 * for the currently selected contact. Purely observational — no side effects
 * beyond the online/offline/custom-event listeners.
 */
export function useChatConnectivity(selectedContactId: string | undefined | null) {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    const syncConnectivity = () => setIsOffline(!navigator.onLine);
    const syncQueueCount = () =>
      setQueuedCount(selectedContactId ? getOfflineQueueCountForContact(selectedContactId) : 0);
    syncConnectivity();
    syncQueueCount();
    window.addEventListener("online", syncConnectivity);
    window.addEventListener("offline", syncConnectivity);
    window.addEventListener("offline-chat-queue-changed", syncQueueCount as EventListener);
    return () => {
      window.removeEventListener("online", syncConnectivity);
      window.removeEventListener("offline", syncConnectivity);
      window.removeEventListener("offline-chat-queue-changed", syncQueueCount as EventListener);
    };
  }, [selectedContactId]);

  return { isOffline, queuedCount, setQueuedCount };
}
