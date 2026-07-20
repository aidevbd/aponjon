import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Reply, Pencil, Copy, Trash2, RotateCcw, Pin, History } from "lucide-react";
import { toast } from "sonner";
import type { BubbleMessage } from "./MessageBubble";
import { QUICK_EMOJIS } from "./MessageBubble";

interface MessageActionSheetProps {
  open: boolean;
  message: BubbleMessage | null;
  isMine: boolean;
  canPin?: boolean;
  anchorRect?: DOMRect | null;
  onOpenChange: (open: boolean) => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onUnsend: () => void;
  onRemoveForMe: () => void;
  onTogglePin?: () => void;
  onShowEditHistory?: () => void;
}

const POPUP_WIDTH = 240;
const GAP = 8;
const MARGIN = 8;

export function MessageActionSheet({
  open, message, isMine, canPin, anchorRect, onOpenChange,
  onReact, onReply, onEdit, onUnsend, onRemoveForMe, onTogglePin, onShowEditHistory,
}: MessageActionSheetProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRect) { setPos(null); return; }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const height = popupRef.current?.offsetHeight ?? 320;

    // Preferred side: opposite of the message side
    let left = isMine
      ? anchorRect.left - POPUP_WIDTH - GAP
      : anchorRect.right + GAP;

    // Flip if it overflows
    if (left < MARGIN) left = Math.min(anchorRect.right + GAP, vw - POPUP_WIDTH - MARGIN);
    if (left + POPUP_WIDTH > vw - MARGIN) left = Math.max(anchorRect.left - POPUP_WIDTH - GAP, MARGIN);
    // Final clamp
    left = Math.max(MARGIN, Math.min(left, vw - POPUP_WIDTH - MARGIN));

    let top = anchorRect.top;
    if (top + height > vh - MARGIN) top = vh - height - MARGIN;
    top = Math.max(MARGIN, top);

    setPos({ top, left });
  }, [open, anchorRect, isMine, message?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || !message) return null;
  const isUnsent = !!message.unsent_at;
  const canEdit = isMine && !isUnsent && !!message.content;

  const close = () => onOpenChange(false);

  return createPortal(
    <div className="fixed inset-0 z-[100]" onClick={close}>
      <div
        ref={popupRef}
        onClick={(e) => e.stopPropagation()}
        style={pos ? { top: pos.top, left: pos.left, width: POPUP_WIDTH } : { top: -9999, left: -9999, width: POPUP_WIDTH }}
        className="fixed rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
      >
        {/* Quick reactions */}
        {!isUnsent && (
          <div className="flex items-center justify-between gap-0.5 px-2 py-2 border-b border-border">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact(emoji); close(); }}
                className="text-xl leading-none hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="py-1">
          {!isUnsent && (
            <Row icon={<Reply className="h-4 w-4" />} label="রিপ্লাই" onClick={() => { onReply(); close(); }} />
          )}
          {message.content && !isUnsent && (
            <Row
              icon={<Copy className="h-4 w-4" />}
              label="কপি করুন"
              onClick={() => {
                navigator.clipboard.writeText(message.content!);
                toast.success("কপি হয়েছে");
                close();
              }}
            />
          )}
          {canEdit && (
            <Row icon={<Pencil className="h-4 w-4" />} label="এডিট" onClick={() => { onEdit(); close(); }} />
          )}
          {message.has_edit_history && onShowEditHistory && (
            <Row icon={<History className="h-4 w-4" />} label="এডিট ইতিহাস" onClick={() => { onShowEditHistory(); close(); }} />
          )}
          {canPin && onTogglePin && !isUnsent && (
            <Row
              icon={<Pin className="h-4 w-4" />}
              label={message.is_pinned ? "আনপিন" : "পিন"}
              onClick={() => { onTogglePin(); close(); }}
            />
          )}

          <div className="h-px bg-border my-1" />

          <Row
            icon={<RotateCcw className="h-4 w-4" />}
            label="শুধু আমার থেকে সরান"
            onClick={() => { onRemoveForMe(); close(); }}
          />
          {isMine && !isUnsent && (
            <Row
              icon={<Trash2 className="h-4 w-4" />}
              label="সবার জন্য আনসেন্ড"
              destructive
              onClick={() => { onUnsend(); close(); }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({
  icon, label, onClick, destructive,
}: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-[14px] text-left hover:bg-muted transition-colors ${destructive ? "text-destructive" : ""}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
