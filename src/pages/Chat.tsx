import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowLeft, Send, Image as ImageIcon, Lock, Phone, X, Loader2, Pencil, Reply, Search, Pin, Settings2, Home, LogOut, WifiOff, Clock3, CheckCircle2, Bell, ArrowDownToLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getChatSession, createChatSession, getChatContacts,
  sendMessage, getMessages, getUnreadCounts, uploadChatImage,
  clearChatSession, editMessage,
  reactToMessage, unsendMessage, removeMessageForMe, getMessageEditHistory,
  signMessagesImages, getSignedChatImageUrl,
  type ChatSession,
} from "@/lib/chatSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { EmojiPicker } from "@/components/EmojiPicker";
import { enqueueOfflineMessage, flushOfflineQueue, getOfflineQueueCountForContact, type QueuedChatMessage } from "@/lib/offlineChatQueue";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageActionSheet } from "@/components/chat/MessageActionSheet";
import { EditHistoryDialog } from "@/components/chat/EditHistoryDialog";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { NotificationPreferencesDialog } from "@/components/chat/NotificationPreferencesDialog";
import { FailedMessagesList, type FailedChatMessage } from "@/components/chat/FailedMessagesList";
import { ChatMessagesSkeleton } from "@/components/chat/ChatMessagesSkeleton";
import { reconcileMessages } from "@/lib/chatMessageUtils";
import { notifyNewMessage } from "@/lib/notificationPrefs";
import { useSmartAutoScroll } from "@/hooks/useSmartAutoScroll";
import { JumpToLatest } from "@/components/chat/JumpToLatest";
import { useVisualViewportHeight } from "@/hooks/useVisualViewportHeight";
import { AutoResizeTextarea } from "@/components/chat/AutoResizeTextarea";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";


type ChatContact = { id: string; name: string; phone: string; photo_url: string | null };
type Message = {
  id: string; sender_id: string; receiver_id: string; content: string | null;
  image_url: string | null; is_read: boolean; created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;

  edited_at?: string | null; original_content?: string | null;
  reply_to_id?: string | null; reply_content?: string | null; reply_sender_id?: string | null;
  is_pinned?: boolean;
  unsent_at?: string | null;
  has_edit_history?: boolean;
  reactions?: { emoji: string; reactor_id: string }[];
  // Client-only: optimistic pending flag (message in-flight)
  pending?: boolean;
};

type ContactPreview = {
  preview: string;
  time: string | null;
};

const Chat = () => {
  const navigate = useNavigate();
  const viewportHeight = useVisualViewportHeight();
  const isTouch = useIsTouchDevice();

  // Lock body scroll while chat page is open so the fixed viewport never
  // shows blank space when mobile browser chrome hides/shows.
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginSecret, setLoginSecret] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, { is_online: boolean; last_seen_at: string }>>({});
  
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [failedMessages, setFailedMessages] = useState<FailedChatMessage[]>([]);
  const [contactPreviews, setContactPreviews] = useState<Record<string, ContactPreview>>({});
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [actionAnchor, setActionAnchor] = useState<DOMRect | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);
  const [unsendTargetId, setUnsendTargetId] = useState<string | null>(null);
  const [editHistoryFor, setEditHistoryFor] = useState<Message | null>(null);
  const [editHistory, setEditHistory] = useState<{ previous_content: string; edited_at: string }[]>([]);
  const [editHistoryLoading, setEditHistoryLoading] = useState(false);
  const [notifPrefsOpen, setNotifPrefsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastTypingRef = useRef(0);
  const recentSendAtRef = useRef(0);
  const messageListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const msgUpdateTimerRef = useRef<number | null>(null);

  const restoreInputFocus = useCallback((force = false) => {
    const focusInput = () => {
      const input = inputRef.current;
      if (!input) return;
      if (force || document.activeElement !== input) {
        input.focus({ preventScroll: true });
        const caret = input.value.length;
        try { input.setSelectionRange(caret, caret); } catch {}
      }
    };

    requestAnimationFrame(() => {
      focusInput();
      window.setTimeout(focusInput, 40);
    });
  }, []);

  useEffect(() => {
    const existing = getChatSession();
    if (existing) setSession(existing);
  }, []);

  useEffect(() => {
    const syncConnectivity = () => setIsOffline(!navigator.onLine);
    const syncQueueCount = () => setQueuedCount(selectedContact ? getOfflineQueueCountForContact(selectedContact.id) : 0);

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
  }, [selectedContact]);

  useEffect(() => {
    if (!session) return;
    loadContacts();
    loadUnread();
    const sendHeartbeat = async () => {
      try { await supabase.rpc("update_presence", { p_token: session.token, p_contact_id: session.contactId } as any); } catch {}
    };
    sendHeartbeat();
    const heartbeat = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(heartbeat);
  }, [session]);

  useEffect(() => {
    if (!session || contacts.length === 0) return;
    const ids = contacts.map(c => c.id);
    const fetchPresence = async () => {
      try {
        const { data } = await supabase.rpc("get_user_presence", { p_contact_ids: ids });
        if (data) {
          const map: Record<string, { is_online: boolean; last_seen_at: string }> = {};
          (data as any[]).forEach(p => { map[p.contact_id] = { is_online: p.is_online, last_seen_at: p.last_seen_at }; });
          setPresenceMap(map);
        }
      } catch {}
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 20000);
    const idSet = new Set(ids);
    const channel = supabase
      .channel(`presence-user-${session.contactId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        const row: any = payload.new || payload.old;
        if (!row || !idSet.has(row.contact_id)) return;
        setPresenceMap(prev => ({
          ...prev,
          [row.contact_id]: { is_online: !!row.is_online, last_seen_at: row.last_seen_at },
        }));
      })
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [session, contacts]);


  useEffect(() => {
    if (!session) return;
    // Regular users no longer have direct SELECT on the messages table for privacy.
    // Subscribe to a per-conversation broadcast topic emitted by send_message / send_admin_message
    // and refetch the conversation via the secure RPC when a new message arrives.
    if (!selectedContact) return;
    const sortedIds = [session.contactId, selectedContact.id].sort();
    const topic = `msg:${sortedIds[0]}:${sortedIds[1]}`;
    const channel = supabase
      .channel(topic, { config: { private: false } })
      .on("broadcast", { event: "new_message" }, (payload) => {
        const data = payload.payload as { id: string; sender_id: string; receiver_id: string };
        if (!data) return;
        // Refetch messages so the user sees the new content (including any reply context)
        if (selectedContact && (
          (data.sender_id === selectedContact.id && data.receiver_id === session.contactId) ||
          (data.sender_id === session.contactId && data.receiver_id === selectedContact.id)
        )) {
          void loadMessages(selectedContact);
        }
        if (data.receiver_id === session.contactId && data.sender_id !== session.contactId) {
          notifyNewMessage();
        }
        if (data.receiver_id === session.contactId && data.sender_id !== selectedContact?.id) {
          setUnreadMap((prev) => ({ ...prev, [data.sender_id]: (prev[data.sender_id] || 0) + 1 }));
        }
      })

      .on("broadcast", { event: "msg_update" }, (payload) => {
        const data = payload.payload as { id: string; sender_id: string; receiver_id: string; event: string };
        if (!data || !selectedContact) return;
        const inThread =
          (data.sender_id === selectedContact.id && data.receiver_id === session.contactId) ||
          (data.sender_id === session.contactId && data.receiver_id === selectedContact.id);
        if (!inThread) return;
        // Coalesce bursty msg_update events (delivered/read fire once per message)
        if (msgUpdateTimerRef.current) return;
        msgUpdateTimerRef.current = window.setTimeout(() => {
          msgUpdateTimerRef.current = null;
          void loadMessages(selectedContact);
        }, 200);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (msgUpdateTimerRef.current) { clearTimeout(msgUpdateTimerRef.current); msgUpdateTimerRef.current = null; }
    };
  }, [session, selectedContact]);

  useEffect(() => {
    if (!session || !selectedContact) { setIsOtherTyping(false); typingChannelRef.current = null; return; }
    const channelName = `typing:${[session.contactId, selectedContact.id].sort().join(":")}`;
    const channel = supabase.channel(channelName)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.sender_id === selectedContact.id) {
          setIsOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
        }
      })
      .subscribe();
    typingChannelRef.current = channel;
    return () => {
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
      setIsOtherTyping(false);
    };
  }, [session, selectedContact]);

  const emitTyping = () => {
    if (!session || !selectedContact) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;
    // Re-use the already-subscribed typing channel instead of creating a new one each keystroke.
    const channel = typingChannelRef.current;
    if (!channel) return;
    void channel.send({ type: "broadcast", event: "typing", payload: { sender_id: session.contactId } });
  };

  const { newBelowCount, scrollToBottom, resetForNewThread } = useSmartAutoScroll(
    messageListRef,
    messages,
    session?.contactId,
  );

  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const jumpToMessage = (id: string) => {
    const container = messageListRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-msg-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMsgId(id);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedMsgId(null), 1800);
  };

  // When viewport height changes (e.g. keyboard opens), keep the latest message in view
  // if the user was already near the bottom of the conversation.
  const prevViewportRef = useRef<number>(viewportHeight);
  useEffect(() => {
    const el = messageListRef.current;
    if (!el || !viewportHeight) return;
    const prev = prevViewportRef.current;
    prevViewportRef.current = viewportHeight;
    if (viewportHeight === prev) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance <= 150) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
      });
    }
  }, [viewportHeight]);

  // On own-send, restore keyboard focus without losing state.
  useEffect(() => {
    if (Date.now() - recentSendAtRef.current < 1500) {
      restoreInputFocus(true);
    }
  }, [messages, restoreInputFocus]);

  const loadContacts = async () => {
    if (!session) return;
    try {
      const data = await getChatContacts(session.token);
      if (data.length === 0) {
        const { data: valid } = await supabase.rpc("validate_chat_session", { p_token: session.token });
        if (!valid) {
          clearChatSession();
          setSession(null);
          toast.error("সেশন শেষ হয়ে গেছে। আবার লগইন করুন। 🔒");
          return;
        }
      }
      setContacts(data);
      const previewEntries = await Promise.all(
        data.map(async (contact) => {
          try {
            const contactMessages = await getMessages(session.token, contact.id);
            const lastMessage = contactMessages[contactMessages.length - 1];
            return [
              contact.id,
              {
                preview: lastMessage?.content || (lastMessage?.image_url ? "ছবি পাঠানো হয়েছে" : "ট্যাপ করে মেসেজ করুন"),
                time: lastMessage?.created_at || null,
              },
            ] as const;
          } catch {
            return [contact.id, { preview: "ট্যাপ করে মেসেজ করুন", time: null }] as const;
          }
        }),
      );
      setContactPreviews(Object.fromEntries(previewEntries));
    } catch (err) {
      console.error("[catch]", err);
      toast.error("কন্টাক্ট লোড করতে সমস্যা");
    }
  };

  const loadUnread = async () => {
    if (!session) return;
    try {
      const data = await getUnreadCounts(session.token);
      const map: Record<string, number> = {};
      data.forEach((d) => { map[d.sender_id] = d.unread_count; });
      setUnreadMap(map);
    } catch {}
  };

  const loadMessages = useCallback(async (contact: ChatContact, opts?: { silent?: boolean }) => {
    if (!session) return;
    if (!opts?.silent) setMessagesLoading(true);
    try {
      const raw = await getMessages(session.token, contact.id);
      const data = await signMessagesImages(raw, session.token).catch(() => raw);
      setMessages(prev => {
        // Preserve optimistic pending temps whose real counterpart isn't on the server yet.
        const pendings = prev.filter(m => m.pending);
        const survivors = pendings.filter(p => !data.some(d =>
          d.sender_id === p.sender_id &&
          (d.content ?? null) === (p.content ?? null) &&
          (d.image_url ?? null) === (p.image_url ?? null)
        ));
        return reconcileMessages([...(data as Message[]), ...survivors]);
      });
      const lastMessage = data[data.length - 1];
      setContactPreviews((prev) => ({
        ...prev,
        [contact.id]: {
          preview: lastMessage?.content || (lastMessage?.image_url ? "ছবি পাঠানো হয়েছে" : "এখনো কোনো মেসেজ নেই"),
          time: lastMessage?.created_at || null,
        },
      }));
      setUnreadMap((prev) => { const n = { ...prev }; delete n[contact.id]; return n; });
      // Fire-and-forget: mark inbound messages as delivered so the sender sees ✓✓
      void (async () => { try { await supabase.rpc("mark_conversation_delivered", { p_token: session.token, p_other_id: contact.id } as any); } catch {} })();

    } catch (err) {
      console.error("[catch]", err);
      toast.error("মেসেজ লোড করতে সমস্যা");
    } finally {
      if (!opts?.silent) setMessagesLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const deliverQueued = async () => {
      const result = await flushOfflineQueue((item: QueuedChatMessage) => {
        if (selectedContact?.id === item.receiverId) {
          void loadMessages(selectedContact);
        }
      });

      if (result.sent > 0) {
        toast.success(`${result.sent}টি pending মেসেজ পাঠানো হয়েছে`);
      }
      if (selectedContact) {
        setQueuedCount(getOfflineQueueCountForContact(selectedContact.id));
      }
    };

    if (navigator.onLine) {
      void deliverQueued();
    }

    window.addEventListener("online", deliverQueued);
    return () => window.removeEventListener("online", deliverQueued);
  }, [session, selectedContact, loadMessages]);

  // Auto-retry any failed-in-flight messages when the network comes back.
  useEffect(() => {
    if (failedMessages.length === 0) return;
    const retryAll = () => {
      if (!navigator.onLine) return;
      failedMessages.forEach(f => { if (!f.retrying) void handleResendFailed(f.id); });
    };
    window.addEventListener("online", retryAll);
    return () => window.removeEventListener("online", retryAll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failedMessages]);

  const handleSelectContact = (contact: ChatContact) => {
    setSelectedContact(contact);
    setQueuedCount(getOfflineQueueCountForContact(contact.id));
    setFailedMessages([]);
    setMessages([]);
    resetForNewThread();
    loadMessages(contact);
  };

  // Consistency check: resync current thread on tab focus / online events.
  useEffect(() => {
    if (!session || !selectedContact) return;
    const resync = () => {
      if (document.visibilityState === "visible") void loadMessages(selectedContact, { silent: true });
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("online", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("online", resync);
    };
  }, [session, selectedContact, loadMessages]);

  const handleLogin = async () => {
    if (!loginPhone.trim() || !loginSecret.trim()) {
      toast.error("ফোন নম্বর ও সিক্রেট কোড দিন");
      return;
    }
    setLoginLoading(true);
    try {
      const s = await createChatSession(loginPhone, loginSecret);
      if (s) {
        setSession(s);
        toast.success(`স্বাগতম, ${s.name}! 💬`);
      } else {
        toast.error("ফোন বা সিক্রেট কোড ভুল");
      }
    } catch (err: any) {
      if (err?.message === "RATE_LIMITED") {
        toast.error("অনেকবার চেষ্টা করেছেন। ৩০ মিনিট পর আবার চেষ্টা করুন। 🔒");
      } else {
        toast.error("লগইন সমস্যা হয়েছে");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSend = async () => {
    if (sending || !session || !selectedContact) return;

    const text = msgInput.trim();
    if (!text) {
      restoreInputFocus(true);
      return;
    }

    // If editing
    if (editingMsg) {
      recentSendAtRef.current = Date.now();
      setSending(true);
      setMsgInput("");
      try {
        await editMessage(session.token, editingMsg.id, text);
        setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: text, edited_at: new Date().toISOString(), original_content: m.original_content || m.content } : m));
        toast.success("মেসেজ এডিট হয়েছে");
      } catch (err) {
        console.error("[catch]", err);
        toast.error("এডিট করতে সমস্যা");
        setMsgInput(text);
      } finally {
        setSending(false);
        setEditingMsg(null);
        restoreInputFocus(true);
      }
      return;
    }

    recentSendAtRef.current = Date.now();
    setSending(true);
    setMsgInput("");

    if (!navigator.onLine) {
      enqueueOfflineMessage({
        token: session.token,
        receiverId: selectedContact.id,
        content: text,
        imageUrl: null,
        replyToId: replyingTo?.id || null,
      });
      setQueuedCount(getOfflineQueueCountForContact(selectedContact.id));
      setReplyingTo(null);
      setSending(false);
      restoreInputFocus(true);
      toast.success("ইন্টারনেট এলে মেসেজ অটো পাঠানো হবে");
      return;
    }

    // Optimistic insert — bubble appears instantly; auto-retry on transient failures.
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const optimistic: Message = {
      id: tempId,
      sender_id: session.contactId,
      receiver_id: selectedContact.id,
      content: text,
      image_url: null,
      is_read: false,
      created_at: nowIso,
      delivered_at: null,
      read_at: null,
      reply_to_id: replyingTo?.id || null,
      reply_content: replyingTo?.content || null,
      reply_sender_id: replyingTo?.sender_id || null,
      reactions: [],
      pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    const replyIdSnapshot = replyingTo?.id || undefined;
    setReplyingTo(null);

    try {
      const realId = await sendWithRetry(() =>
        sendMessage(session.token, selectedContact.id, text, undefined, replyIdSnapshot)
      );
      // Swap tempId → real id and clear pending. If a broadcast refetch already
      // reconciled the temp away, this no-op is harmless.
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, id: (realId as string) || m.id, pending: false } : m
      ));
    } catch (err: any) {
      if (err?.message?.includes("Invalid session")) {
        clearChatSession();
        setSession(null);
        toast.error("সেশন শেষ হয়ে গেছে। আবার লগইন করুন।");
      } else {
        // Drop the optimistic bubble and fall back to the visible failed list for manual resend.
        setMessages(prev => prev.filter(m => m.id !== tempId));
        const failed: FailedChatMessage = {
          id: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          content: text,
          imageUrl: null,
          replyToId: replyIdSnapshot || null,
          replyContent: optimistic.reply_content || null,
          createdAt: nowIso,
        };
        setFailedMessages(prev => [...prev, failed]);
        toast.error("মেসেজ পাঠাতে সমস্যা — নিচে 'আবার পাঠান' চাপুন");
      }
    } finally {
      setSending(false);
      restoreInputFocus(true);
    }
  };

  // Retry helper: 3 attempts with exponential backoff, aborts early on offline / auth errors.
  const sendWithRetry = async <T,>(fn: () => Promise<T>, tries = 3): Promise<T> => {
    let lastErr: any;
    for (let i = 0; i < tries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        lastErr = err;
        if (err?.message?.includes("Invalid session")) throw err;
        if (typeof navigator !== "undefined" && !navigator.onLine) throw err;
        if (i < tries - 1) {
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
        }
      }
    }
    throw lastErr;
  };

  const handleResendFailed = async (failedId: string) => {
    if (!session || !selectedContact) return;
    const item = failedMessages.find(f => f.id === failedId);
    if (!item) return;
    setFailedMessages(prev => prev.map(f => f.id === failedId ? { ...f, retrying: true } : f));
    try {
      await sendWithRetry(() => sendMessage(
        session.token,
        selectedContact.id,
        item.content || undefined,
        item.imageUrl || undefined,
        item.replyToId || undefined,
      ));
      setFailedMessages(prev => prev.filter(f => f.id !== failedId));
      toast.success("মেসেজ পাঠানো হয়েছে");
    } catch (err: any) {
      setFailedMessages(prev => prev.map(f => f.id === failedId ? { ...f, retrying: false } : f));
      if (err?.message?.includes("Invalid session")) {
        clearChatSession();
        setSession(null);
        toast.error("সেশন শেষ হয়ে গেছে। আবার লগইন করুন।");
      } else {
        toast.error("এখনো পাঠানো যাচ্ছে না");
      }
    }
  };

  const handleDeleteFailed = (failedId: string) => {
    setFailedMessages(prev => prev.filter(f => f.id !== failedId));
  };

  const handleUnsendMessage = async () => {
    if (!session || !unsendTargetId) return;
    try {
      await unsendMessage(session.token, unsendTargetId);
      setMessages(prev => prev.map(m => m.id === unsendTargetId ? { ...m, content: null, image_url: null, unsent_at: new Date().toISOString() } : m));
      toast.success("মেসেজ আনসেন্ড করা হয়েছে");
    } catch (err) {
      console.error("[catch]", err);
      toast.error("আনসেন্ড করতে সমস্যা");
    } finally {
      setUnsendTargetId(null);
    }
  };

  const handleRemoveForMe = async (msg: Message) => {
    if (!session) return;
    try {
      await removeMessageForMe(session.token, msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      toast.success("আপনার চ্যাট থেকে সরানো হয়েছে");
    } catch (err) {
      console.error("[catch]", err);
      toast.error("সরাতে সমস্যা");
    }
  };

  const handleReact = async (msg: Message, emoji: string) => {
    if (!session) return;
    // optimistic toggle
    setMessages(prev => prev.map(m => {
      if (m.id !== msg.id) return m;
      const reactions = m.reactions || [];
      const mine = reactions.find(r => r.reactor_id === session.contactId);
      let next = reactions.filter(r => r.reactor_id !== session.contactId);
      if (!mine || mine.emoji !== emoji) {
        next = [...next, { emoji, reactor_id: session.contactId }];
      }
      return { ...m, reactions: next };
    }));
    try {
      await reactToMessage(session.token, msg.id, emoji);
    } catch (err) {
      console.error("[catch]", err);
      toast.error("রিয়্যাকশনে সমস্যা");
      if (selectedContact) void loadMessages(selectedContact);
    }
  };

  const handleShowEditHistory = async (msg: Message) => {
    if (!session) return;
    setEditHistoryFor(msg);
    setEditHistoryLoading(true);
    setEditHistory([]);
    try {
      const data = await getMessageEditHistory(session.token, msg.id);
      setEditHistory(data);
    } catch (err) {
      console.error("[catch]", err);
      toast.error("ইতিহাস লোড করতে সমস্যা");
    } finally {
      setEditHistoryLoading(false);
    }
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMsg(msg);
    setMsgInput(msg.content || "");
    setReplyingTo(null);
    inputRef.current?.focus();
  };

  const handleStartReply = (msg: Message) => {
    setReplyingTo(msg);
    setEditingMsg(null);
    setMsgInput("");
    inputRef.current?.focus();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session || !selectedContact) return;
    if (!file.type.startsWith("image/")) { toast.error("শুধুমাত্র ছবি পাঠানো যাবে"); return; }
    setUploading(true);
    try {
      const url = await uploadChatImage(file, session.token);
      try {
        await sendMessage(session.token, selectedContact.id, undefined, url, replyingTo?.id);
        setReplyingTo(null);
      } catch (sendErr) {
        const failed: FailedChatMessage = {
          id: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          content: null,
          imageUrl: url,
          replyToId: replyingTo?.id || null,
          replyContent: replyingTo?.content || null,
          createdAt: new Date().toISOString(),
        };
        setFailedMessages(prev => [...prev, failed]);
        setReplyingTo(null);
        toast.error("ছবি পাঠাতে সমস্যা — 'আবার পাঠান' চাপুন");
      }
    } catch (err) {
      console.error("[catch]", err);
      toast.error("ছবি পাঠাতে সমস্যা");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogout = () => {
    clearChatSession();
    setSession(null);
    setSelectedContact(null);
    setMessages([]);
    setContacts([]);
    toast.info("লগআউট হয়েছে");
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  };

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000);
    if (diffDays === 0) return "আজ";
    if (diffDays === 1) return "গতকাল";
    if (diffDays < 7) return d.toLocaleDateString("bn-BD", { weekday: "long" });
    return d.toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
  };

  const shouldShowDateHeader = (msgs: Message[], idx: number) => {
    if (idx === 0) return true;
    const prev = new Date(msgs[idx - 1].created_at).toDateString();
    const curr = new Date(msgs[idx].created_at).toDateString();
    return prev !== curr;
  };

  const formatLastSeen = (presence?: { is_online: boolean; last_seen_at: string }) => {
    if (!presence) return null;
    if (presence.is_online) return "এখন অনলাইন";
    const diff = Date.now() - new Date(presence.last_seen_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "এইমাত্র অনলাইন ছিলেন";
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ঘন্টা আগে`;
    const days = Math.floor(hours / 24);
    return `${days} দিন আগে`;
  };

  const pinnedMessages = messages.filter(m => m.is_pinned);
  const filteredMessages = searchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;
  const statusTone = sending ? "text-primary" : isOffline ? "text-destructive" : queuedCount > 0 ? "text-foreground" : "text-muted-foreground";
  const statusLabel = sending
    ? "মেসেজ পাঠানো হচ্ছে..."
    : isOffline
      ? "অফলাইন — মেসেজ queue হবে"
      : queuedCount > 0
        ? `${queuedCount}টি pending মেসেজ আছে`
        : "অনলাইন — এখনই মেসেজ যাবে";

  // ============ LOGIN SCREEN ============
  if (!session) {
    return (
      <div className="min-h-screen warm-gradient">
        <Header />
        <main className="container mx-auto px-4 py-10 sm:py-16">
          <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            {/* Left: heirloom promise (desktop only) */}
            <aside className="hidden lg:flex lg:flex-col lg:gap-5 lg:pr-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold)/0.4)] bg-[hsl(var(--heirloom-gold)/0.08)]">
                <Lock className="h-5 w-5 text-[hsl(var(--heirloom-gold-deep))]" />
              </div>
              <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-[hsl(var(--heirloom-ink))]">
                প্রাইভেট মেসেজ
              </h1>
              <div aria-hidden className="h-px w-24 bg-gradient-to-r from-[hsl(var(--heirloom-gold))] to-transparent" />
              <p className="text-[15px] leading-[1.7] text-[hsl(var(--heirloom-ink-soft))]">
                আপনার সিক্রেট কোড দিয়ে সাইন-ইন করলেই একটি নিরাপদ, শান্ত কথোপকথনের জায়গা খুলবে — শুধু আপনি আর আপনজন।
              </p>
              <ul className="space-y-2 text-sm text-[hsl(var(--heirloom-ink-soft))]">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--heirloom-gold))]" /> রিয়েল-টাইম মেসেজ ও অনলাইন স্ট্যাটাস</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--heirloom-gold))]" /> সম্পূর্ণ end-to-end প্রাইভেট</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--heirloom-gold))]" /> ছবি, রিপ্লাই ও রিঅ্যাকশন সাপোর্ট</li>
              </ul>
            </aside>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto w-full max-w-sm lg:max-w-md lg:mx-0">
              <div className="glass-card p-8">
                <div className="text-center mb-8 lg:hidden">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full hero-gradient shadow-rose">
                    <MessageCircle className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h1 className="text-xl font-display font-semibold text-foreground">প্রাইভেট মেসেজ</h1>
                  <p className="text-sm text-muted-foreground mt-1">সিক্রেট কোড দিয়ে লগইন করুন</p>
                </div>
                <div className="hidden lg:block mb-6">
                  <h2 className="text-lg font-display font-semibold text-foreground">সাইন-ইন</h2>
                  <p className="text-sm text-muted-foreground mt-1">ফোন নম্বর ও সিক্রেট কোড দিন</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> ফোন নম্বর</Label>
                    <Input placeholder="01XXXXXXXXX" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} className="bg-card" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-primary" /> সিক্রেট কোড</Label>
                    <Input type="password" placeholder="আপনার সিক্রেট কোড" value={loginSecret} onChange={(e) => setLoginSecret(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} className="bg-card" />
                  </div>
                  <Button onClick={handleLogin} variant="hero" className="w-full" disabled={loginLoading}>
                    <MessageCircle className="h-4 w-4 mr-1" /> {loginLoading ? "যাচাই হচ্ছে..." : "চ্যাট শুরু করুন"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground text-center mt-4">
                  🔒 আপনার মেসেজ সম্পূর্ণ প্রাইভেট ও সিকিউর
                </p>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }


  // ============ CHAT INTERFACE ============
  return (
    <div className="warm-gradient flex flex-col overflow-hidden fixed inset-0" style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background shrink-0 pt-[env(safe-area-inset-top)] shadow-[0_8px_18px_-18px_hsl(var(--heirloom-ink)/0.35)]">
        <div className="container mx-auto max-w-3xl lg:max-w-4xl flex h-14 items-center justify-between px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-2 min-w-0 flex-1 relative">
            <AnimatePresence mode="wait" initial={false}>
              {selectedContact ? (
                <motion.button
                  key={`hdr-thread-${selectedContact.id}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  onClick={() => { setSelectedContact(null); setSearchOpen(false); setSearchQuery(""); }}
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors min-w-0"
                >
                  <ArrowLeft className="h-5 w-5 shrink-0" />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      {selectedContact.photo_url ? (
                        <img src={selectedContact.photo_url} alt={selectedContact.name} className="h-8 w-8 rounded-full object-cover border border-primary/20" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{selectedContact.name.charAt(0)}</div>
                      )}
                      {presenceMap[selectedContact.id]?.is_online && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <span className="font-semibold text-sm truncate block">{selectedContact.name}</span>
                      {presenceMap[selectedContact.id] && (
                        <p className={`text-[10px] truncate ${presenceMap[selectedContact.id].is_online ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {formatLastSeen(presenceMap[selectedContact.id])}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ) : (
                <motion.div
                  key="hdr-list"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full hero-gradient shadow-rose">
                    <MessageCircle className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <span className="font-display font-semibold text-foreground text-sm">মেসেজ</span>
                    <span className="ml-2 text-xs text-muted-foreground">{session.name}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedContact && (
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="মেসেজ খুঁজুন" onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}>
                <Search className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen} modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="সেটিংস ও অপশন">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="z-[70] w-52">
                <DropdownMenuItem onSelect={() => { setSettingsOpen(false); setNotifPrefsOpen(true); }} className="gap-2 text-sm">
                  <Bell className="h-4 w-4" /> নোটিফিকেশন সেটিংস
                </DropdownMenuItem>
                {selectedContact && (
                  <>
                    <DropdownMenuItem
                      onSelect={() => { setSettingsOpen(false); scrollToBottom(true); }}
                      className="gap-2 text-sm"
                    >
                      <ArrowDownToLine className="h-4 w-4" /> সর্বশেষ মেসেজে যান
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => { setSettingsOpen(false); if (selectedContact) void loadMessages(selectedContact); }}
                      className="gap-2 text-sm"
                    >
                      <RefreshCw className="h-4 w-4" /> রিফ্রেশ
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onSelect={() => { setSettingsOpen(false); navigate("/"); }} className="gap-2 text-sm">
                  <Home className="h-4 w-4" /> হোম
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setSettingsOpen(false); handleLogout(); }} className="gap-2 text-sm text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> লগআউট
                </DropdownMenuItem>
              </DropdownMenuContent>

            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden container mx-auto max-w-3xl lg:max-w-4xl w-full px-0">
        {/* Search bar */}
        {searchOpen && (
          <div className="relative z-40 isolate shrink-0 px-4 pt-2 pb-2 bg-background">
            <div className="flex items-center gap-2">
              <Input placeholder="মেসেজ খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-card h-8 text-sm" autoFocus />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="সার্চ বন্ধ করুন" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {searchQuery && <p className="text-[10px] text-muted-foreground mt-1">{filteredMessages.length} টি মেসেজ পাওয়া গেছে</p>}
          </div>
        )}

        {/* Pinned messages */}
        {selectedContact && pinnedMessages.length > 0 && !searchOpen && (
          <div className="px-4 pt-2">
            <div className="bg-accent/50 rounded-lg p-2 border border-border/50">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                <Pin className="h-3 w-3" /> পিন করা মেসেজ
              </div>
              {pinnedMessages.slice(0, 2).map(pm => (
                <p key={pm.id} className="text-xs text-foreground truncate">📌 {pm.content || "ছবি"}</p>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {!selectedContact ? (
            <motion.div key="contacts" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="flex-1 px-4 py-4 overflow-y-auto chat-scroll">
              {contacts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">এখনো কোনো চ্যাট প্রস্তুত নেই</p>
                  <p className="text-xs mt-1">অ্যাডমিন সেটআপ করলেই এখান থেকে সরাসরি মেসেজ করতে পারবেন</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectContact(c)}
                      className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-card/80 transition-colors text-left border border-transparent hover:border-border/50"
                    >
                      <div className="relative shrink-0">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.name} className="h-11 w-11 rounded-full object-cover border border-primary/20" />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{c.name.charAt(0)}</div>
                        )}
                        {presenceMap[c.id]?.is_online && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{c.name} <span className="text-[10px] love-badge ml-1">এডমিন</span></div>
                          {contactPreviews[c.id]?.time && (
                            <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(contactPreviews[c.id].time!)}</span>
                          )}
                        </div>
                        <div className={`text-xs truncate ${presenceMap[c.id]?.is_online ? "text-green-500" : "text-muted-foreground"}`}>
                          {contactPreviews[c.id]?.preview || formatLastSeen(presenceMap[c.id]) || "ট্যাপ করে মেসেজ করুন"}
                        </div>
                      </div>
                      {unreadMap[c.id] && (
                        <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full hero-gradient text-primary-foreground text-[10px] font-bold px-1.5">
                          {unreadMap[c.id]}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="thread" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="relative z-0 flex-1 flex flex-col min-h-0 overflow-hidden">
                <div ref={messageListRef} className={`chat-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-5 md:px-6 pb-2 ${searchOpen ? "pt-7" : "pt-4"} space-y-1`}>
                  {messagesLoading && messages.length === 0 && <ChatMessagesSkeleton />}
                  {!messagesLoading && filteredMessages.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{searchQuery ? "কোনো মেসেজ পাওয়া যায়নি" : "এখনো কোনো মেসেজ নেই"}</p>
                      {!searchQuery && <p className="text-xs mt-1">নিচের বক্সে লিখে প্রথম মেসেজ শুরু করুন</p>}
                    </div>
                  )}
                  {(() => {
                    // Find last own message id for receipt rendering
                    let lastMineId: string | null = null;
                    for (let i = filteredMessages.length - 1; i >= 0; i--) {
                      if (filteredMessages[i].sender_id === session.contactId) { lastMineId = filteredMessages[i].id; break; }
                    }
                    return filteredMessages.map((msg, idx) => {
                      const isMine = msg.sender_id === session.contactId;
                      const showDateHeader = !searchQuery && shouldShowDateHeader(filteredMessages, idx);
                      const prev = idx > 0 ? filteredMessages[idx - 1] : null;
                      const next = idx < filteredMessages.length - 1 ? filteredMessages[idx + 1] : null;
                      const sameAsNext = next && next.sender_id === msg.sender_id && (new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() < 5 * 60 * 1000);
                      const sameAsPrev = prev && prev.sender_id === msg.sender_id && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000);
                      const showTail = !sameAsNext;
                      const showAvatar = !isMine && !sameAsNext;
                      return (
                        <div key={msg.id} className={msg.pending ? "opacity-70" : ""}>
                          {showDateHeader && (
                            <div className="flex justify-center my-3">
                              <span className="text-[10px] text-muted-foreground bg-muted/60 px-3 py-0.5 rounded-full">{getDateLabel(msg.created_at)}</span>
                            </div>
                          )}
                          {!sameAsPrev && !isMine && (
                            <div className="text-[10px] text-muted-foreground ml-10 mb-0.5">{selectedContact?.name}</div>
                          )}
                          <MessageBubble
                            msg={msg}
                            isMine={isMine}
                            myId={session.contactId}
                            otherName={selectedContact?.name || ""}
                            showTail={showTail}
                            showAvatar={showAvatar}
                            avatarUrl={selectedContact?.photo_url || null}
                            onOpenActions={(m, rect, el) => { setActionMessage(m); setActionAnchor(rect); setActionAnchorEl(el ?? null); }}
                            onQuickReact={(m, e) => handleReact(m, e)}
                            onStartReply={(m) => handleStartReply(m)}
                            onShowEditHistory={(m) => handleShowEditHistory(m)}
                            onJumpToReply={jumpToMessage}
                            isDelivered={!!msg.delivered_at || !!msg.is_read}
                            showReceipt={isMine && (showTail || msg.id === lastMineId)}
                            highlightQuery={searchQuery}
                            highlight={msg.id === highlightedMsgId}
                          />
                        </div>
                      );
                    });
                  })()}
                  <div className="h-0" />
                </div>
                <JumpToLatest
                  show={newBelowCount > 0}
                  count={newBelowCount}
                  onClick={() => scrollToBottom(true)}
                  className="bottom-3"
                />
              </div>

              {isOtherTyping && (
                <div className="px-4 pb-1">
                  <TypingIndicator />
                </div>
              )}

              {/* Edit/Reply bar */}
              {(editingMsg || replyingTo) && (
                <div className="px-4 pt-2">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-xs">
                    {editingMsg && (
                      <>
                        <Pencil className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate flex-1">এডিট করছেন: {editingMsg.content}</span>
                      </>
                    )}
                    {replyingTo && (
                      <>
                        <Reply className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate flex-1">রিপ্লাই: {replyingTo.content || "ছবি"}</span>
                      </>
                    )}
                    <button onClick={() => { setEditingMsg(null); setReplyingTo(null); setMsgInput(""); }} className="shrink-0">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}

              {(sending || isOffline || queuedCount > 0) && (
                <div className="px-4 pt-1.5">
                  <div className={`flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/60 px-3 py-1.5 text-[11px] ${statusTone}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : isOffline ? <WifiOff className="h-3.5 w-3.5 shrink-0" /> : <Clock3 className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{statusLabel}</span>
                    </div>
                    {queuedCount > 0 && (
                      <span className="rounded-full bg-card px-2 py-0.5 text-foreground shrink-0">
                        {queuedCount}টি pending
                      </span>
                    )}
                  </div>
                </div>
              )}

              <FailedMessagesList
                items={failedMessages}
                onResend={handleResendFailed}
                onDelete={handleDeleteFailed}
              />




              <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm py-2 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
                <div className="flex items-end gap-1.5 sm:gap-2 w-full">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <div className="flex items-center shrink-0">
                    <EmojiPicker inputRef={inputRef} onSelect={(emoji) => setMsgInput(prev => prev + emoji)} />
                    <Button
                      variant="ghost" size="icon"
                      className="h-9 w-9"
                      aria-label="ছবি পাঠান"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                    </Button>
                  </div>
                  <AutoResizeTextarea
                    ref={inputRef}
                    placeholder={editingMsg ? "এডিট করুন..." : "মেসেজ লিখুন..."}
                    value={msgInput}
                    onChange={(e) => { setMsgInput(e.target.value); emitTyping(); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !isTouch) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    className="flex-1 min-w-0"
                    maxHeight={120}
                  />
                  <Button
                    type="button"
                    tabIndex={-1}
                    variant="hero" size="icon"
                    className="h-9 w-9 shrink-0 rounded-full"
                    aria-label="মেসেজ পাঠান"
                    onMouseDown={(e) => { e.preventDefault(); restoreInputFocus(true); }}
                    onTouchStart={(e) => { e.preventDefault(); restoreInputFocus(true); }}
                    onPointerDown={(e) => { e.preventDefault(); restoreInputFocus(true); if (!sending) void handleSend(); }}
                    onClick={(e) => e.preventDefault()}
                    disabled={!msgInput.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AlertDialog open={!!unsendTargetId} onOpenChange={(open) => !open && setUnsendTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>সবার জন্য আনসেন্ড?</AlertDialogTitle>
            <AlertDialogDescription>এই মেসেজটি দুজনের চ্যাট থেকেই মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsendMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">আনসেন্ড করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MessageActionSheet
        open={!!actionMessage}
        message={actionMessage}
        isMine={actionMessage?.sender_id === session.contactId}
        anchorRect={actionAnchor}
        anchorEl={actionAnchorEl}
        onOpenChange={(open) => { if (!open) { setActionMessage(null); setActionAnchor(null); setActionAnchorEl(null); } }}
        onReact={(emoji) => actionMessage && handleReact(actionMessage, emoji)}
        onReply={() => actionMessage && handleStartReply(actionMessage)}
        onEdit={() => actionMessage && handleStartEdit(actionMessage)}
        onUnsend={() => actionMessage && setUnsendTargetId(actionMessage.id)}
        onRemoveForMe={() => actionMessage && handleRemoveForMe(actionMessage)}
        onShowEditHistory={() => actionMessage && handleShowEditHistory(actionMessage)}
      />

      <EditHistoryDialog
        open={!!editHistoryFor}
        onOpenChange={(open) => !open && setEditHistoryFor(null)}
        history={editHistory}
        currentContent={editHistoryFor?.content || null}
        loading={editHistoryLoading}
      />

      <NotificationPreferencesDialog open={notifPrefsOpen} onOpenChange={setNotifPrefsOpen} />
    </div>

  );
};

export default Chat;
