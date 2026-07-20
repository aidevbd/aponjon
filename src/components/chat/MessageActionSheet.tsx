import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Reply, Pencil, Copy, Trash2, RotateCcw, Pin, History } from "lucide-react";
import { toast } from "sonner";
import type { BubbleMessage } from "./MessageBubble";
import { QUICK_EMOJIS } from "./MessageBubble";

interface MessageActionSheetProps {
  open: boolean;
  message: BubbleMessage | null;
  isMine: boolean;
  canPin?: boolean;
  onOpenChange: (open: boolean) => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onUnsend: () => void;
  onRemoveForMe: () => void;
  onTogglePin?: () => void;
  onShowEditHistory?: () => void;
}

export function MessageActionSheet({
  open, message, isMine, canPin, onOpenChange,
  onReact, onReply, onEdit, onUnsend, onRemoveForMe, onTogglePin, onShowEditHistory,
}: MessageActionSheetProps) {
  if (!message) return null;
  const isUnsent = !!message.unsent_at;
  const canEdit = isMine && !isUnsent && !!message.content;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md sm:w-full">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-sm font-medium text-muted-foreground">মেসেজ অপশন</DrawerTitle>
        </DrawerHeader>

        {/* Quick reactions */}
        {!isUnsent && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-around bg-muted/50 rounded-full py-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onReact(emoji); onOpenChange(false); }}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-3 pb-6 space-y-1">
          {!isUnsent && (
            <ActionRow icon={<Reply className="h-4 w-4" />} label="রিপ্লাই" onClick={() => { onReply(); onOpenChange(false); }} />
          )}

          {message.content && !isUnsent && (
            <ActionRow
              icon={<Copy className="h-4 w-4" />}
              label="কপি করুন"
              onClick={() => {
                navigator.clipboard.writeText(message.content!);
                toast.success("কপি হয়েছে");
                onOpenChange(false);
              }}
            />
          )}

          {canEdit && (
            <ActionRow icon={<Pencil className="h-4 w-4" />} label="এডিট" onClick={() => { onEdit(); onOpenChange(false); }} />
          )}

          {message.has_edit_history && onShowEditHistory && (
            <ActionRow
              icon={<History className="h-4 w-4" />}
              label="এডিট ইতিহাস"
              onClick={() => { onShowEditHistory(); onOpenChange(false); }}
            />
          )}

          {canPin && onTogglePin && !isUnsent && (
            <ActionRow
              icon={<Pin className="h-4 w-4" />}
              label={message.is_pinned ? "আনপিন" : "পিন"}
              onClick={() => { onTogglePin(); onOpenChange(false); }}
            />
          )}

          <div className="h-px bg-border my-1" />

          <ActionRow
            icon={<RotateCcw className="h-4 w-4" />}
            label="শুধু আমার থেকে সরান"
            onClick={() => { onRemoveForMe(); onOpenChange(false); }}
          />

          {isMine && !isUnsent && (
            <ActionRow
              icon={<Trash2 className="h-4 w-4" />}
              label="সবার জন্য আনসেন্ড"
              destructive
              onClick={() => { onUnsend(); onOpenChange(false); }}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ActionRow({
  icon, label, onClick, destructive,
}: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start gap-3 h-11 text-[15px] ${destructive ? "text-destructive hover:text-destructive" : ""}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}
