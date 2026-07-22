import { useCallback, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import {
  sendMessage, editMessage, reactToMessage, unsendMessage,
  removeMessageForMe, getMessageEditHistory, uploadChatImage,
  clearChatSession, type ChatSession,
} from "@/lib/chatSession";
import {
  enqueueOfflineMessage, getOfflineQueueCountForContact,
} from "@/lib/offlineChatQueue";
import type { FailedChatMessage } from "@/components/chat/FailedMessagesList";

export type ChatMessage = {
  id: string; sender_id: string; receiver_id: string; content: string | null;
  image_url: string | null; is_read: boolean; created_at: string;
  delivered_at?: string | null; read_at?: string | null;
  edited_at?: string | null; original_content?: string | null;
  reply_to_id?: string | null; reply_content?: string | null; reply_sender_id?: string | null;
  is_pinned?: boolean; unsent_at?: string | null; has_edit_history?: boolean;
  reactions?: { emoji: string; reactor_id: string }[]; pending?: boolean;
};

type ChatContact = { id: string; name: string; phone: string; photo_url: string | null };

type Params = {
  session: ChatSession | null;
  selectedContact: ChatContact | null;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  loadMessages: (contact: ChatContact, opts?: { silent?: boolean }) => Promise<void> | void;
  restoreInputFocus: (force?: boolean) => void;
  setQueuedCount: (n: number) => void;
  onSessionExpired: () => void;
  inputRef: RefObject<HTMLTextAreaElement>;
};

async function sendWithRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (err: any) {
      lastErr = err;
      if (err?.message?.includes("Invalid session")) throw err;
      if (typeof navigator !== "undefined" && !navigator.onLine) throw err;
      if (i < tries - 1) await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

export function useChatActions({
  session, selectedContact, setMessages, loadMessages,
  restoreInputFocus, setQueuedCount, onSessionExpired, inputRef,
}: Params) {
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [failedMessages, setFailedMessages] = useState<FailedChatMessage[]>([]);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [actionAnchor, setActionAnchor] = useState<DOMRect | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);
  const [unsendTargetId, setUnsendTargetId] = useState<string | null>(null);
  const [editHistoryFor, setEditHistoryFor] = useState<ChatMessage | null>(null);
  const [editHistory, setEditHistory] = useState<{ previous_content: string; edited_at: string }[]>([]);
  const [editHistoryLoading, setEditHistoryLoading] = useState(false);
  const recentSendAtRef = useRef(0);

  const handleExpired = useCallback(() => {
    clearChatSession();
    onSessionExpired();
    toast.error("সেশন শেষ হয়ে গেছে। আবার লগইন করুন।");
  }, [onSessionExpired]);

  const handleSend = useCallback(async () => {
    if (sending || !session || !selectedContact) return;
    const text = msgInput.trim();
    if (!text) { restoreInputFocus(true); return; }

    if (editingMsg) {
      recentSendAtRef.current = Date.now();
      setSending(true);
      setMsgInput("");
      try {
        await editMessage(session.token, editingMsg.id, text);
        setMessages(prev => prev.map(m => m.id === editingMsg.id
          ? { ...m, content: text, edited_at: new Date().toISOString(), original_content: m.original_content || m.content }
          : m));
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
        token: session.token, receiverId: selectedContact.id,
        content: text, imageUrl: null, replyToId: replyingTo?.id || null,
      });
      setQueuedCount(getOfflineQueueCountForContact(selectedContact.id));
      setReplyingTo(null);
      setSending(false);
      restoreInputFocus(true);
      toast.success("ইন্টারনেট এলে মেসেজ অটো পাঠানো হবে");
      return;
    }

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const optimistic: ChatMessage = {
      id: tempId, sender_id: session.contactId, receiver_id: selectedContact.id,
      content: text, image_url: null, is_read: false, created_at: nowIso,
      delivered_at: null, read_at: null,
      reply_to_id: replyingTo?.id || null,
      reply_content: replyingTo?.content || null,
      reply_sender_id: replyingTo?.sender_id || null,
      reactions: [], pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    const replyIdSnapshot = replyingTo?.id || undefined;
    setReplyingTo(null);

    try {
      const realId = await sendWithRetry(() =>
        sendMessage(session.token, selectedContact.id, text, undefined, replyIdSnapshot)
      );
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, id: (realId as string) || m.id, pending: false } : m
      ));
    } catch (err: any) {
      if (err?.message?.includes("Invalid session")) {
        handleExpired();
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        const failed: FailedChatMessage = {
          id: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          content: text, imageUrl: null,
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
  }, [sending, session, selectedContact, msgInput, editingMsg, replyingTo, setMessages, setQueuedCount, restoreInputFocus, handleExpired]);

  const handleResendFailed = useCallback(async (failedId: string) => {
    if (!session || !selectedContact) return;
    const item = failedMessages.find(f => f.id === failedId);
    if (!item) return;
    setFailedMessages(prev => prev.map(f => f.id === failedId ? { ...f, retrying: true } : f));
    try {
      await sendWithRetry(() => sendMessage(
        session.token, selectedContact.id,
        item.content || undefined, item.imageUrl || undefined, item.replyToId || undefined,
      ));
      setFailedMessages(prev => prev.filter(f => f.id !== failedId));
      toast.success("মেসেজ পাঠানো হয়েছে");
    } catch (err: any) {
      setFailedMessages(prev => prev.map(f => f.id === failedId ? { ...f, retrying: false } : f));
      if (err?.message?.includes("Invalid session")) handleExpired();
      else toast.error("এখনো পাঠানো যাচ্ছে না");
    }
  }, [session, selectedContact, failedMessages, handleExpired]);

  const handleDeleteFailed = useCallback((failedId: string) => {
    setFailedMessages(prev => prev.filter(f => f.id !== failedId));
  }, []);

  const handleUnsendMessage = useCallback(async () => {
    if (!session || !unsendTargetId) return;
    try {
      await unsendMessage(session.token, unsendTargetId);
      setMessages(prev => prev.map(m => m.id === unsendTargetId
        ? { ...m, content: null, image_url: null, unsent_at: new Date().toISOString() } : m));
      toast.success("মেসেজ আনসেন্ড করা হয়েছে");
    } catch (err) {
      console.error("[catch]", err);
      toast.error("আনসেন্ড করতে সমস্যা");
    } finally {
      setUnsendTargetId(null);
    }
  }, [session, unsendTargetId, setMessages]);

  const handleRemoveForMe = useCallback(async (msg: ChatMessage) => {
    if (!session) return;
    try {
      await removeMessageForMe(session.token, msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      toast.success("আপনার চ্যাট থেকে সরানো হয়েছে");
    } catch (err) {
      console.error("[catch]", err);
      toast.error("সরাতে সমস্যা");
    }
  }, [session, setMessages]);

  const handleReact = useCallback(async (msg: ChatMessage, emoji: string) => {
    if (!session) return;
    setMessages(prev => prev.map(m => {
      if (m.id !== msg.id) return m;
      const reactions = m.reactions || [];
      const mine = reactions.find(r => r.reactor_id === session.contactId);
      let next = reactions.filter(r => r.reactor_id !== session.contactId);
      if (!mine || mine.emoji !== emoji) next = [...next, { emoji, reactor_id: session.contactId }];
      return { ...m, reactions: next };
    }));
    try {
      await reactToMessage(session.token, msg.id, emoji);
    } catch (err) {
      console.error("[catch]", err);
      toast.error("রিয়্যাকশনে সমস্যা");
      if (selectedContact) void loadMessages(selectedContact);
    }
  }, [session, selectedContact, setMessages, loadMessages]);

  const handleShowEditHistory = useCallback(async (msg: ChatMessage) => {
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
  }, [session]);

  const handleStartEdit = useCallback((msg: ChatMessage) => {
    setEditingMsg(msg);
    setMsgInput(msg.content || "");
    setReplyingTo(null);
    inputRef.current?.focus();
  }, [inputRef]);

  const handleStartReply = useCallback((msg: ChatMessage) => {
    setReplyingTo(msg);
    setEditingMsg(null);
    setMsgInput("");
    inputRef.current?.focus();
  }, [inputRef]);

  const handleImagePick = useCallback(async (file: File) => {
    if (!session || !selectedContact) return;
    if (!file.type.startsWith("image/")) { toast.error("শুধুমাত্র ছবি পাঠানো যাবে"); return; }
    setUploading(true);
    try {
      const url = await uploadChatImage(file, session.token);
      try {
        await sendMessage(session.token, selectedContact.id, undefined, url, replyingTo?.id);
        setReplyingTo(null);
      } catch {
        const failed: FailedChatMessage = {
          id: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          content: null, imageUrl: url,
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
    }
  }, [session, selectedContact, replyingTo]);

  const openMessageActions = useCallback((m: ChatMessage, rect: DOMRect | null, el?: HTMLElement | null) => {
    setActionMessage(m);
    setActionAnchor(rect);
    setActionAnchorEl(el ?? null);
  }, []);

  const closeMessageActions = useCallback(() => {
    setActionMessage(null);
    setActionAnchor(null);
    setActionAnchorEl(null);
  }, []);

  const cancelEditReply = useCallback(() => {
    setEditingMsg(null);
    setReplyingTo(null);
    setMsgInput("");
  }, []);

  return {
    // composer state
    msgInput, setMsgInput,
    sending, uploading,
    editingMsg, replyingTo,
    // failed queue
    failedMessages, setFailedMessages,
    // action sheet
    actionMessage, actionAnchor, actionAnchorEl,
    openMessageActions, closeMessageActions,
    // unsend dialog
    unsendTargetId, setUnsendTargetId,
    // edit history dialog
    editHistoryFor, setEditHistoryFor,
    editHistory, editHistoryLoading,
    // handlers
    handleSend, handleResendFailed, handleDeleteFailed,
    handleUnsendMessage, handleRemoveForMe, handleReact,
    handleShowEditHistory, handleStartEdit, handleStartReply,
    handleImagePick, cancelEditReply,
    // refs
    recentSendAtRef,
  };
}
