import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, ChevronLeft, Search, Settings2, Home, LogOut,
  Bell, ArrowDownToLine, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatLastSeen } from "@/lib/chatFormatters";

type HeaderContact = { id: string; name: string; photo_url: string | null };
type Presence = { is_online: boolean; last_seen_at: string | null };

interface ChatHeaderProps {
  selectedContact: HeaderContact | null;
  presence?: Presence;
  myName: string;
  showBackButton: boolean;
  searchOpen: boolean;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  onBackToList: () => void;
  onNavigateBack: () => void;
  onToggleSearch: () => void;
  onOpenNotifPrefs: () => void;
  onScrollToLatest: () => void;
  onRefresh: () => void;
  onGoHome: () => void;
  onLogout: () => void;
}

/** /chat-এর হেডার — থ্রেড অবস্থায় আপনজনের পরিচয়, তালিকা অবস্থায় "মেসেজ" শিরোনাম। */
export const ChatHeader = ({
  selectedContact, presence, myName, showBackButton, searchOpen, settingsOpen,
  onSettingsOpenChange, onBackToList, onNavigateBack, onToggleSearch,
  onOpenNotifPrefs, onScrollToLatest, onRefresh, onGoHome, onLogout,
}: ChatHeaderProps) => (
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
                  onClick={onBackToList}
                  className="text-foreground hover:text-primary transition-colors shrink-0 md:hidden"
                  aria-label="ফিরে যান"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={onNavigateBack}
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
                  {presence?.is_online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <span className="font-semibold text-sm truncate block">{selectedContact.name}</span>
                  {presence && (
                    <p className={`text-xs truncate ${presence.is_online ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {formatLastSeen(presence)}
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
                <span className="ml-2 text-xs text-muted-foreground">{myName}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {selectedContact && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="মেসেজ খুঁজুন"
            aria-pressed={searchOpen}
            onClick={onToggleSearch}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
        <DropdownMenu open={settingsOpen} onOpenChange={onSettingsOpenChange} modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="সেটিংস ও অপশন">
              <Settings2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="z-[70] w-52">
            <DropdownMenuItem onSelect={() => { onSettingsOpenChange(false); onOpenNotifPrefs(); }} className="gap-2 text-sm">
              <Bell className="h-4 w-4" /> নোটিফিকেশন সেটিংস
            </DropdownMenuItem>
            {selectedContact && (
              <>
                <DropdownMenuItem onSelect={() => { onSettingsOpenChange(false); onScrollToLatest(); }} className="gap-2 text-sm">
                  <ArrowDownToLine className="h-4 w-4" /> সর্বশেষ মেসেজে যান
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { onSettingsOpenChange(false); onRefresh(); }} className="gap-2 text-sm">
                  <RefreshCw className="h-4 w-4" /> রিফ্রেশ
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onSelect={() => { onSettingsOpenChange(false); onGoHome(); }} className="gap-2 text-sm">
              <Home className="h-4 w-4" /> হোম
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onSettingsOpenChange(false); onLogout(); }} className="gap-2 text-sm text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" /> লগআউট
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
);
