import { ChevronLeft, Search, Settings2, Bell, ArrowDownToLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatPresenceLabel } from "@/lib/chatFormatters";
import type { AdminChatUser, PresenceEntry } from "@/components/admin/adminChatTypes";

interface Props {
  user: AdminChatUser;
  presence?: PresenceEntry;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  onBack: () => void;
  onToggleSearch: () => void;
  onOpenProfile?: (userId: string) => void;
  onOpenNotifPrefs: () => void;
  onJumpToLatest: () => void;
  onRefresh: () => void;
}

export function AdminChatThreadHeader({
  user,
  presence,
  settingsOpen,
  onSettingsOpenChange,
  onBack,
  onToggleSearch,
  onOpenProfile,
  onOpenNotifPrefs,
  onJumpToLatest,
  onRefresh,
}: Props) {
  const presenceText = formatPresenceLabel(presence);

  return (
    <div className="sticky top-0 z-50 -mx-1 flex items-center gap-2 px-3 py-2.5 border-b border-heirloom-line bg-heirloom-bg pt-[max(0.625rem,env(safe-area-inset-top))] shadow-heirloom-sticky">
      <button
        onClick={onBack}
        className="lg:hidden flex items-center justify-center h-9 w-9 -ml-1 rounded-full text-foreground hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
        aria-label="ফিরে যান"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenProfile?.(user.id)}
          className="relative shrink-0 rounded-full hover:ring-2 hover:ring-primary/20 active:scale-[0.97] transition cursor-pointer"
          aria-label={`${user.name} এর প্রোফাইল দেখুন`}
        >
          {user.photo_url ? (
            <img src={user.photo_url} alt={user.name} className="h-9 w-9 rounded-full object-cover border border-primary/20" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{user.name.charAt(0)}</span>
          )}
          {presence?.isOnline && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-heirloom-paper" />
          )}
        </button>
        <div className="min-w-0 leading-tight flex flex-col items-start">
          <button
            type="button"
            onClick={() => onOpenProfile?.(user.id)}
            className="rounded-md px-1 -mx-1 font-semibold text-sm text-foreground whitespace-nowrap text-left hover:bg-primary/5 active:scale-[0.99] transition-colors cursor-pointer"
            aria-label={`${user.name} এর প্রোফাইল দেখুন`}
          >
            {user.name}
          </button>
          <span className="block text-[11px] text-muted-foreground whitespace-nowrap px-1 -mx-1">
            {presenceText ? (
              <span className={presence?.isOnline ? "text-emerald-600" : ""}>{presenceText}</span>
            ) : user.phone}
          </span>
        </div>
      </div>

      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" aria-label="মেসেজ খুঁজুন" onClick={onToggleSearch}>
        <Search className="h-4 w-4" />
      </Button>

      <DropdownMenu open={settingsOpen} onOpenChange={onSettingsOpenChange} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" aria-label="সেটিংস ও অপশন">
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="z-[70] w-52">
          <DropdownMenuItem onSelect={() => { onSettingsOpenChange(false); onOpenNotifPrefs(); }} className="gap-2 text-sm">
            <Bell className="h-4 w-4" /> নোটিফিকেশন সেটিংস
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { onSettingsOpenChange(false); onJumpToLatest(); }} className="gap-2 text-sm">
            <ArrowDownToLine className="h-4 w-4" /> সর্বশেষ মেসেজে যান
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { onSettingsOpenChange(false); onRefresh(); }} className="gap-2 text-sm">
            <RefreshCw className="h-4 w-4" /> রিফ্রেশ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
