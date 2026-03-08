import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowLeft, Send, Image as ImageIcon, Heart, Loader2, Settings, Trash2, Pencil, Reply, Search, Pin, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { uploadChatImage } from "@/lib/chatSession";
import { toast } from "sonner";
import { EmojiPicker } from "@/components/EmojiPicker";
import { logAdminActivity } from "@/lib/adminLog";

type ChatUser = { id: string; name: string; phone: string; photo_url: string | null; last_message_at: string | null };
type Message = {
  id: string; sender_id: string; receiver_id: string; content: string | null;
  image_url: string | null; is_read: boolean; created_at: string;
  deleted_by_sender?: boolean; edited_at?: string | null; original_content?: string | null;
  reply_to_id?: string | null; reply_content?: string | null; reply_sender_id?: string | null;
  is_pinned?: boolean;
};

interface EmbeddedAdminChatProps {
  onUnreadChange?: (count: number) => void;
}

export function EmbeddedAdminChat({ onUnreadChange }: EmbeddedAdminChatProps) {
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
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewOriginal, setViewOriginal] = useState<string | null>(null);
  const [tappedMsgId, setTappedMsgId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!adminContactId) return;
    const channel = supabase
      .channel("admin-chat-embedded")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (selectedUser && (
          (msg.sender_id === selectedUser.id && msg.receiver_id === adminContactId) ||
          (msg.sender_id === adminContactId && msg.receiver_id === selectedUser.id)
        )) {
          setMessages(prev => [...prev, msg]);
        }
        if (msg.receiver_id === adminContactId && msg.sender_id !== selectedUser?.id) {
          setUnreadMap(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
          loadChatUsers();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [adminContactId, selectedUser]);

  useEffect(() => {
    if (!adminContactId || !selectedUser) { setIsOtherTyping(false); return; }
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
    return () => { supabase.removeChannel(channel); setIsOtherTyping(false); };
  }, [adminContactId, selectedUser]);

  const emitTyping = () => {
    if (!adminContactId || !selectedUser) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;
    const channelName = `typing:${[adminContactId, selectedUser.id].sort().join(":")}`;
    supabase.channel(channelName).send({ type: "broadcast", event: "typing", payload: { sender_id: adminContactId } });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const total = Object.values(unreadMap).reduce((a, b) => a + b, 0);
    onUnreadChange?.(total);
  }, [unreadMap, onUnreadChange]);

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
    try {
      const { data, error } = await supabase.rpc("get_admin_messages", { p_other_id: user.id });
      if (error) throw error;
      setMessages((data || []) as Message[]);
      setUnreadMap(prev => { const n = { ...prev }; delete n[user.id]; return n; });
    } catch { toast.error("মেসেজ লোড করতে সমস্যা"); }
  }, []);

  const handleSelectUser = (user: ChatUser) => {
    setSelectedUser(user);
    loadMessages(user);
  };

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

  const handleDeleteMessage = async () => {
    if (!deleteTargetId) return;
    try {
      const { error } = await supabase.rpc("delete_admin_message", { p_message_id: deleteTargetId });
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== deleteTargetId));
      toast.success("মেসেজ ডিলিট হয়েছে");
      logAdminActivity("message_delete", `মেসেজ ডিলিট করা হয়েছে`, deleteTargetId, "message");
    } catch {
      toast.error("ডিলিট করতে সমস্যা");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMsg || !msgInput.trim()) return;
    const text = msgInput.trim();
    setSending(true);
    try {
      const { error } = await supabase.rpc("edit_admin_message" as any, { p_message_id: editingMsg.id, p_new_content: text });
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: text, edited_at: new Date().toISOString(), original_content: m.original_content || m.content } : m));
      toast.success("মেসেজ এডিট হয়েছে");
      logAdminActivity("message_edit", `মেসেজ এডিট করা হয়েছে`, editingMsg.id, "message");
    } catch {
      toast.error("এডিট করতে সমস্যা");
    } finally {
      setSending(false);
      setEditingMsg(null);
      setMsgInput("");
    }
  };

  const handleTogglePin = async (msgId: string) => {
    try {
      const { error } = await supabase.rpc("toggle_pin_message" as any, { p_message_id: msgId });
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: !m.is_pinned } : m));
      toast.success("পিন আপডেট হয়েছে");
    } catch {
      toast.error("পিন করতে সমস্যা");
    }
  };

  const handleSend = async () => {
    if (editingMsg) {
      handleEditMessage();
      return;
    }
    if (!selectedUser || !msgInput.trim()) return;
    const text = msgInput.trim();
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
    } catch { toast.error("মেসেজ পাঠাতে সমস্যা"); setMsgInput(text); }
    finally { setSending(false); }
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
      const { error } = await supabase.rpc("send_admin_message", {
        p_receiver_id: selectedUser.id,
        p_image_url: url,
        p_reply_to_id: replyingTo?.id || null,
      } as any);
      if (error) throw error;
      setReplyingTo(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Heart className="h-6 w-6 text-primary animate-pulse" />
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

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 140px)", minHeight: "400px" }}>
      <AnimatePresence mode="wait">
        {!selectedUser ? (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
            {chatUsers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">এখনো কেউ মেসেজ করেনি</p>
                <p className="text-xs mt-1">ইউজাররা চ্যাট পেজ থেকে আপনাকে মেসেজ করতে পারবে</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chatUsers.map((u) => {
                  const presence = presenceMap[u.id];
                  const lastSeenText = formatLastSeen(presence);
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-card/80 transition-colors text-left border border-transparent hover:border-border/50"
                    >
                      <div className="relative shrink-0">
                        {u.photo_url ? (
                          <img src={u.photo_url} alt="" className="h-10 w-10 rounded-full object-cover border border-primary/20" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{u.name.charAt(0)}</div>
                        )}
                        {presence?.isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm">{u.name}</div>
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
            )}
          </motion.div>
        ) : (
          <motion.div key="thread" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
            {/* Thread Header */}
            <div className="flex items-center gap-2 pb-3 border-b border-border/50">
              <button onClick={() => { setSelectedUser(null); setSearchOpen(false); setSearchQuery(""); }} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors flex-1 min-w-0">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <div className="relative shrink-0">
                  {selectedUser.photo_url ? (
                    <img src={selectedUser.photo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-primary/20" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{selectedUser.name.charAt(0)}</div>
                  )}
                  {presenceMap[selectedUser.id]?.isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-sm">{selectedUser.name}</span>
                  <div className="text-[10px] text-muted-foreground">
                    {(() => {
                      const p = presenceMap[selectedUser.id];
                      const txt = formatLastSeen(p);
                      if (!txt) return selectedUser.phone;
                      return <span className={p?.isOnline ? "text-green-600" : ""}>{txt}</span>;
                    })()}
                  </div>
                </div>
              </button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Search bar */}
            {searchOpen && (
              <div className="pt-2 px-1">
                <div className="flex items-center gap-2">
                  <Input placeholder="মেসেজ খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-card h-8 text-sm" autoFocus />
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {searchQuery && <p className="text-[10px] text-muted-foreground mt-1">{filteredMessages.length} টি মেসেজ পাওয়া গেছে</p>}
              </div>
            )}

            {/* Pinned messages */}
            {pinnedMessages.length > 0 && !searchOpen && (
              <div className="pt-2 px-1">
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-3 space-y-1">
              {filteredMessages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{searchQuery ? "কোনো মেসেজ পাওয়া যায়নি" : "এখনো কোনো মেসেজ নেই"}</p>
                </div>
              )}
              {filteredMessages.map((msg, idx) => {
                const isMine = msg.sender_id === adminContactId;
                const showDateHeader = !searchQuery && shouldShowDateHeader(filteredMessages, idx);
                return (
                  <div key={msg.id}>
                    {showDateHeader && (
                      <div className="flex justify-center my-3">
                        <span className="text-[10px] text-muted-foreground bg-muted/60 px-3 py-0.5 rounded-full">{getDateLabel(msg.created_at)}</span>
                      </div>
                    )}
                    <div
                      className={`group flex flex-col ${isMine ? "items-end" : "items-start"}`}
                      onClick={() => setTappedMsgId(tappedMsgId === msg.id ? null : msg.id)}
                    >
                      <div className={`flex ${isMine ? "justify-end" : "justify-start"} w-full`}>
                        {isMine && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-1 flex items-center gap-0.5">
                            <button onClick={(e) => { e.stopPropagation(); handleTogglePin(msg.id); }} className="p-1 rounded-full hover:bg-muted" title={msg.is_pinned ? "আনপিন" : "পিন"}>
                              <Pin className={`h-3 w-3 ${msg.is_pinned ? "text-primary" : "text-muted-foreground"}`} />
                            </button>
                            {!msg.deleted_by_sender && (
                              <button onClick={(e) => { e.stopPropagation(); handleStartEdit(msg); }} className="p-1 rounded-full hover:bg-muted" title="এডিট">
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTargetId(msg.id); }} className="p-1 rounded-full hover:bg-destructive/10" title="ডিলিট">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${msg.is_pinned ? "ring-1 ring-primary/30" : ""} ${msg.deleted_by_sender ? "opacity-50 border border-dashed border-destructive/30 bg-destructive/5 rounded-bl-md" : isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border/50 text-foreground rounded-bl-md"}`}>
                          {msg.is_pinned && <p className="text-[9px] mb-0.5 opacity-70">📌 পিন করা</p>}
                          {msg.deleted_by_sender && (
                            <p className="text-[10px] text-destructive font-medium mb-1 flex items-center gap-1"><Trash2 className="h-3 w-3" /> ইউজার ডিলিট করেছে</p>
                          )}
                          {msg.reply_content && (
                            <div className={`text-[10px] mb-1.5 px-2 py-1 rounded-lg border-l-2 ${isMine && !msg.deleted_by_sender ? "bg-primary-foreground/10 border-primary-foreground/30" : "bg-muted border-primary/30"}`}>
                              <span className="font-medium">{msg.reply_sender_id === adminContactId ? "আপনি" : selectedUser?.name}</span>
                              <p className="truncate opacity-80">{msg.reply_content}</p>
                            </div>
                          )}
                          {msg.image_url && (
                            <img src={msg.image_url} alt="" className="rounded-lg max-w-full mb-1.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); window.open(msg.image_url!, "_blank"); }} />
                          )}
                          {msg.content && <p className={`text-sm whitespace-pre-wrap break-words ${msg.deleted_by_sender ? "text-muted-foreground" : ""}`}>{msg.content}</p>}
                          {msg.edited_at && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-[9px] ${isMine && !msg.deleted_by_sender ? "text-primary-foreground/50" : "text-muted-foreground"}`}>এডিটেড</span>
                              {msg.original_content && !isMine && (
                                <button onClick={(e) => { e.stopPropagation(); setViewOriginal(viewOriginal === msg.id ? null : msg.id); }} className="text-[9px] text-primary underline">
                                  {viewOriginal === msg.id ? "বন্ধ করুন" : "আসল দেখুন"}
                                </button>
                              )}
                            </div>
                          )}
                          {viewOriginal === msg.id && msg.original_content && (
                            <div className="mt-1 px-2 py-1 rounded bg-muted/50 border border-border/30">
                              <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1"><Eye className="h-3 w-3" /> আসল মেসেজ:</p>
                              <p className="text-xs text-foreground/70">{msg.original_content}</p>
                            </div>
                          )}
                        </div>
                        {!isMine && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1 flex items-center gap-0.5">
                            <button onClick={(e) => { e.stopPropagation(); handleStartReply(msg); }} className="p-1 rounded-full hover:bg-muted" title="রিপ্লাই">
                              <Reply className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleTogglePin(msg.id); }} className="p-1 rounded-full hover:bg-muted" title={msg.is_pinned ? "আনপিন" : "পিন"}>
                              <Pin className={`h-3 w-3 ${msg.is_pinned ? "text-primary" : "text-muted-foreground"}`} />
                            </button>
                          </div>
                        )}
                        {isMine && (
                          <button onClick={(e) => { e.stopPropagation(); handleStartReply(msg); }} className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-0.5 p-1 rounded-full hover:bg-muted" title="রিপ্লাই">
                            <Reply className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                      {/* Time shown outside bubble on hover/tap */}
                      <div className={`flex items-center gap-1 mt-0.5 px-2 transition-all duration-200 ${tappedMsgId === msg.id ? "max-h-5 opacity-100" : "max-h-0 opacity-0 group-hover:max-h-5 group-hover:opacity-100"} overflow-hidden`}>
                        <p className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</p>
                        {isMine && !msg.deleted_by_sender && (
                          <span className={`text-[10px] ${msg.is_read ? "text-primary" : "text-muted-foreground/50"}`}>
                            {msg.is_read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {isOtherTyping && (
              <div className="pb-1">
                <span className="text-xs text-muted-foreground italic animate-pulse">লিখছে...</span>
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

            {/* Input */}
            <div className="border-t border-border/50 pt-3">
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <EmojiPicker onSelect={(emoji) => setMsgInput(prev => prev + emoji)} />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                </Button>
                <Input
                  ref={inputRef}
                  placeholder={editingMsg ? "এডিট করুন..." : "উত্তর লিখুন..."}
                  value={msgInput}
                  onChange={(e) => { setMsgInput(e.target.value); emitTyping(); }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="bg-card h-9 text-sm"
                  disabled={sending}
                />
                <Button variant="hero" size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={sending || !msgInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>মেসেজ ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>এই মেসেজটি স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ডিলিট করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
