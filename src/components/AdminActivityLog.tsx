import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, Filter, ChevronDown, UserPlus, Edit3, Trash2, LogIn, LogOut, MessageCircle, Download, Pin, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type LogEntry = {
  id: string;
  action_type: string;
  description: string;
  target_id: string | null;
  target_type: string | null;
  metadata: Record<string, any>;
  created_at: string;
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="h-3.5 w-3.5 text-green-500" />,
  logout: <LogOut className="h-3.5 w-3.5 text-muted-foreground" />,
  contact_add: <UserPlus className="h-3.5 w-3.5 text-primary" />,
  contact_edit: <Edit3 className="h-3.5 w-3.5 text-blue-500" />,
  contact_delete: <Trash2 className="h-3.5 w-3.5 text-destructive" />,
  message_delete: <Trash2 className="h-3.5 w-3.5 text-destructive" />,
  message_edit: <Edit3 className="h-3.5 w-3.5 text-blue-500" />,
  message_pin: <Pin className="h-3.5 w-3.5 text-primary" />,
  message_send: <MessageCircle className="h-3.5 w-3.5 text-primary" />,
  export_csv: <Download className="h-3.5 w-3.5 text-muted-foreground" />,
  view_data: <Eye className="h-3.5 w-3.5 text-muted-foreground" />,
};

const ACTION_LABELS: Record<string, string> = {
  login: "লগইন",
  logout: "লগআউট",
  contact_add: "কন্টাক্ট যোগ",
  contact_edit: "কন্টাক্ট এডিট",
  contact_delete: "কন্টাক্ট ডিলিট",
  message_delete: "মেসেজ ডিলিট",
  message_edit: "মেসেজ এডিট",
  message_pin: "মেসেজ পিন",
  message_send: "মেসেজ পাঠানো",
  export_csv: "CSV এক্সপোর্ট",
  view_data: "ডাটা দেখা",
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-green-500/10 text-green-600",
  logout: "bg-muted text-muted-foreground",
  contact_add: "bg-primary/10 text-primary",
  contact_edit: "bg-blue-500/10 text-blue-600",
  contact_delete: "bg-destructive/10 text-destructive",
  message_delete: "bg-destructive/10 text-destructive",
  message_edit: "bg-blue-500/10 text-blue-600",
  message_pin: "bg-primary/10 text-primary",
  message_send: "bg-primary/10 text-primary",
  export_csv: "bg-muted text-muted-foreground",
  view_data: "bg-muted text-muted-foreground",
};

export function AdminActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  const loadLogs = useCallback(async (offset = 0, append = false) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_admin_activity_logs", {
        p_limit: PAGE_SIZE,
        p_offset: offset,
        p_action_type: filterType === "all" ? null : filterType,
      } as any);
      if (error) throw error;
      const entries = (data || []) as LogEntry[];
      if (append) {
        setLogs(prev => [...prev, ...entries]);
      } else {
        setLogs(entries);
      }
      setHasMore(entries.length === PAGE_SIZE);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadLogs(0, false);
  }, [loadLogs]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "এইমাত্র";
    if (diffMin < 60) return `${diffMin} মিনিট আগে`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ঘণ্টা আগে`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} দিন আগে`;
    return d.toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatFullTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" }) +
      " " + d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4 text-primary" /> অ্যাক্টিভিটি লগ
        </h3>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="ফিল্টার" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব অ্যাক্টিভিটি</SelectItem>
            <SelectItem value="login">লগইন</SelectItem>
            <SelectItem value="logout">লগআউট</SelectItem>
            <SelectItem value="contact_add">কন্টাক্ট যোগ</SelectItem>
            <SelectItem value="contact_edit">কন্টাক্ট এডিট</SelectItem>
            <SelectItem value="contact_delete">কন্টাক্ট ডিলিট</SelectItem>
            <SelectItem value="message_delete">মেসেজ ডিলিট</SelectItem>
            <SelectItem value="message_send">মেসেজ পাঠানো</SelectItem>
            <SelectItem value="export_csv">CSV এক্সপোর্ট</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log entries */}
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
        {logs.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">কোনো অ্যাক্টিভিটি নেই</p>
          </div>
        )}
        {logs.map((log, idx) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.02, 0.3) }}
            className="group flex items-start gap-2.5 rounded-lg border border-border/40 bg-card/50 px-3 py-2 hover:bg-card/80 transition-colors"
          >
            <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ACTION_COLORS[log.action_type] || "bg-muted text-muted-foreground"}`}>
              {ACTION_ICONS[log.action_type] || <Activity className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ACTION_COLORS[log.action_type] || "bg-muted text-muted-foreground"}`}>
                  {ACTION_LABELS[log.action_type] || log.action_type}
                </span>
                <span className="text-[10px] text-muted-foreground" title={formatFullTime(log.created_at)}>
                  {formatTime(log.created_at)}
                </span>
              </div>
              <p className="text-xs text-foreground mt-0.5 leading-relaxed">{log.description}</p>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(log.metadata).map(([key, val]) => (
                    <span key={key} className="text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">
                      {key}: {String(val).substring(0, 30)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="text-center py-4">
            <Activity className="h-5 w-5 text-primary animate-pulse mx-auto" />
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && !loading && logs.length > 0 && (
        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => loadLogs(logs.length, true)}>
            <ChevronDown className="h-3 w-3" /> আরো দেখুন
          </Button>
        </div>
      )}
    </div>
  );
}
