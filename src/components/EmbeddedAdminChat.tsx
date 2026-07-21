import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowLeft, Send, Image as ImageIcon, Heart, Loader2, Settings, Pencil, Reply, Search, X, Settings2, Bell, ArrowDownToLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationPreferencesDialog } from "@/components/chat/NotificationPreferencesDialog";
import { Input } from "@/components/ui/input";
import { AutoResizeTextarea } from "@/components/chat/AutoResizeTextarea";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { uploadChatImage, signMessagesImages } from "@/lib/chatSession";
import { notifyNewMessage } from "@/lib/notificationPrefs";
import { toast } from "sonner";
import { EmojiPicker } from "@/components/EmojiPicker";
import { logAdminActivity } from "@/lib/adminLog";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageActionSheet } from "@/components/chat/MessageActionSheet";
import { EditHistoryDialog } from "@/components/chat/EditHistoryDialog";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ChatUserListSkeleton } from "@/components/skeletons/LoadingSkeletons";
import { ChatMessagesSkeleton } from "@/components/chat/ChatMessagesSkeleton";
import { FailedMessagesList, type FailedChatMessage } from "@/components/chat/FailedMessagesList";
import { upsertMessage, reconcileMessages } from "@/lib/chatMessageUtils";
import { useSmartAutoScroll } from "@/hooks/useSmartAutoScroll";
import { JumpToLatest } from "@/components/chat/JumpToLatest";
import { useVisualViewportHeight } from "@/hooks/useVisualViewportHeight";
import { useIsMobile } from "@/hooks/use-mobile";

type ChatUser = { id: string; name: string; phone: string; photo_url: string | null; last_message_at: string | null };
type Message = {
  id: string; sender_id: string; receiver_id: string; content: string | null;
  image_url: string | null; is_read: boolean; created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;

  deleted_by_sender?: boolean; edited_at?: string | null; original_content?: string | null;
  reply_to_id?: string | null; reply_content?: string | null; reply_sender_id?: string | null;
  is_pinned?: boolean;
  unsent_at?: string | null;
  has_edit_history?: boolean;
  reactions?: { emoji: string; reactor_id: string }[];
};

interface EmbeddedAdminChatProps {
  onUnreadChange?: (count: number) => void;
  onActiveChatChange?: (open: boolean) => void;
  /** When true, the shell fills its parent height (parent must be flex/grid with a definite height). */
  fillHeight?: boolean;
}

export function EmbeddedAdminChat({ onUnreadChange, onActiveChatChange, fillHeight }: EmbeddedAdminChatProps) {

  const isTouch = useIsTouchDevice();
  const isMobile = useIsMobile();
  const viewportHeight = useVisualViewportHeight();
  const shellRef = useRef<HTMLDivElement>(null);
  const selectedUserRef = useRef<ChatUser | null>(null);
  const isTouchRef = useRef(isTouch);
  useEffect(() => { isTouchRef.current = isTouch; }, [isTouch]);
  const [shellTop, setShellTop] = useState(0);
  const [visualViewportOffsetTop, setVisualViewportOffsetTop] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setVisualViewportOffsetTop(window.visualViewport?.offsetTop ?? 0);
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      const el = shellRef.current;
      if (!el) return;
      // When a chat thread is open the dashboard enters immersive mode
      // (header + tabs hidden), so the shell should own the full viewport.
      if (selectedUserRef.current) {
        setShellTop(0);
        return;
      }
      const rect = el.getBoundingClientRect();
      // Ignore stale zero-height measurements from hidden TabsContent —
      // otherwise the shell overflows the viewport and hides the input.
      if (rect.height === 0 && rect.top === 0) return;
      setShellTop(Math.max(0, rect.top));
    };

    measure();
    // Re-measure across a few animation frames so we catch the moment the
    // Radix TabsContent flips from hidden -> visible.
    const rafIds: number[] = [];
    const scheduleRaf = () => {
      const id = requestAnimationFrame(() => {
        measure();
        if (rafIds.length < 6) scheduleRaf();
      });
      rafIds.push(id);
    };
    scheduleRaf();
    const timeouts = [50, 200, 500].map((ms) => window.setTimeout(measure, ms));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && shellRef.current) {
      ro = new ResizeObserver(() => measure());
      ro.observe(shellRef.current);
      if (document.body) ro.observe(document.body);
    }
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && shellRef.current) {
      io = new IntersectionObserver((entries) => {
        measure();
        // When the chat shell becomes visible (e.g. after switching Tabs),
        // auto-focus the input and pin scroll to the latest message.
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            if (selectedUserRef.current && !isTouchRef.current) {
              restoreInputFocus(true);
            }
            requestAnimationFrame(() => {
              const list = messageListRef.current;
              if (list) list.scrollTop = list.scrollHeight;
            });
          }
        }
      }, { threshold: [0, 0.1] });
      io.observe(shellRef.current);
    }
    return () => {
      rafIds.forEach((id) => cancelAnimationFrame(id));
      timeouts.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      ro?.disconnect();
      io?.disconnect();
    };
  }, [viewportHeight, isMobile]);
  const [adminContactId, setAdminContactId] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [presenceMap, setPresenceMap] = useState<Record<string, { lastSeen: string; isOnline: boolean }>>({});
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failedMessages, setFailedMessages] = useState<FailedChatMessage[]>([]);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [actionAnchor, setActionAnchor] = useState<DOMRect | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);
  const [unsendTargetId, setUnsendTargetId] = useState<string | null>(null);
  const [notifPrefsOpen, setNotifPrefsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editHistoryFor, setEditHistoryFor] = useState<Message | null>(null);
  const [editHistory, setEditHistory] = useState<{ previous_content: string; edited_at: string }[]>([]);
  const [editHistoryLoading, setEditHistoryLoading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef(0);
  const recentSendAtRef = useRef(0);
  const messageListRef = useRef<HTMLDivElement>(null);
  const pendingInitialScrollRef = useRef(false);
  const msgUpdateTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Per-chat draft persistence (survives tab switch + refresh)
  const DRAFTS_STORAGE_KEY = "admin-chat-drafts-v1";
  const draftsRef = useRef<Record<string, string>>({});
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFTS_STORAGE_KEY);
      if (raw) draftsRef.current = JSON.parse(raw) || {};
    } catch {}
  }, []);
  const persistDrafts = useCallback(() => {
    try { sessionStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(draftsRef.current)); } catch {}
  }, []);


  const restoreInputFocus = useCallback((force = false) => {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      if (force || document.activeElement !== input) {
        input.focus({ preventScroll: true });
      }
    });
  }, []);

  const forceScrollToLatest = useCallback((smooth = false) => {
    const run = () => {
      const list = messageListRef.current;
      if (!list) return;
      const top = Math.max(0, list.scrollHeight - list.clientHeight);
      list.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
    };

    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
    [80, 180, 360, 700, 1200].forEach((ms) => window.setTimeout(run, ms));
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.rpc("get_admin_contact_id");
      if (data) {
        setAdminContactId(data);
        setNeedsSetup(false);
      } else {
        setNeedsSetup(true);
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!adminContactId) return;
    loadChatUsers();
    loadUnread();
    const sendHeartbeat = async () => { try { await supabase.rpc("update_admin_presence"); } catch {} };
    sendHeartbeat();
    const heartbeat = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(heartbeat);
  }, [adminContactId]);

  // Live presence: poll periodically AND subscribe to user_presence realtime updates
  useEffect(() => {
    if (!adminContactId || chatUsers.length === 0) return;
    let stopped = false;
    const ids = chatUsers.map(u => u.id);
    const refresh = async () => {
      try {
        const { data } = await supabase.rpc("get_user_presence", { p_contact_ids: ids });
        if (stopped || !data) return;
        const map: Record<string, { lastSeen: string; isOnline: boolean }> = {};
        (data as any[]).forEach((p) => { map[p.contact_id] = { lastSeen: p.last_seen_at, isOnline: p.is_online }; });
        setPresenceMap(map);
      } catch {}
    };
    refresh();
    const poll = setInterval(refresh, 15000);
    const idSet = new Set(ids);
    const channel = supabase
      .channel(`presence-embed-${adminContactId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        const row: any = payload.new || payload.old;
        if (!row || !idSet.has(row.contact_id)) return;
        setPresenceMap(prev => ({
          ...prev,
          [row.contact_id]: { lastSeen: row.last_seen_at, isOnline: !!row.is_online },
        }));
      })
      .subscribe();
    return () => { stopped = true; clearInterval(poll); supabase.removeChannel(channel); };
  }, [adminContactId, chatUsers]);


  useEffect(() => {
    if (!adminContactId) return;
    const channel = supabase
      .channel("admin-chat-embedded")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;

        if (msg.receiver_id === adminContactId && msg.sender_id !== adminContactId) {
          notifyNewMessage();
        }


        const isCurrentThread = !!selectedUser && (
          (msg.sender_id === selectedUser.id && msg.receiver_id === adminContactId) ||
          (msg.sender_id === adminContactId && msg.receiver_id === selectedUser.id)
        );

        if (isCurrentThread) {
          if (msg.sender_id === selectedUser!.id) {
            // Inbound from the user we're viewing — refetch so the server marks it read
            // and broadcasts a `read` event back to the sender for live seen updates.
            void loadMessages(selectedUser!);
          } else if (msg.image_url) {
            void signMessagesImages([msg]).then(([signed]) => {
              setMessages((prev) => upsertMessage(prev, signed));
            });
          } else {
            setMessages((prev) => upsertMessage(prev, msg));
          }
          return;
        }

        if (msg.receiver_id === adminContactId && msg.sender_id !== selectedUser?.id) {
          setUnreadMap(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
        }

        if (msg.sender_id === adminContactId || msg.receiver_id === adminContactId) {
          void loadChatUsers();
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (msgUpdateTimerRef.current) { clearTimeout(msgUpdateTimerRef.current); msgUpdateTimerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminContactId, selectedUser]);

  // Per-thread broadcast: receive delivered/read/edit/unsend/reaction updates
  // published by RPCs via realtime.send to `msg:<a>:<b>`.
  useEffect(() => {
    if (!adminContactId || !selectedUser) return;
    const sortedIds = [adminContactId, selectedUser.id].sort();
    const topic = `msg:${sortedIds[0]}:${sortedIds[1]}`;
    let timer: number | null = null;
    const channel = supabase
      .channel(topic, { config: { private: false } })
      .on("broadcast", { event: "msg_update" }, () => {
        if (timer) return;
        timer = window.setTimeout(() => {
          timer = null;
          const fn = loadMessagesRef.current;
          if (fn && selectedUserRef.current) void fn(selectedUserRef.current);
        }, 200);
      })
      .subscribe();
    return () => {
      if (timer) { clearTimeout(timer); timer = null; }
      supabase.removeChannel(channel);
    };
  }, [adminContactId, selectedUser]);

  useEffect(() => {
    if (!adminContactId || !selectedUser) { setIsOtherTyping(false); typingChannelRef.current = null; return; }
    const channelName = `typing:${[adminContactId, selectedUser.id].sort().join(":")}`;
    const channel = supabase.channel(channelName)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.sender_id === selectedUser.id) {
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
  }, [adminContactId, selectedUser]);

  const emitTyping = () => {
    if (!adminContactId || !selectedUser) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;
    const channel = typingChannelRef.current;
    if (!channel) return;
    void channel.send({ type: "broadcast", event: "typing", payload: { sender_id: adminContactId } });
  };

  const { newBelowCount, scrollToBottom, resetForNewThread } = useSmartAutoScroll(
    messageListRef,
    messages,
    adminContactId,
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

  useEffect(() => {
    if (!selectedUser || messagesLoading || messages.length === 0 || !pendingInitialScrollRef.current) return;
    pendingInitialScrollRef.current = false;
    forceScrollToLatest(false);
  }, [selectedUser, messagesLoading, messages.length, forceScrollToLatest]);


  useEffect(() => {
    const total = Object.values(unreadMap).reduce((a, b) => a + b, 0);
    onUnreadChange?.(total);
  }, [unreadMap, onUnreadChange]);

  useEffect(() => {
    onActiveChatChange?.(!!selectedUser);
    // When a chat opens/closes the dashboard toggles immersive mode.
    // Reset shellTop so the shell height recalculates against the new layout.
    if (selectedUser) setShellTop(0);
  }, [selectedUser, onActiveChatChange]);


  useEffect(() => {
    if (!isMobile || !selectedUser) return;
    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [isMobile, selectedUser]);

  const loadChatUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_admin_chat_users");
      if (error) throw error;
      const users = (data || []) as ChatUser[];
      setChatUsers(users);
      if (users.length > 0) {
        const ids = users.map(u => u.id);
        const { data: pData } = await supabase.rpc("get_user_presence", { p_contact_ids: ids });
        if (pData) {
          const pMap: Record<string, { lastSeen: string; isOnline: boolean }> = {};
          (pData as any[]).forEach((p: any) => { pMap[p.contact_id] = { lastSeen: p.last_seen_at, isOnline: p.is_online }; });
          setPresenceMap(pMap);
        }
      }
    } catch { toast.error("চ্যাট ইউজার লোড করতে সমস্যা"); }
  };

  const loadUnread = async () => {
    try {
      const { data, error } = await supabase.rpc("get_admin_unread_counts");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((d: any) => { map[d.sender_id] = d.unread_count; });
      setUnreadMap(map);
    } catch {}
  };

  const loadMessages = useCallback(async (user: ChatUser) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_messages", { p_other_id: user.id });
      if (error) throw error;
      const signed = await signMessagesImages((data || []) as unknown as Message[]).catch(() => (data || []) as unknown as Message[]);
      setMessages(reconcileMessages(signed));
      setUnreadMap(prev => { const n = { ...prev }; delete n[user.id]; return n; });
      void (async () => {
        try { await supabase.rpc("mark_conversation_read_admin" as any, { p_other_id: user.id } as any); } catch {}
        try { await supabase.rpc("mark_conversation_delivered_admin", { p_other_id: user.id } as any); } catch {}
        loadUnread();
      })();
    } catch { toast.error("মেসেজ লোড করতে সমস্যা"); }
    finally { setMessagesLoading(false); }
  }, []);
  const loadMessagesRef = useRef(loadMessages);
  useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);


  const handleSelectUser = (user: ChatUser) => {
    // Save current draft for the previous chat before switching
    const prev = selectedUserRef.current;
    if (prev && !editingMsg) {
      const t = msgInput;
      if (t && t.length > 0) draftsRef.current[prev.id] = t;
      else delete draftsRef.current[prev.id];
      persistDrafts();
    }
    setSelectedUser(user);
    selectedUserRef.current = user;
    setFailedMessages([]);
    setMessages([]);
    pendingInitialScrollRef.current = true;
    setEditingMsg(null);
    setReplyingTo(null);
    setMsgInput(draftsRef.current[user.id] || "");
    resetForNewThread();
    loadMessages(user);
    forceScrollToLatest(false);
    if (!isTouch) restoreInputFocus(true);
  };

  // Persist draft as the admin types (skip while editing an existing message)
  useEffect(() => {
    const user = selectedUserRef.current;
    if (!user || editingMsg) return;
    if (msgInput && msgInput.length > 0) draftsRef.current[user.id] = msgInput;
    else delete draftsRef.current[user.id];
    persistDrafts();
  }, [msgInput, editingMsg, persistDrafts]);


  // Consistency check: resync current thread on tab focus / online.
  useEffect(() => {
    if (!selectedUser) return;
    const resync = () => {
      if (document.visibilityState === "visible") void loadMessages(selectedUser);
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("online", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("online", resync);
    };
  }, [selectedUser, loadMessages]);

  const handleSetup = async () => {
    if (!setupName.trim()) { toast.error("নাম দিন"); return; }
    setSetupLoading(true);
    try {
      const { data, error } = await supabase.rpc("setup_admin_contact", { p_name: setupName.trim() });
      if (error) throw error;
      setAdminContactId(data);
      setNeedsSetup(false);
      toast.success("অ্যাডমিন চ্যাট সেটআপ হয়েছে! 💬");
    } catch { toast.error("সেটআপ সমস্যা হয়েছে"); }
    finally { setSetupLoading(false); }
  };

  const handleUnsendMessage = async () => {
    if (!unsendTargetId) return;
    try {
      const { error } = await supabase.rpc("unsend_message_admin" as any, { p_message_id: unsendTargetId });
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === unsendTargetId ? { ...m, content: null, image_url: null, unsent_at: new Date().toISOString() } : m));
      toast.success("মেসেজ আনসেন্ড করা হয়েছে");
      logAdminActivity("message_unsend", `মেসেজ আনসেন্ড করা হয়েছে`, unsendTargetId, "message");
    } catch {
      toast.error("আনসেন্ড করতে সমস্যা");
    } finally {
      setUnsendTargetId(null);
    }
  };

  const handleRemoveForMe = async (msg: Message) => {
    try {
      const { error } = await supabase.rpc("remove_message_for_me_admin" as any, { p_message_id: msg.id });
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      toast.success("আপনার চ্যাট থেকে সরানো হয়েছে");
    } catch { toast.error("সরাতে সমস্যা"); }
  };

  const handleReact = async (msg: Message, emoji: string) => {
    if (!adminContactId) return;
    setMessages(prev => prev.map(m => {
      if (m.id !== msg.id) return m;
      const reactions = m.reactions || [];
      const mine = reactions.find(r => r.reactor_id === adminContactId);
      let next = reactions.filter(r => r.reactor_id !== adminContactId);
      if (!mine || mine.emoji !== emoji) {
        next = [...next, { emoji, reactor_id: adminContactId }];
      }
      return { ...m, reactions: next };
    }));
    try {
      const { error } = await supabase.rpc("react_to_message_admin" as any, { p_message_id: msg.id, p_emoji: emoji });
      if (error) throw error;
    } catch {
      toast.error("রিয়্যাকশনে সমস্যা");
      if (selectedUser) void loadMessages(selectedUser);
    }
  };

  const handleShowEditHistory = async (msg: Message) => {
    setEditHistoryFor(msg);
    setEditHistoryLoading(true);
    setEditHistory([]);
    try {
      const { data, error } = await supabase.rpc("get_message_edit_history_admin" as any, { p_message_id: msg.id });
      if (error) throw error;
      setEditHistory((data || []) as any);
    } catch {
      toast.error("ইতিহাস লোড করতে সমস্যা");
    } finally {
      setEditHistoryLoading(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMsg || !msgInput.trim()) return;
    const text = msgInput.trim();
    recentSendAtRef.current = Date.now();
    setSending(true);
    try {
      const { error } = await supabase.rpc("edit_admin_message" as any, { p_message_id: editingMsg.id, p_new_content: text });
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: text, edited_at: new Date().toISOString(), original_content: m.original_content || m.content } : m));
      toast.success("মেসেজ এডিট হয়েছে");
      logAdminActivity("message_edit", `মেসেজ এডিট করা হয়েছে`, editingMsg.id, "message");
      if (selectedUser) {
        await loadMessages(selectedUser);
      }
    } catch {
      toast.error("এডিট করতে সমস্যা");
    } finally {
      setSending(false);
      setEditingMsg(null);
      setMsgInput("");
      restoreInputFocus(true);
    }
  };

  const handleTogglePin = async (msgId: string) => {
    try {
      const { error } = await supabase.rpc("toggle_pin_message" as any, { p_message_id: msgId });
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: !m.is_pinned } : m));
      toast.success("পিন আপডেট হয়েছে");
      logAdminActivity("message_pin", `মেসেজ পিন/আনপিন করা হয়েছে`, msgId, "message");
    } catch {
      toast.error("পিন করতে সমস্যা");
    }
  };

  const handleSend = async () => {
    if (sending) return;
    if (editingMsg) {
      void handleEditMessage();
      return;
    }
    if (!selectedUser) return;

    const text = msgInput.trim();
    if (!text) {
      restoreInputFocus(true);
      return;
    }

    recentSendAtRef.current = Date.now();
    setSending(true);
    setMsgInput("");
    try {
      const { error } = await supabase.rpc("send_admin_message", {
        p_receiver_id: selectedUser.id,
        p_content: text,
        p_reply_to_id: replyingTo?.id || null,
      } as any);
      if (error) throw error;
      setReplyingTo(null);
      await loadMessages(selectedUser);
    } catch {
      const failed: FailedChatMessage = {
        id: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        content: text,
        imageUrl: null,
        replyToId: replyingTo?.id || null,
        replyContent: replyingTo?.content || null,
        createdAt: new Date().toISOString(),
      };
      setFailedMessages(prev => [...prev, failed]);
      setReplyingTo(null);
      toast.error("মেসেজ পাঠাতে সমস্যা — 'আবার পাঠান' চাপুন");
    } finally {
      setSending(false);
      restoreInputFocus(true);
    }
  };

  const handleResendFailed = async (failedId: string) => {
    if (!selectedUser) return;
    const item = failedMessages.find(f => f.id === failedId);
    if (!item) return;
    setFailedMessages(prev => prev.map(f => f.id === failedId ? { ...f, retrying: true } : f));
    try {
      const { error } = await supabase.rpc("send_admin_message", {
        p_receiver_id: selectedUser.id,
        p_content: item.content || undefined,
        p_image_url: item.imageUrl || undefined,
        p_reply_to_id: item.replyToId || null,
      } as any);
      if (error) throw error;
      setFailedMessages(prev => prev.filter(f => f.id !== failedId));
      await loadMessages(selectedUser);
      toast.success("মেসেজ পাঠানো হয়েছে");
    } catch {
      setFailedMessages(prev => prev.map(f => f.id === failedId ? { ...f, retrying: false } : f));
      toast.error("এখনো পাঠানো যাচ্ছে না");
    }
  };

  const handleDeleteFailed = (failedId: string) => {
    setFailedMessages(prev => prev.filter(f => f.id !== failedId));
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
    if (!file || !selectedUser) return;
    if (!file.type.startsWith("image/")) { toast.error("শুধুমাত্র ছবি পাঠানো যাবে"); return; }
    setUploading(true);
    try {
      const url = await uploadChatImage(file);
      try {
        const { error } = await supabase.rpc("send_admin_message", {
          p_receiver_id: selectedUser.id,
          p_image_url: url,
          p_reply_to_id: replyingTo?.id || null,
        } as any);
        if (error) throw error;
        setReplyingTo(null);
        recentSendAtRef.current = Date.now();
        await loadMessages(selectedUser);
        restoreInputFocus(true);
      } catch {
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
    } catch { toast.error("ছবি পাঠাতে সমস্যা"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
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

  const formatLastSeen = (presence: { lastSeen: string; isOnline: boolean } | undefined) => {
    if (!presence) return null;
    if (presence.isOnline) return "এখন অনলাইন";
    const d = new Date(presence.lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "এইমাত্র অ্যাক্টিভ ছিল";
    if (diffMin < 60) return `${diffMin} মিনিট আগে`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ঘণ্টা আগে`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} দিন আগে`;
  };

  const pinnedMessages = messages.filter(m => m.is_pinned);
  const filteredMessages = searchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;
  const mobileThreadMode = isMobile && !!selectedUser;
  const shellHeight = mobileThreadMode
    ? (viewportHeight ? `${viewportHeight}px` : "100dvh")
    : viewportHeight
      ? `${Math.max(320, viewportHeight - shellTop - (shellTop > 0 ? 16 : 0))}px`
      : "calc(100dvh - 220px)";

  if (loading) {
    return (
      <div className="px-2 py-3">
        <ChatUserListSkeleton rows={5} />
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="glass-card p-6 max-w-sm mx-auto">
        <div className="text-center mb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full hero-gradient shadow-rose">
            <Settings className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="text-base font-display font-semibold text-foreground">চ্যাট সেটআপ</h3>
          <p className="text-xs text-muted-foreground mt-1">আপনার নাম দিন যেটা ইউজাররা দেখবে</p>
        </div>
        <div className="space-y-3">
          <Input placeholder="যেমন: অ্যাডমিন" value={setupName} onChange={(e) => setSetupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSetup()} className="bg-card h-9" />
          <Button onClick={handleSetup} variant="hero" className="w-full h-9" disabled={setupLoading}>
            {setupLoading ? "সেটআপ হচ্ছে..." : "সেটআপ করুন"}
          </Button>
        </div>
      </div>
    );
  }

  const renderUsersListContent = () => (
    chatUsers.length === 0 ? (
      <div className="text-center py-16 text-muted-foreground">
        <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">এখনো কেউ মেসেজ করেনি</p>
        <p className="text-xs mt-1">ইউজাররা চ্যাট পেজ থেকে আপনাকে মেসেজ করতে পারবে</p>
      </div>
    ) : (
      <div className="space-y-1 p-1">
        {chatUsers.map((u) => {
          const presence = presenceMap[u.id];
          const lastSeenText = formatLastSeen(presence);
          const isActive = selectedUser?.id === u.id;
          return (
            <button
              key={u.id}
              onClick={() => handleSelectUser(u)}
              className={`w-full flex items-center gap-3 rounded-xl p-3 text-left border transition-colors ${
                isActive
                  ? "bg-[hsl(var(--heirloom-cream)/0.6)] border-[hsl(var(--heirloom-gold)/0.5)]"
                  : "border-transparent hover:bg-card/80 hover:border-border/50"
              }`}
            >
              <div className="relative shrink-0">
                {u.photo_url ? (
                  <img src={u.photo_url} alt={u.name} className="h-10 w-10 rounded-full object-cover border border-primary/20" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{u.name.charAt(0)}</div>
                )}
                {presence?.isOnline && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground text-sm truncate">{u.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {lastSeenText ? (
                    <span className={presence?.isOnline ? "text-green-600" : ""}>{lastSeenText}</span>
                  ) : u.phone}
                </div>
              </div>
              {unreadMap[u.id] && (
                <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full hero-gradient text-primary-foreground text-[10px] font-bold px-1.5">
                  {unreadMap[u.id]}
                </div>
              )}
            </button>
          );
        })}
      </div>
    )
  );

  return (
    <div
      ref={shellRef}
      className={`flex flex-col min-h-0 lg:grid lg:grid-cols-[320px_1fr] lg:gap-4 ${mobileThreadMode ? "fixed inset-x-0 z-[70] bg-[hsl(var(--heirloom-bg))]" : ""}`}
      style={{
        height: shellHeight,
        minHeight: mobileThreadMode ? "0px" : "320px",
        top: mobileThreadMode ? `${visualViewportOffsetTop}px` : undefined,
      }}
    >
      {/* Desktop-only persistent sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:min-h-0 lg:border-r lg:border-[hsl(var(--heirloom-line))] lg:pr-3 lg:overflow-y-auto no-scrollbar">
        <div className="sticky top-0 z-10 bg-[hsl(var(--heirloom-bg))] px-2 pt-2 pb-3 border-b border-[hsl(var(--heirloom-line))]">
          <div className="text-[11px] uppercase tracking-[0.15em] text-[hsl(var(--heirloom-ink-soft))]">চ্যাট</div>
          <div className="text-[13px] text-[hsl(var(--heirloom-ink))] mt-0.5">{chatUsers.length} জন কথোপকথন</div>
        </div>
        {renderUsersListContent()}
      </aside>

      <div className="flex flex-col min-h-0 flex-1 lg:min-h-0">
      <AnimatePresence mode="wait">
        {!selectedUser ? (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto no-scrollbar lg:flex lg:items-center lg:justify-center">
            <div className="lg:hidden">{renderUsersListContent()}</div>
            <div className="hidden lg:flex lg:flex-col lg:items-center lg:text-center lg:gap-3 lg:max-w-sm lg:px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold)/0.4)] bg-[hsl(var(--heirloom-gold)/0.06)]">
                <MessageCircle className="h-7 w-7 text-[hsl(var(--heirloom-gold-deep))]" />
              </div>
              <div className="font-display text-xl text-[hsl(var(--heirloom-ink))]">কথোপকথন বেছে নিন</div>
              <p className="text-sm text-[hsl(var(--heirloom-ink-soft))] leading-relaxed">
                বাম পাশ থেকে যেকোনো ইউজার সিলেক্ট করে চ্যাট শুরু করুন। রিয়েল-টাইম মেসেজ, অনলাইন স্ট্যাটাস ও আনরিড কাউন্ট এখানেই দেখা যাবে।
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="thread" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
            {/* Thread Header */}
            <div className="sticky top-0 z-50 -mx-1 flex items-center gap-2 px-3 py-2.5 border-b border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-bg))] pt-[max(0.625rem,env(safe-area-inset-top))] shadow-[0_8px_18px_-18px_hsl(var(--heirloom-ink)/0.35)]">
              <button
                onClick={() => { setSelectedUser(null); selectedUserRef.current = null; setSearchOpen(false); setSearchQuery(""); }}
                className="lg:hidden flex items-center justify-center h-9 w-9 -ml-1 rounded-full text-foreground hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                aria-label="ফিরে যান"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative shrink-0">
                {selectedUser.photo_url ? (
                  <img src={selectedUser.photo_url} alt={selectedUser.name} className="h-9 w-9 rounded-full object-cover border border-primary/20" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{selectedUser.name.charAt(0)}</div>
                )}
                {presenceMap[selectedUser.id]?.isOnline && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[hsl(var(--heirloom-paper))]" />
                )}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="font-semibold text-sm text-foreground truncate">{selectedUser.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {(() => {
                    const p = presenceMap[selectedUser.id];
                    const txt = formatLastSeen(p);
                    if (!txt) return selectedUser.phone;
                    return <span className={p?.isOnline ? "text-emerald-600" : ""}>{txt}</span>;
                  })()}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" aria-label="মেসেজ খুঁজুন" onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}>
                <Search className="h-4 w-4" />
              </Button>
              <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" aria-label="সেটিংস ও অপশন">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="z-[70] w-52">
                  <DropdownMenuItem onSelect={() => { setSettingsOpen(false); setNotifPrefsOpen(true); }} className="gap-2 text-sm">
                    <Bell className="h-4 w-4" /> নোটিফিকেশন সেটিংস
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => { setSettingsOpen(false); scrollToBottom(true); }}
                    className="gap-2 text-sm"
                  >
                    <ArrowDownToLine className="h-4 w-4" /> সর্বশেষ মেসেজে যান
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => { setSettingsOpen(false); if (selectedUser) void loadMessages(selectedUser); }}
                    className="gap-2 text-sm"
                  >
                    <RefreshCw className="h-4 w-4" /> রিফ্রেশ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>


            {/* Search bar */}
            {searchOpen && (
              <div className="relative z-40 isolate shrink-0 -mx-1 bg-[hsl(var(--heirloom-bg))] px-2 pt-2 pb-2">
                <div className="group relative z-10 flex items-center">
                  <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="মেসেজ খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="h-10 rounded-full border-border/60 bg-[hsl(var(--heirloom-paper))] pl-10 pr-10 text-sm shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                  <button
                    type="button"
                    aria-label="সার্চ বন্ধ করুন"
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                    className="absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {searchQuery && (
                  <p className="text-[10px] text-muted-foreground mt-1 px-2">{filteredMessages.length} টি মেসেজ পাওয়া গেছে</p>
                )}
              </div>
            )}


            {/* Pinned messages */}
            {pinnedMessages.length > 0 && !searchOpen && (
              <div className="pt-2 px-1">
                <div className="bg-accent/50 rounded-lg p-2 border border-border/50">
                  {pinnedMessages.slice(0, 2).map(pm => (
                    <p key={pm.id} className="text-xs text-foreground truncate">📌 {pm.content || "ছবি"}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="relative z-0 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div ref={messageListRef} className={`chat-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-5 pb-3 ${searchOpen ? "pt-5" : "pt-3"} space-y-1`}>
              {messagesLoading && messages.length === 0 && <ChatMessagesSkeleton />}
              {!messagesLoading && filteredMessages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{searchQuery ? "কোনো মেসেজ পাওয়া যায়নি" : "এখনো কোনো মেসেজ নেই"}</p>
                </div>
              )}
              {(() => {
                let lastMineId: string | null = null;
                for (let i = filteredMessages.length - 1; i >= 0; i--) {
                  if (filteredMessages[i].sender_id === adminContactId) { lastMineId = filteredMessages[i].id; break; }
                }
                return filteredMessages.map((msg, idx) => {
                  const isMine = msg.sender_id === adminContactId;
                  const showDateHeader = !searchQuery && shouldShowDateHeader(filteredMessages, idx);
                  const prev = idx > 0 ? filteredMessages[idx - 1] : null;
                  const next = idx < filteredMessages.length - 1 ? filteredMessages[idx + 1] : null;
                  const sameAsNext = next && next.sender_id === msg.sender_id && (new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() < 5 * 60 * 1000);
                  const sameAsPrev = prev && prev.sender_id === msg.sender_id && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000);
                  const showTail = !sameAsNext;
                  const showAvatar = !isMine && !sameAsNext;
                  return (
                    <div key={msg.id}>
                      {showDateHeader && (
                        <div className="flex justify-center my-3">
                          <span className="text-[10px] text-muted-foreground bg-muted/60 px-3 py-0.5 rounded-full">{getDateLabel(msg.created_at)}</span>
                        </div>
                      )}
                      <MessageBubble
                        msg={msg as any}
                        isMine={isMine}
                        myId={adminContactId!}
                        otherName={selectedUser?.name || ""}
                        showTail={!!showTail}
                        showAvatar={!!showAvatar}
                        avatarUrl={selectedUser?.photo_url || null}
                        onOpenActions={(m, rect, el) => { setActionMessage(m as Message); setActionAnchor(rect); setActionAnchorEl(el ?? null); }}
                        onQuickReact={(m, e) => handleReact(m as Message, e)}
                        onStartReply={(m) => handleStartReply(m as Message)}
                        onShowEditHistory={(m) => handleShowEditHistory(m as Message)}
                        onJumpToReply={jumpToMessage}
                        isDelivered={!!msg.delivered_at || !!msg.is_read}
                        showReceipt={isMine && (!!showTail || msg.id === lastMineId)}
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
              <div className="pb-1">
                <TypingIndicator />
              </div>
            )}

            {/* Edit/Reply bar */}
            {(editingMsg || replyingTo) && (
              <div className="pt-2 px-1">
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

            <FailedMessagesList
              items={failedMessages}
              onResend={handleResendFailed}
              onDelete={handleDeleteFailed}
            />

            {/* Input */}
            <div className="pt-2 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <div className="flex items-end gap-1.5 sm:gap-2 w-full">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <EmojiPicker inputRef={inputRef} onSelect={(emoji) => setMsgInput(prev => prev + emoji)} />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="ছবি পাঠান" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                </Button>
                <AutoResizeTextarea
                  ref={inputRef}
                  placeholder={editingMsg ? "এডিট করুন..." : "উত্তর লিখুন..."}
                  value={msgInput}
                  onChange={(e) => { setMsgInput(e.target.value); emitTyping(); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !isTouch) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  className="bg-card flex-1 min-w-0"
                  maxHeight={120}
                />
                <Button
                  type="button"
                  tabIndex={-1}
                  variant="hero"
                  size="icon"
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
        message={actionMessage as any}
        isMine={actionMessage?.sender_id === adminContactId}
        canPin
        anchorRect={actionAnchor}
        anchorEl={actionAnchorEl}
        onOpenChange={(open) => { if (!open) { setActionMessage(null); setActionAnchor(null); setActionAnchorEl(null); } }}
        onReact={(emoji) => actionMessage && handleReact(actionMessage, emoji)}
        onReply={() => actionMessage && handleStartReply(actionMessage)}
        onEdit={() => actionMessage && handleStartEdit(actionMessage)}
        onUnsend={() => actionMessage && setUnsendTargetId(actionMessage.id)}
        onRemoveForMe={() => actionMessage && handleRemoveForMe(actionMessage)}
        onTogglePin={() => actionMessage && handleTogglePin(actionMessage.id)}
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
}
