import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, LayoutDashboard, MessageCircle, Settings, Users } from "lucide-react";

const TRIGGER_CLASS =
  "flex-col sm:flex-row gap-0.5 sm:gap-1.5 text-micro sm:text-[13px] px-1 py-2 sm:py-1.5 rounded-sm data-[state=active]:bg-heirloom-cream/[0.8] data-[state=active]:text-heirloom-gold-deep data-[state=active]:shadow-none text-heirloom-ink-soft";

interface Props {
  totalContacts: number;
  totalUnread: number;
  immersive: boolean;
  chatFullscreen: boolean;
  tabsHidden: boolean;
}

export function AdminTabsBar({ totalContacts, totalUnread, immersive, chatFullscreen, tabsHidden }: Props) {
  return (
    <TabsList
      className={`w-full hidden sm:grid grid-cols-5 h-auto p-1 gap-0.5 bg-heirloom-paper/[0.7] border border-heirloom-line rounded-sm transition-transform duration-300 ${immersive ? "sm:hidden" : ""} ${chatFullscreen ? "mb-3 shrink-0" : "mb-5 sm:sticky sm:top-14 sm:z-40"} ${tabsHidden ? "sm:-translate-y-[calc(100%+3.5rem)] sm:opacity-0 sm:pointer-events-none" : ""}`}
    >
      <TabsTrigger value="dashboard" className={TRIGGER_CLASS}>
        <LayoutDashboard className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">ড্যাশবোর্ড</span>
        <span className="sm:hidden">হোম</span>
      </TabsTrigger>
      <TabsTrigger value="contacts" className={TRIGGER_CLASS}>
        <Users className="h-3.5 w-3.5" />
        <span className="inline-flex items-center gap-1">
          <span>কন্টাক্ট</span>
          <span className="text-micro text-heirloom-ink-mute">{totalContacts}</span>
        </span>
      </TabsTrigger>
      <TabsTrigger value="chat" className={`${TRIGGER_CLASS} relative`}>
        <MessageCircle className="h-3.5 w-3.5" />
        <span>চ্যাট</span>
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 sm:static sm:ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-heirloom-gold-deep text-heirloom-paper text-[9px] font-medium px-1">
            {totalUnread}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger value="logs" className={TRIGGER_CLASS}>
        <Activity className="h-3.5 w-3.5" />
        <span>লগ</span>
      </TabsTrigger>
      <TabsTrigger value="settings" className={TRIGGER_CLASS}>
        <Settings className="h-3.5 w-3.5" />
        <span>সেটিংস</span>
      </TabsTrigger>
    </TabsList>
  );
}
