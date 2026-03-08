import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowLeft, Send, Image as ImageIcon, Heart, Lock, Phone, X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getChatSession, createChatSession, getChatContacts,
  sendMessage, getMessages, getUnreadCounts, uploadChatImage,
  clearChatSession, deleteMessage, type ChatSession,
} from "@/lib/chatSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/Header";

type ChatContact = { id: string; name: string; phone: string; photo_url: string | null };
type Message = { id: string; sender_id: string; receiver_id: string; content: string | null; image_url: string | null; is_read: boolean; created_at: string };

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
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check existing session on mount
  useEffect(() => {
    const existing = getChatSession();
    if (existing) setSession(existing);
  }, []);

  // Load contacts & unread when session ready + heartbeat + presence polling
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

  // Poll presence for contacts
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

  // Realtime subscription for new messages
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("chat-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        // If message is for current conversation
        if (selectedContact && (
          (msg.sender_id === selectedContact.id && msg.receiver_id === session.contactId) ||
          (msg.sender_id === session.contactId && msg.receiver_id === selectedContact.id)
        )) {
          setMessages((prev) => [...prev, msg]);
        }
        // Update unread if not in that conversation
        if (msg.receiver_id === session.contactId && msg.sender_id !== selectedContact?.id) {
          setUnreadMap((prev) => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, selectedContact]);

  // Typing indicator via broadcast
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

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadContacts = async () => {
    if (!session) return;
    try {
      const data = await getChatContacts(session.token);
      // If no contacts returned, verify session is still valid
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
    } catch { /* ignore */ }
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
    setSending(true);
    setMsgInput("");
    try {
      await sendMessage(session.token, selectedContact.id, text);
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

  const handleDeleteMessage = async (msgId: string) => {
    if (!session) return;
    try {
      await deleteMessage(session.token, msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast.success("মেসেজ ডিলিট হয়েছে");
    } catch {
      toast.error("ডিলিট করতে সমস্যা");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session || !selectedContact) return;
    if (!file.type.startsWith("image/")) { toast.error("শুধুমাত্র ছবি পাঠানো যাবে"); return; }
    setUploading(true);
    try {
      const url = await uploadChatImage(file);
      await sendMessage(session.token, selectedContact.id, undefined, url);
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
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
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
    <div className="min-h-screen warm-gradient flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {selectedContact ? (
              <button onClick={() => setSelectedContact(null)} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <div className="flex items-center gap-2">
                  <div className="relative">
                    {selectedContact.photo_url ? (
                      <img src={selectedContact.photo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-primary/20" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{selectedContact.name.charAt(0)}</div>
                    )}
                    {presenceMap[selectedContact.id]?.is_online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-sm">{selectedContact.name}</span>
                    {presenceMap[selectedContact.id] && (
                      <p className={`text-[10px] ${presenceMap[selectedContact.id].is_online ? "text-green-500" : "text-muted-foreground"}`}>
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-xs gap-1">
              <Heart className="h-3.5 w-3.5" /> হোম
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-destructive hover:text-destructive">
              লগআউট
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col container mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {!selectedContact ? (
            // ============ CONTACT LIST ============
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
            // ============ MESSAGE THREAD ============
            <motion.div key="thread" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {messages.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">এখনো কোনো মেসেজ নেই</p>
                    <p className="text-xs mt-1">প্রথম মেসেজ পাঠান! 💬</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isMine = msg.sender_id === session.contactId;
                  return (
                    <div key={msg.id} className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
                      {isMine && (
                        <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-1.5 p-1 rounded-full hover:bg-destructive/10" title="ডিলিট">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border/50 text-foreground rounded-bl-md"}`}>
                        {msg.image_url && (
                          <img src={msg.image_url} alt="" className="rounded-lg max-w-full mb-1.5 cursor-pointer" onClick={() => window.open(msg.image_url!, "_blank")} />
                        )}
                        {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                          <p className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatTime(msg.created_at)}
                          </p>
                          {isMine && (
                            <span className={`text-[10px] ${msg.is_read ? "text-primary-foreground/80" : "text-primary-foreground/40"}`}>
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

              {/* Typing indicator */}
              {isOtherTyping && (
                <div className="px-4 pb-1">
                  <span className="text-xs text-muted-foreground italic animate-pulse">লিখছে...</span>
                </div>
              )}

              {/* Message Input */}
              <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <Button
                    variant="ghost" size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                  </Button>
                  <Input
                    placeholder="মেসেজ লিখুন..."
                    value={msgInput}
                    onChange={(e) => { setMsgInput(e.target.value); emitTyping(); }}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="bg-background/50 text-sm"
                    disabled={sending}
                  />
                  <Button
                    variant="hero" size="icon"
                    className="h-9 w-9 shrink-0"
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
    </div>
  );
};

export default Chat;
