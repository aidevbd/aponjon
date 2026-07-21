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
  anchorEl?: HTMLElement | null;
  onOpenChange: (open: boolean) => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onUnsend: () => void;
  onRemoveForMe: () => void;
  onTogglePin?: () => void;
  onShowEditHistory?: () => void;
}

const MENU_WIDTH = 232;
const REACTIONS_WIDTH = 280;
const GAP = 8;
const MARGIN = 8;
const MOBILE_BP = 640;

export function MessageActionSheet({
  open, message, isMine, canPin, anchorRect, anchorEl, onOpenChange,
  onReact, onReply, onEdit, onUnsend, onRemoveForMe, onTogglePin, onShowEditHistory,
}: MessageActionSheetProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionsRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BP : false
  );
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [reactionsPos, setReactionsPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) { setMenuPos(null); setReactionsPos(null); return; }

    const compute = () => {
      const mobile = window.innerWidth < MOBILE_BP;
      setIsMobile(mobile);
      if (mobile) return; // bottom sheet uses CSS

      const rect = anchorEl?.getBoundingClientRect() ?? anchorRect ?? null;
      if (!rect) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuH = menuRef.current?.offsetHeight ?? 260;
      const reactionsH = reactionsRef.current?.offsetHeight ?? 48;

      // Reactions bar: above the bubble, aligned to bubble's inner edge
      let rLeft = isMine ? rect.right - REACTIONS_WIDTH : rect.left;
      rLeft = Math.max(MARGIN, Math.min(rLeft, vw - REACTIONS_WIDTH - MARGIN));
      let rTop = rect.top - reactionsH - GAP;
      // If no room above, place below the bubble
      const reactionsBelow = rTop < MARGIN;
      if (reactionsBelow) rTop = rect.bottom + GAP;

      // Menu: on the free side of the bubble; if not enough side room, place below
      let mLeft = isMine ? rect.left - MENU_WIDTH - GAP : rect.right + GAP;
      let placeBesideMenu = mLeft >= MARGIN && mLeft + MENU_WIDTH <= vw - MARGIN;
      let mTop: number;
      if (placeBesideMenu) {
        mTop = rect.top;
        if (mTop + menuH > vh - MARGIN) mTop = Math.max(MARGIN, vh - menuH - MARGIN);
      } else {
        // Stack menu under the reactions bar (or under bubble)
        mLeft = isMine ? rect.right - MENU_WIDTH : rect.left;
        mLeft = Math.max(MARGIN, Math.min(mLeft, vw - MENU_WIDTH - MARGIN));
        const baseTop = reactionsBelow ? rTop + reactionsH + GAP : rect.bottom + GAP;
        mTop = baseTop;
        if (mTop + menuH > vh - MARGIN) {
          // Try above the reactions
          const alt = (reactionsBelow ? rect.top : rTop) - menuH - GAP;
          mTop = alt >= MARGIN ? alt : Math.max(MARGIN, vh - menuH - MARGIN);
        }
      }

      setReactionsPos({ top: rTop, left: rLeft });
      setMenuPos({ top: mTop, left: mLeft });
    };

    compute();

    let rafId = 0;
    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; compute(); });
    };

    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);

    let ro: ResizeObserver | null = null;
    if (anchorEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(schedule);
      ro.observe(anchorEl);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      ro?.disconnect();
    };
  }, [open, anchorEl, anchorRect, isMine, message?.id]);

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

  const reactionsBar = !isUnsent && (
    <div
      ref={reactionsRef}
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1 rounded-full border border-border bg-popover px-2 py-1.5 shadow-xl"
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onReact(emoji); close(); }}
          className="text-2xl leading-none hover:scale-125 active:scale-110 transition-transform p-1"
          aria-label={`React ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  const menuItems = (
    <>
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
    </>
  );

  if (isMobile) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/40 animate-in fade-in-0 duration-150"
        onClick={close}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col gap-3 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 animate-in slide-in-from-bottom-4 duration-200"
        >
          {reactionsBar && (
            <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              {reactionsBar}
            </div>
          )}
          <div className="rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="py-2">{menuItems}</div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden" onClick={close}>
      <div
        style={reactionsPos
          ? { top: reactionsPos.top, left: reactionsPos.left, visibility: "visible" }
          : { top: 0, left: 0, visibility: "hidden" }}
        className="fixed animate-in fade-in-0 zoom-in-95 duration-100"
      >
        {reactionsBar}
      </div>
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        style={menuPos
          ? { top: menuPos.top, left: menuPos.left, width: MENU_WIDTH, visibility: "visible" }
          : { top: 0, left: 0, width: MENU_WIDTH, visibility: "hidden" }}
        className="fixed rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 py-1"
      >
        {menuItems}
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
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-left hover:bg-muted transition-colors ${destructive ? "text-destructive" : ""}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
