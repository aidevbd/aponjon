import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getChatSession,
  getMessages,
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
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSearchBar } from "@/components/chat/ChatSearchBar";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { PinnedMessagesBar } from "@/components/chat/PinnedMessagesBar";
import { ChatStatusBar } from "@/components/chat/ChatStatusBar";
import { useChatSearch } from "@/hooks/useChatSearch";
import { useChatContacts, type ChatContact } from "@/hooks/useChatContacts";
import { swallow } from "@/lib/devLog";


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
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [notifPrefsOpen, setNotifPrefsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoSelectedRef = useRef(false);

  const onSessionExpired = useCallback(() => setSession(null), []);
  const {
    contacts, unreadMap, contactPreviews,
    loadContacts, loadUnread, clearUnreadFor, bumpUnreadFor, setPreviewFor, resetContacts,
  } = useChatContacts({ session, onSessionExpired });

  const { isOffline, queuedCount, setQueuedCount } = useChatConnectivity(selectedContact?.id);
  const presenceMap = useChatPresence(!!session, contacts.map(c => c.id));

  const { isOtherTyping, emitTyping } = useChatTyping(session?.contactId, selectedContact?.id);
  const { searchOpen, searchQuery, setSearchQuery, toggleSearch, closeSearch, filteredMessages } =
    useChatSearch(messages);

  const restoreInputFocus = useCallback((force = false) => {
    const focusInput = () => {
      const input = inputRef.current;
      if (!input) return;
      if (force || document.activeElement !== input) {
        input.focus({ preventScroll: true });
        const caret = input.value.length;
        try { input.setSelectionRange(caret, caret); } catch (e) { swallow("Chat.focusInput.setSelectionRange", e); }
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
      setPreviewFor(contact.id, {
        preview: lastMessage?.content || (lastMessage?.image_url ? "ছবি পাঠানো হয়েছে" : "এখনো কোনো মেসেজ নেই"),
        time: lastMessage?.created_at || null,
      });
      clearUnreadFor(contact.id);

      void (async () => { try { await supabase.rpc("mark_conversation_delivered", { p_token: session.token, p_other_id: contact.id } as any); } catch (e) { swallow("Chat.mark_conversation_delivered", e); } })();
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
      try { await supabase.rpc("update_presence", { p_token: session.token, p_contact_id: session.contactId } as any); } catch (e) { swallow("Chat.update_presence", e); }
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
      bumpUnreadFor(senderId);
    }, [bumpUnreadFor]),

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
      <ChatHeader
        selectedContact={selectedContact}
        presence={selectedContact ? presenceMap[selectedContact.id] : undefined}
        myName={session.name}
        showBackButton={showBackButton}
        searchOpen={searchOpen}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        onBackToList={() => { setSelectedContact(null); closeSearch(); }}
        onNavigateBack={() => { if (window.history.length > 1) navigate(-1); else navigate("/"); }}
        onToggleSearch={toggleSearch}
        onOpenNotifPrefs={() => setNotifPrefsOpen(true)}
        onScrollToLatest={() => scrollToBottom(true)}
        onRefresh={() => { if (selectedContact) void loadMessages(selectedContact); }}
        onGoHome={() => navigate("/")}
        onLogout={handleLogout}
      />

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
              <ChatEmptyState />
            ) : (
              <>
                {searchOpen && (
                  <ChatSearchBar
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    onClose={closeSearch}
                    resultCount={filteredMessages.length}
                  />
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
