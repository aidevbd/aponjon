import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowLeft, Send, Image as ImageIcon, Heart, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { uploadChatImage } from "@/lib/chatSession";
import { toast } from "sonner";

type ChatUser = { id: string; name: string; phone: string; photo_url: string | null; last_message_at: string | null };
type Message = { id: string; sender_id: string; receiver_id: string; content: string | null; image_url: string | null; is_read: boolean; created_at: string };

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Admin heartbeat
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
      // Load presence for these users
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
    } catch { /* ignore */ }
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

  const handleSend = async () => {
    if (!selectedUser || !msgInput.trim()) return;
    const text = msgInput.trim();
    setSending(true);
    setMsgInput("");
    try {
      const { error } = await supabase.rpc("send_admin_message", { p_receiver_id: selectedUser.id, p_content: text });
      if (error) throw error;
    } catch { toast.error("মেসেজ পাঠাতে সমস্যা"); setMsgInput(text); }
    finally { setSending(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;
    if (!file.type.startsWith("image/")) { toast.error("শুধুমাত্র ছবি পাঠানো যাবে"); return; }
    setUploading(true);
    try {
      const url = await uploadChatImage(file);
      const { error } = await supabase.rpc("send_admin_message", { p_receiver_id: selectedUser.id, p_image_url: url });
      if (error) throw error;
    } catch { toast.error("ছবি পাঠাতে সমস্যা"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  };

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
                {chatUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-card/80 transition-colors text-left border border-transparent hover:border-border/50"
                  >
                    {u.photo_url ? (
                      <img src={u.photo_url} alt="" className="h-10 w-10 rounded-full object-cover border border-primary/20 shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">{u.name.charAt(0)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.phone}</div>
                    </div>
                    {unreadMap[u.id] && (
                      <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full hero-gradient text-primary-foreground text-[10px] font-bold px-1.5">
                        {unreadMap[u.id]}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="thread" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
            {/* Thread Header */}
            <div className="flex items-center gap-2 pb-3 border-b border-border/50">
              <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4" />
                {selectedUser.photo_url ? (
                  <img src={selectedUser.photo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-primary/20" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{selectedUser.name.charAt(0)}</div>
                )}
                <div>
                  <span className="font-semibold text-sm">{selectedUser.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{selectedUser.phone}</span>
                </div>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {messages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">এখনো কোনো মেসেজ নেই</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMine = msg.sender_id === adminContactId;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border/50 text-foreground rounded-bl-md"}`}>
                      {msg.image_url && (
                        <img src={msg.image_url} alt="" className="rounded-lg max-w-full mb-1.5 cursor-pointer" onClick={() => window.open(msg.image_url!, "_blank")} />
                      )}
                      {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                        <p className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatTime(msg.created_at)}</p>
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

            {/* Input */}
            <div className="border-t border-border/50 pt-3">
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                </Button>
                <Input
                  placeholder="উত্তর লিখুন..."
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
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
    </div>
  );
}
