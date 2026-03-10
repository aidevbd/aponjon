import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowLeft, Send, Image as ImageIcon, Heart, Lock, Phone, X, Loader2, Trash2, Pencil, Reply, Search, Pin, MoreVertical, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getChatSession, createChatSession, getChatContacts,
  sendMessage, getMessages, getUnreadCounts, uploadChatImage,
  clearChatSession, deleteMessage, editMessage, type ChatSession,
} from "@/lib/chatSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { EmojiPicker } from "@/components/EmojiPicker";

type ChatContact = { id: string; name: string; phone: string; photo_url: string | null };
type Message = {
  id: string; sender_id: string; receiver_id: string; content: string | null;
  image_url: string | null; is_read: boolean; created_at: string;
  edited_at?: string | null; original_content?: string | null;
  reply_to_id?: string | null; reply_content?: string | null; reply_sender_id?: string | null;
  is_pinned?: boolean;
};

const Chat = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginSecret, setLoginSecret] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, { is_online: boolean; last_seen_at: string }>>({});
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tappedMsgId, setTappedMsgId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const existing = getChatSession();
    if (existing) setSession(existing);
  }, []);

  useEffect(() => {
    if (!session) return;
    loadContacts();
    loadUnread();
    const sendHeartbeat = async () => {
      try { await supabase.rpc("update_presence", { p_contact_id: session.contactId }); } catch {}
    };
    sendHeartbeat();
    const heartbeat = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(heartbeat);
  }, [session]);

  useEffect(() => {
    if (!session || contacts.length === 0) return;
    const fetchPresence = async () => {
      try {
        const ids = contacts.map(c => c.id);
        const { data } = await supabase.rpc("get_user_presence", { p_contact_ids: ids });
        if (data) {
          const map: Record<string, { is_online: boolean; last_seen_at: string }> = {};
          (data as any[]).forEach(p => { map[p.contact_id] = { is_online: p.is_online, last_seen_at: p.last_seen_at }; });
          setPresenceMap(map);
        }
      } catch {}
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 30000);
    return () => clearInterval(interval);
  }, [session, contacts]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("chat-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (selectedContact && (
          (msg.sender_id === selectedContact.id && msg.receiver_id === session.contactId) ||
          (msg.sender_id === session.contactId && msg.receiver_id === selectedContact.id)
        )) {
          setMessages((prev) => [...prev, msg]);
        }
        if (msg.receiver_id === session.contactId && msg.sender_id !== selectedContact?.id) {
          setUnreadMap((prev) => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map(m => m.id === updated.id ? { ...m, is_read: updated.is_read } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, selectedContact]);

  useEffect(() => {
    if (!session || !selectedContact) { setIsOtherTyping(false); return; }
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
    return () => { supabase.removeChannel(channel); setIsOtherTyping(false); };
  }, [session, selectedContact]);

  const emitTyping = () => {
    if (!session || !selectedContact) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;
    const channelName = `typing:${[session.contactId, selectedContact.id].sort().join(":")}`;
    supabase.channel(channelName).send({ type: "broadcast", event: "typing", payload: { sender_id: session.contactId } });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    } catch {
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

  const loadMessages = useCallback(async (contact: ChatContact) => {
    if (!session) return;
    try {
      const data = await getMessages(session.token, contact.id);
      setMessages(data);
      setUnreadMap((prev) => { const n = { ...prev }; delete n[contact.id]; return n; });
    } catch {
      toast.error("মেসেজ লোড করতে সমস্যা");
    }
  }, [session]);

  const handleSelectContact = (contact: ChatContact) => {
    setSelectedContact(contact);
    loadMessages(contact);
  };

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
    if (!session || !selectedContact || (!msgInput.trim() && !uploading)) return;
    const text = msgInput.trim();
    if (!text) return;

    // If editing
    if (editingMsg) {
      setSending(true);
      setMsgInput("");
      try {
        await editMessage(session.token, editingMsg.id, text);
        setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: text, edited_at: new Date().toISOString(), original_content: m.original_content || m.content } : m));
        toast.success("মেসেজ এডিট হয়েছে");
      } catch {
        toast.error("এডিট করতে সমস্যা");
        setMsgInput(text);
      } finally {
        setSending(false);
        setEditingMsg(null);
      }
      return;
    }

    setSending(true);
    setMsgInput("");
    try {
      await sendMessage(session.token, selectedContact.id, text, undefined, replyingTo?.id);
      setReplyingTo(null);
    } catch (err: any) {
      if (err?.message?.includes("Invalid session")) {
        clearChatSession();
        setSession(null);
        toast.error("সেশন শেষ হয়ে গেছে। আবার লগইন করুন।");
      } else {
        toast.error("মেসেজ পাঠাতে সমস্যা");
        setMsgInput(text);
      }
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!session || !deleteTargetId) return;
    try {
      await deleteMessage(session.token, deleteTargetId);
      setMessages(prev => prev.filter(m => m.id !== deleteTargetId));
      toast.success("মেসেজ ডিলিট হয়েছে");
    } catch {
      toast.error("ডিলিট করতে সমস্যা");
    } finally {
      setDeleteTargetId(null);
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
      const url = await uploadChatImage(file);
      await sendMessage(session.token, selectedContact.id, undefined, url, replyingTo?.id);
      setReplyingTo(null);
    } catch {
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

  // ============ LOGIN SCREEN ============
  if (!session) {
    return (
      <div className="min-h-screen warm-gradient">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-sm">
            <div className="glass-card p-8">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full hero-gradient shadow-rose">
                  <MessageCircle className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-display font-semibold text-foreground">প্রাইভেট মেসেজ</h1>
                <p className="text-sm text-muted-foreground mt-1">সিক্রেট কোড দিয়ে লগইন করুন</p>
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
        </main>
      </div>
    );
  }

  // ============ CHAT INTERFACE ============
  return (
    <div className="h-screen warm-gradient flex flex-col overflow-hidden">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md shrink-0">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedContact ? (
              <button onClick={() => { setSelectedContact(null); setSearchOpen(false); setSearchQuery(""); }} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors min-w-0">
                <ArrowLeft className="h-5 w-5 shrink-0" />
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    {selectedContact.photo_url ? (
                      <img src={selectedContact.photo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-primary/20" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{selectedContact.name.charAt(0)}</div>
                    )}
                    {presenceMap[selectedContact.id]?.is_online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-sm truncate block">{selectedContact.name}</span>
                    {presenceMap[selectedContact.id] && (
                      <p className={`text-[10px] truncate ${presenceMap[selectedContact.id].is_online ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {formatLastSeen(presenceMap[selectedContact.id])}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full hero-gradient shadow-rose">
                  <MessageCircle className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <span className="font-display font-semibold text-foreground text-sm">মেসেজ</span>
                  <span className="ml-2 text-xs text-muted-foreground">{session.name}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedContact && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}>
                <Search className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => navigate("/")} className="gap-2 text-sm">
                  <Home className="h-4 w-4" /> হোম
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-sm text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> লগআউট
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Search bar */}
        {searchOpen && (
          <div className="px-4 pt-2">
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

        <AnimatePresence mode="wait">
          {!selectedContact ? (
            <motion.div key="contacts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 px-4 py-4">
              {contacts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">অ্যাডমিন এখনো চ্যাট সেটআপ করেননি</p>
                  <p className="text-xs mt-1">অ্যাডমিন সেটআপ করলেই মেসেজ করতে পারবেন</p>
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
                          <img src={c.photo_url} alt="" className="h-11 w-11 rounded-full object-cover border border-primary/20" />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{c.name.charAt(0)}</div>
                        )}
                        {presenceMap[c.id]?.is_online && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm">{c.name} <span className="text-[10px] love-badge ml-1">এডমিন</span></div>
                        <div className={`text-xs truncate ${presenceMap[c.id]?.is_online ? "text-green-500" : "text-muted-foreground"}`}>
                          {formatLastSeen(presenceMap[c.id]) || "ট্যাপ করে মেসেজ করুন"}
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
            <motion.div key="thread" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {filteredMessages.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{searchQuery ? "কোনো মেসেজ পাওয়া যায়নি" : "এখনো কোনো মেসেজ নেই"}</p>
                  </div>
                )}
                {filteredMessages.map((msg, idx) => {
                  const isMine = msg.sender_id === session.contactId;
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
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-1.5 flex items-center gap-0.5">
                              <button onClick={(e) => { e.stopPropagation(); handleStartEdit(msg); }} className="p-1 rounded-full hover:bg-muted" title="এডিট">
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setDeleteTargetId(msg.id); }} className="p-1 rounded-full hover:bg-destructive/10" title="ডিলিট">
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </button>
                            </div>
                          )}
                          <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${msg.is_pinned ? "ring-1 ring-primary/30" : ""} ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border/50 text-foreground rounded-bl-md"}`}>
                            {msg.is_pinned && <p className="text-[9px] mb-0.5 opacity-70">📌 পিন করা</p>}
                            {msg.reply_content && (
                              <div className={`text-[10px] mb-1.5 px-2 py-1 rounded-lg border-l-2 ${isMine ? "bg-primary-foreground/10 border-primary-foreground/30" : "bg-muted border-primary/30"}`}>
                                <span className="font-medium">{msg.reply_sender_id === session.contactId ? "আপনি" : selectedContact?.name}</span>
                                <p className="truncate opacity-80">{msg.reply_content}</p>
                              </div>
                            )}
                            {msg.image_url && (
                              <img src={msg.image_url} alt="" className="rounded-lg max-w-full mb-1.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); window.open(msg.image_url!, "_blank"); }} />
                            )}
                            {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                            {msg.edited_at && (
                              <span className={`text-[9px] ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>এডিটেড</span>
                            )}
                          </div>
                          {!isMine && (
                            <button onClick={(e) => { e.stopPropagation(); handleStartReply(msg); }} className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1.5 p-1 rounded-full hover:bg-muted" title="রিপ্লাই">
                              <Reply className="h-3 w-3 text-muted-foreground" />
                            </button>
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
                          {isMine && (
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
                <div className="px-4 pb-1">
                  <span className="text-xs text-muted-foreground italic animate-pulse">লিখছে...</span>
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

              <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm px-2 sm:px-3 py-2 shrink-0">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <EmojiPicker onSelect={(emoji) => setMsgInput(prev => prev + emoji)} />
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                  </Button>
                  <Input
                    ref={inputRef}
                    placeholder={editingMsg ? "এডিট করুন..." : "মেসেজ লিখুন..."}
                    value={msgInput}
                    onChange={(e) => { setMsgInput(e.target.value); emitTyping(); }}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="bg-background/50 text-sm h-9 flex-1 min-w-0"
                    disabled={sending}
                  />
                  <Button
                    variant="hero" size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleSend}
                    disabled={sending || !msgInput.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>মেসেজ ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>এই মেসেজটি আপনার চ্যাট থেকে মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ডিলিট করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Chat;
