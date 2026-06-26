import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowLeft, Send, Image as ImageIcon, Heart, X, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { uploadChatImage } from "@/lib/chatSession";
import { getSession } from "@/lib/store";
import { toast } from "sonner";

type ChatUser = { id: string; name: string; phone: string; photo_url: string | null; last_message_at: string | null };
type Message = { id: string; sender_id: string; receiver_id: string; content: string | null; image_url: string | null; is_read: boolean; created_at: string };

const AdminChat = () => {
  const navigate = useNavigate();
  const [adminContactId, setAdminContactId] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const selectedUserRef = useRef<ChatUser | null>(null);
  const adminContactIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
  useEffect(() => { adminContactIdRef.current = adminContactId; }, [adminContactId]);

  // Check auth & admin setup
  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (!session) { navigate("/admin"); return; }
      
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
  }, [navigate]);

  // Load chat users & unread
  useEffect(() => {
    if (!adminContactId) return;
    loadChatUsers();
    loadUnread();
  }, [adminContactId]);

  // Realtime — subscribe once per admin contact; read latest selectedUser via refs to avoid stale closure
  useEffect(() => {
    if (!adminContactId) return;
    const channel = supabase
      .channel("admin-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        const sel = selectedUserRef.current;
        const adminId = adminContactIdRef.current;
        if (!adminId) return;
        if (sel && (
          (msg.sender_id === sel.id && msg.receiver_id === adminId) ||
          (msg.sender_id === adminId && msg.receiver_id === sel.id)
        )) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        }
        if (msg.receiver_id === adminId && msg.sender_id !== sel?.id) {
          setUnreadMap(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
          loadChatUsers();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [adminContactId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChatUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_admin_chat_users");
      if (error) throw error;
      setChatUsers((data || []) as ChatUser[]);
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
    } catch {
      toast.error("সেটআপ সমস্যা হয়েছে");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedUser || !msgInput.trim()) return;
    const text = msgInput.trim();
    setSending(true);
    setMsgInput("");
    try {
      const { error } = await supabase.rpc("send_admin_message", {
        p_receiver_id: selectedUser.id,
        p_content: text,
      });
      if (error) throw error;
    } catch {
      toast.error("মেসেজ পাঠাতে সমস্যা");
      setMsgInput(text);
    } finally {
      setSending(false);
    }
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
      });
      if (error) throw error;
    } catch {
      toast.error("ছবি পাঠাতে সমস্যা");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  };

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="min-h-screen warm-gradient flex items-center justify-center">
        <Heart className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  // Admin setup screen
  if (needsSetup) {
    return (
      <div className="min-h-screen warm-gradient flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full hero-gradient shadow-rose">
              <Settings className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-display font-semibold text-foreground">চ্যাট সেটআপ</h1>
            <p className="text-sm text-muted-foreground mt-1">আপনার নাম দিন যেটা ইউজাররা দেখবে</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>আপনার নাম</Label>
              <Input placeholder="যেমন: অ্যাডমিন" value={setupName} onChange={(e) => setSetupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSetup()} className="bg-card" />
            </div>
            <Button onClick={handleSetup} variant="hero" className="w-full" disabled={setupLoading}>
              {setupLoading ? "সেটআপ হচ্ছে..." : "সেটআপ করুন"}
            </Button>
          </div>
          <Button variant="ghost" className="w-full mt-3 text-xs" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> ড্যাশবোর্ডে ফিরুন
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen warm-gradient flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {selectedUser ? (
              <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <div className="flex items-center gap-2">
                  {selectedUser.photo_url ? (
                    <img src={selectedUser.photo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-primary/20" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{selectedUser.name.charAt(0)}</div>
                  )}
                  <div>
                    <span className="font-semibold text-sm">{selectedUser.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{selectedUser.phone}</span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full hero-gradient shadow-rose">
                  <MessageCircle className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <span className="font-display font-semibold text-foreground text-sm">অ্যাডমিন চ্যাট</span>
                  {totalUnread > 0 && <span className="ml-2 love-badge">{totalUnread} নতুন</span>}
                </div>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/dashboard")} className="text-xs gap-1">
            <Heart className="h-3.5 w-3.5" /> ড্যাশবোর্ড
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col container mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {!selectedUser ? (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 px-4 py-4">
              {chatUsers.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">এখনো কেউ মেসেজ করেনি</p>
                  <p className="text-xs mt-1">ইউজাররা চ্যাট পেজ থেকে আপনাকে মেসেজ করতে পারবে</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chatUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-card/80 transition-colors text-left border border-transparent hover:border-border/50"
                    >
                      {u.photo_url ? (
                        <img src={u.photo_url} alt="" className="h-11 w-11 rounded-full object-cover border border-primary/20 shrink-0" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shrink-0">{u.name.charAt(0)}</div>
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
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {messages.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">এখনো কোনো মেসেজ নেই</p>
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

              <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm px-3 sm:px-4 py-3">
                <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                  </Button>
                  <Input
                    placeholder="উত্তর লিখুন..."
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="bg-background/50 text-sm h-9 flex-1 min-w-0"
                    disabled={sending}
                  />
                  <Button variant="hero" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={handleSend} disabled={sending || !msgInput.trim()}>
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

export default AdminChat;
