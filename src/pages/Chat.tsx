import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, ChevronLeft, Loader2, Search, Pin, Settings2, Home, LogOut,
  WifiOff, Clock3, Bell, ArrowDownToLine, RefreshCw, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  getChatSession, getChatContacts,
  getMessages, getUnreadCounts,
  clearChatSession, signMessagesImages,
  type ChatSession,
} from "@/lib/chatSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getOfflineQueueCountForContact } from "@/lib/offlineChatQueue";
import { MessageActionSheet } from "@/components/chat/MessageActionSheet";
import { EditHistoryDialog } from "@/components/chat/EditHistoryDialog";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { NotificationPreferencesDialog } from "@/components/chat/NotificationPreferencesDialog";
import { FailedMessagesList } from "@/components/chat/FailedMessagesList";
import { reconcileMessages } from "@/lib/chatMessageUtils";
import { useSmartAutoScroll } from "@/hooks/useSmartAutoScroll";
import { JumpToLatest } from "@/components/chat/JumpToLatest";
import { useVisualViewportHeight } from "@/hooks/useVisualViewportHeight";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { useChatSessionKeepalive } from "@/hooks/useChatSessionKeepalive";
import { useChatConnectivity } from "@/hooks/useChatConnectivity";
import { useChatPresence } from "@/hooks/useChatPresence";
import { useChatTyping } from "@/hooks/useChatTyping";
import { useChatRealtime } from "@/hooks/useChatRealtime";
import { useOfflineQueueFlusher } from "@/hooks/useOfflineQueueFlusher";
import { useChatActions, type ChatMessage } from "@/hooks/useChatActions";
import { useJumpToMessage } from "@/hooks/useJumpToMessage";
import { ChatContactList } from "@/components/chat/ChatContactList";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { formatLastSeen } from "@/lib/chatFormatters";

type ChatContact = { id: string; name: string; phone: string; photo_url: string | null };
type ContactPreview = { preview: string; time: string | null };

const Chat = () => {
  const navigate = useNavigate();
  const viewportHeight = useVisualViewportHeight();
  const isTouch = useIsTouchDevice();
  useChatSessionKeepalive();

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

  const [session, setSession] = useState<ChatSession | null>(() => getChatSession());
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactPreviews, setContactPreviews] = useState<Record<string, ContactPreview>>({});
  const [notifPrefsOpen, setNotifPrefsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoSelectedRef = useRef(false);

  const { isOffline, queuedCount, setQueuedCount } = useChatConnectivity(selectedContact?.id);
  const presenceMap = useChatPresence(!!session, contacts.map(c => c.id));
  const { isOtherTyping, emitTyping } = useChatTyping(session?.contactId, selectedContact?.id);

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
    if (selectedContact) {
      document.body.setAttribute("data-immersive", "true");
      return () => document.body.removeAttribute("data-immersive");
    }
  }, [selectedContact]);

  const loadMessages = useCallback(async (contact: ChatContact, opts?: { silent?: boolean }) => {
    if (!session) return;
    if (!opts?.silent) setMessagesLoading(true);
    try {
      const raw = await getMessages(session.token, contact.id);
      const data = await signMessagesImages(raw, session.token).catch(() => raw);
      setMessages(prev => {
        const pendings = prev.filter(m => m.pending);
        const survivors = pendings.filter(p => !data.some(d =>
          d.sender_id === p.sender_id &&
          (d.content ?? null) === (p.content ?? null) &&
          (d.image_url ?? null) === (p.image_url ?? null)
        ));
        return reconcileMessages([...(data as ChatMessage[]), ...survivors]);
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
      void (async () => { try { await supabase.rpc("mark_conversation_delivered", { p_token: session.token, p_other_id: contact.id } as any); } catch {} })();
    } catch (err) {
      console.error("[catch]", err);
      toast.error("মেসেজ লোড করতে সমস্যা");
    } finally {
      if (!opts?.silent) setMessagesLoading(false);
    }
  }, [session]);

  const actions = useChatActions({
    session,
    selectedContact,
    setMessages,
    loadMessages,
    restoreInputFocus,
    setQueuedCount,
    onSessionExpired: () => setSession(null),
    inputRef,
  });

  const { highlightedMsgId, jumpToMessage } = useJumpToMessage(messageListRef);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useChatRealtime({
    myContactId: session?.contactId,
    otherContactId: selectedContact?.id,
    onThreadEvent: useCallback(() => {
      if (selectedContact) void loadMessages(selectedContact);
    }, [selectedContact, loadMessages]),
    onIncomingFromOther: useCallback((senderId: string) => {
      setUnreadMap((prev) => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
    }, []),
  });

  const { newBelowCount, scrollToBottom, resetForNewThread } = useSmartAutoScroll(
    messageListRef,
    messages,
    session?.contactId,
  );

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

  useEffect(() => {
    if (Date.now() - actions.recentSendAtRef.current < 1500) restoreInputFocus(true);
  }, [messages, restoreInputFocus, actions.recentSendAtRef]);

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
            return [contact.id, {
              preview: lastMessage?.content || (lastMessage?.image_url ? "ছবি পাঠানো হয়েছে" : "ট্যাপ করে মেসেজ করুন"),
              time: lastMessage?.created_at || null,
            }] as const;
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

  const handleSelectContact = useCallback((contact: ChatContact) => {
    setSelectedContact(contact);
    setQueuedCount(getOfflineQueueCountForContact(contact.id));
    actions.setFailedMessages([]);
    setMessages([]);
    resetForNewThread();
    loadMessages(contact);
  }, [loadMessages, resetForNewThread, setQueuedCount, actions]);

  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (contacts.length === 1 && !selectedContact) {
      autoSelectedRef.current = true;
      handleSelectContact(contacts[0]);
    }
  }, [contacts, selectedContact, handleSelectContact]);

  useOfflineQueueFlusher({
    enabled: !!session,
    selectedContactId: selectedContact?.id,
    onDeliveredForSelected: () => { if (selectedContact) void loadMessages(selectedContact); },
    onQueueCountChanged: setQueuedCount,
  });

  useEffect(() => {
    if (actions.failedMessages.length === 0) return;
    const retryAll = () => {
      if (!navigator.onLine) return;
      actions.failedMessages.forEach(f => { if (!f.retrying) void actions.handleResendFailed(f.id); });
    };
    window.addEventListener("online", retryAll);
    return () => window.removeEventListener("online", retryAll);
  }, [actions.failedMessages, actions]);

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

  const handleLogout = () => {
    clearChatSession();
    setSession(null);
    setSelectedContact(null);
    setMessages([]);
    setContacts([]);
    toast.info("লগআউট হয়েছে");
  };

  const pinnedMessages = messages.filter(m => m.is_pinned);
  const filteredMessages = searchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;
  const statusTone = actions.sending ? "text-primary" : isOffline ? "text-destructive" : queuedCount > 0 ? "text-foreground" : "text-muted-foreground";
  const statusLabel = actions.sending
    ? "মেসেজ পাঠানো হচ্ছে..."
    : isOffline
      ? "নেটওয়ার্ক নেই — মেসেজটা অপেক্ষায় থাকবে"
      : queuedCount > 0
        ? `${queuedCount}টি মেসেজ অপেক্ষায় আছে`
        : "অনলাইন — এখনই মেসেজ যাবে";

  if (!session) return <Navigate to="/verify?next=chat" replace />;

  const singleContact = contacts.length === 1;
  const showBackButton = !!selectedContact && !singleContact;

  return (
    <div className="warm-gradient flex flex-col overflow-hidden fixed inset-0" style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}>
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background shrink-0 pt-[env(safe-area-inset-top)] shadow-[0_8px_18px_-18px_hsl(var(--heirloom-ink)/0.35)]">
        <div className="container mx-auto max-w-5xl flex h-14 items-center justify-between px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-2 min-w-0 flex-1 relative">
            <AnimatePresence mode="wait" initial={false}>
              {selectedContact ? (
                <motion.div
                  key={`hdr-thread-${selectedContact.id}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex items-center gap-2 min-w-0"
                >
                  {showBackButton ? (
                    <button
                      onClick={() => { setSelectedContact(null); setSearchOpen(false); setSearchQuery(""); }}
                      className="text-foreground hover:text-primary transition-colors shrink-0 md:hidden"
                      aria-label="ফিরে যান"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/"); }}
                      className="text-foreground hover:text-primary transition-colors shrink-0"
                      aria-label="পিছনে যান"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
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
                        <p className={`text-xs truncate ${presenceMap[selectedContact.id].is_online ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                          {formatLastSeen(presenceMap[selectedContact.id])}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
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
                    <MessageCircle className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
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
                    <DropdownMenuItem onSelect={() => { setSettingsOpen(false); scrollToBottom(true); }} className="gap-2 text-sm">
                      <ArrowDownToLine className="h-4 w-4" /> সর্বশেষ মেসেজে যান
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setSettingsOpen(false); if (selectedContact) void loadMessages(selectedContact); }} className="gap-2 text-sm">
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

      {/* ============ BODY ============ */}
      <main id="main-content" className="flex-1 min-h-0 overflow-hidden container mx-auto max-w-5xl w-full px-0">
        <div className={`h-full ${singleContact ? "" : "md:grid md:grid-cols-[300px_1fr] md:gap-0"}`}>

          <aside
            className={`h-full min-h-0 overflow-hidden border-r border-border/50 bg-background/50 ${
              selectedContact ? "hidden md:flex md:flex-col" : "flex flex-col"
            } ${singleContact ? "md:hidden" : ""}`}
            aria-label="চ্যাট কন্টাক্ট তালিকা"
          >
            <div className="flex-1 overflow-y-auto chat-scroll">
              <ChatContactList
                contacts={contacts}
                selectedId={selectedContact?.id}
                unreadMap={unreadMap}
                presenceMap={presenceMap}
                contactPreviews={contactPreviews}
                onSelect={handleSelectContact}
              />
            </div>
          </aside>

          <section
            className={`h-full min-h-0 flex flex-col overflow-hidden ${!selectedContact ? "hidden md:flex" : "flex"}`}
            aria-label="চ্যাট থ্রেড"
          >
            {!selectedContact ? (
              <div className="flex-1 flex items-center justify-center text-center px-6 text-muted-foreground">
                <div>
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" aria-hidden="true" />
                  <p className="text-sm">বাম দিকের তালিকা থেকে একজনকে বাছুন</p>
                  <p className="text-xs mt-1">তারপর এখানে মনের কথা লেখা যাবে</p>
                </div>
              </div>
            ) : (
              <>
                {searchOpen && (
                  <div className="relative z-40 isolate shrink-0 px-4 pt-2 pb-2 bg-background">
                    <div className="flex items-center gap-2">
                      <Input placeholder="মেসেজ খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-card h-8 text-sm" autoFocus aria-label="মেসেজে খুঁজুন" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="সার্চ বন্ধ করুন" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {searchQuery && <p className="text-xs text-muted-foreground mt-1" aria-live="polite">{filteredMessages.length} টি মেসেজ পাওয়া গেছে</p>}
                  </div>
                )}

                {pinnedMessages.length > 0 && !searchOpen && (
                  <div className="px-4 pt-2 shrink-0">
                    <div className="bg-accent/50 rounded-lg p-2 border border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Pin className="h-3 w-3" aria-hidden="true" /> পিন করা মেসেজ
                      </div>
                      {pinnedMessages.slice(0, 2).map(pm => (
                        <p key={pm.id} className="text-xs text-foreground truncate">📌 {pm.content || "ছবি"}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative z-0 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <ChatMessageList
                    ref={messageListRef}
                    messages={filteredMessages}
                    loading={messagesLoading}
                    myId={session.contactId}
                    otherName={selectedContact.name}
                    otherPhoto={selectedContact.photo_url}
                    searchQuery={searchQuery}
                    highlightedMsgId={highlightedMsgId}
                    searchOpen={searchOpen}
                    onOpenActions={actions.openMessageActions}
                    onQuickReact={actions.handleReact}
                    onStartReply={actions.handleStartReply}
                    onShowEditHistory={actions.handleShowEditHistory}
                    onJumpToReply={jumpToMessage}
                  />
                  <JumpToLatest
                    show={newBelowCount > 0}
                    count={newBelowCount}
                    onClick={() => scrollToBottom(true)}
                    className="bottom-3"
                  />
                </div>

                {isOtherTyping && (
                  <div className="px-4 pb-1"><TypingIndicator /></div>
                )}

                {(actions.sending || isOffline || queuedCount > 0) && (
                  <div className="px-4 pt-1.5">
                    <div className={`flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/60 px-3 py-1.5 text-xs ${statusTone}`} role="status" aria-live="polite">
                      <div className="flex items-center gap-2 min-w-0">
                        {actions.sending ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" /> : isOffline ? <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                        <span className="truncate">{statusLabel}</span>
                      </div>
                      {queuedCount > 0 && (
                        <span className="rounded-full bg-card px-2 py-0.5 text-foreground shrink-0">{queuedCount}টি অপেক্ষায়</span>
                      )}
                    </div>
                  </div>
                )}

                <FailedMessagesList items={actions.failedMessages} onResend={actions.handleResendFailed} onDelete={actions.handleDeleteFailed} />

                <ChatComposer
                  ref={inputRef}
                  value={actions.msgInput}
                  onChange={actions.setMsgInput}
                  onSend={actions.handleSend}
                  onImagePick={actions.handleImagePick}
                  onCancelEditReply={actions.cancelEditReply}
                  onFocusInput={restoreInputFocus}
                  emitTyping={emitTyping}
                  sending={actions.sending}
                  uploading={actions.uploading}
                  editingMsg={actions.editingMsg}
                  replyingTo={actions.replyingTo}
                  isTouch={isTouch}
                />
              </>
            )}
          </section>
        </div>
      </main>

      <AlertDialog open={!!actions.unsendTargetId} onOpenChange={(open) => !open && actions.setUnsendTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>সবার জন্য আনসেন্ড?</AlertDialogTitle>
            <AlertDialogDescription>এই মেসেজটি দুজনের চ্যাট থেকেই মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={actions.handleUnsendMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">আনসেন্ড করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MessageActionSheet
        open={!!actions.actionMessage}
        message={actions.actionMessage}
        isMine={actions.actionMessage?.sender_id === session.contactId}
        anchorRect={actions.actionAnchor}
        anchorEl={actions.actionAnchorEl}
        onOpenChange={(open) => { if (!open) actions.closeMessageActions(); }}
        onReact={(emoji) => actions.actionMessage && actions.handleReact(actions.actionMessage, emoji)}
        onReply={() => actions.actionMessage && actions.handleStartReply(actions.actionMessage)}
        onEdit={() => actions.actionMessage && actions.handleStartEdit(actions.actionMessage)}
        onUnsend={() => actions.actionMessage && actions.setUnsendTargetId(actions.actionMessage.id)}
        onRemoveForMe={() => actions.actionMessage && actions.handleRemoveForMe(actions.actionMessage)}
        onShowEditHistory={() => actions.actionMessage && actions.handleShowEditHistory(actions.actionMessage)}
      />

      <EditHistoryDialog
        open={!!actions.editHistoryFor}
        onOpenChange={(open) => !open && actions.setEditHistoryFor(null)}
        history={actions.editHistory}
        currentContent={actions.editHistoryFor?.content || null}
        loading={actions.editHistoryLoading}
      />

      <NotificationPreferencesDialog open={notifPrefsOpen} onOpenChange={setNotifPrefsOpen} />
    </div>
  );
};

export default Chat;
