import { useCallback, useEffect, useRef } from "react";
import { swallow } from "@/lib/devLog";

const DRAFTS_STORAGE_KEY = "admin-chat-drafts-v1";

/** Per-thread draft persistence for the admin chat (survives tab switch + refresh). */
export function useAdminChatDrafts() {
  const draftsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFTS_STORAGE_KEY);
      if (raw) draftsRef.current = JSON.parse(raw) || {};
    } catch (e) { swallow("AdminChat.loadDrafts", e); }
  }, []);

  const persistDrafts = useCallback(() => {
    try {
      sessionStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(draftsRef.current));
    } catch (e) { swallow("AdminChat.persistDrafts", e); }
  }, []);

  const setDraft = useCallback((userId: string, text: string) => {
    if (text && text.length > 0) draftsRef.current[userId] = text;
    else delete draftsRef.current[userId];
    persistDrafts();
  }, [persistDrafts]);

  const getDraft = useCallback((userId: string) => draftsRef.current[userId] || "", []);

  return { getDraft, setDraft };
}
