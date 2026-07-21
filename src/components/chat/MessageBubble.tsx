import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reply, CheckCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageLightbox } from "./ImageLightbox";
import { ChatImage } from "./ChatImage";
import { Highlight } from "@/lib/highlight";



export type ReactionEntry = { emoji: string; reactor_id: string };

export type BubbleMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;

  edited_at?: string | null;
  reply_to_id?: string | null;
  reply_content?: string | null;
  reply_sender_id?: string | null;
  is_pinned?: boolean;
  unsent_at?: string | null;
  has_edit_history?: boolean;
  reactions?: ReactionEntry[];
};

interface MessageBubbleProps {
  msg: BubbleMessage;
  isMine: boolean;
  myId: string;
  otherName: string;
  showTail: boolean; // last in a row from same sender
  showAvatar?: boolean; // for incoming, show avatar near tail
  avatarUrl?: string | null;
  onOpenActions: (msg: BubbleMessage, anchorRect: DOMRect | null, anchorEl?: HTMLElement | null) => void;
  onQuickReact: (msg: BubbleMessage, emoji: string) => void;
  onStartReply: (msg: BubbleMessage) => void;
  onShowEditHistory?: (msg: BubbleMessage) => void;
  onShowReceipts?: (msg: BubbleMessage) => void;
  onJumpToReply?: (replyToId: string) => void;
  highlight?: boolean;
  highlightQuery?: string;
  isDelivered?: boolean; // sent but not yet read
  showReceipt?: boolean; // last of mine in conversation
}

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const SWIPE_THRESHOLD = 60;

export function MessageBubble({
  msg, isMine, myId, otherName, showTail, showAvatar, avatarUrl,
  onOpenActions, onQuickReact, onStartReply, onShowEditHistory, onShowReceipts, onJumpToReply,
  highlight, highlightQuery, isDelivered, showReceipt,
}: MessageBubbleProps) {
  const [dragX, setDragX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const swipedRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showQuickBar, setShowQuickBar] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const movedRef = useRef(false);


  const isUnsent = !!msg.unsent_at;

  // Group reactions by emoji
  const reactionMap = new Map<string, { count: number; mine: boolean }>();
  (msg.reactions || []).forEach((r) => {
    const e = reactionMap.get(r.emoji) || { count: 0, mine: false };
    e.count += 1;
    if (r.reactor_id === myId) e.mine = true;
    reactionMap.set(r.emoji, e);
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isUnsent) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    swipedRef.current = false;
    movedRef.current = false;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      if (movedRef.current) return;
      const rect = wrapperRef.current?.getBoundingClientRect() || null;
      onOpenActions(msg, rect, wrapperRef.current);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 420);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) movedRef.current = true;
    // Swipe right (incoming) or left (mine) to reply
    const swipeDir = isMine ? -1 : 1;
    if (Math.sign(dx) === swipeDir && Math.abs(dy) < 30) {
      e.preventDefault?.();
      const next = Math.max(-90, Math.min(90, dx));
      setDragX(next);
      if (Math.abs(next) > SWIPE_THRESHOLD && !swipedRef.current) {
        swipedRef.current = true;
        if (navigator.vibrate) navigator.vibrate(8);
      }
    }
    if (longPressTimerRef.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (swipedRef.current) onStartReply(msg);
    setDragX(0);
    startXRef.current = null;
    startYRef.current = null;
    setTimeout(() => { swipedRef.current = false; }, 100);
  };

  // Hover quick bar (desktop)
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const hasImage = !!msg.image_url && !isUnsent;
  const hasText = !!msg.content && !isUnsent;
  const imageOnly = hasImage && !hasText;

  const bubbleBase = cn(
    "relative inline-block max-w-full text-[15px] leading-[1.45] break-words whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]",
    imageOnly ? "p-1" : "px-3.5 py-2",
    "transition-shadow",
    isUnsent
      ? "bg-card border border-dashed border-border text-foreground"
      : imageOnly
        ? "bg-transparent"
        : isMine
          ? "bg-primary text-primary-foreground"
          : "bg-card border border-border/50 text-foreground",
    // Messenger-style rounded corners with tail on the last bubble of a group
    isMine
      ? showTail
        ? "rounded-2xl rounded-br-md"
        : "rounded-2xl rounded-br-2xl"
      : showTail
        ? "rounded-2xl rounded-bl-md"
        : "rounded-2xl rounded-bl-2xl",
    highlight && "ring-2 ring-primary/50",
    msg.is_pinned && "ring-1 ring-primary/30",
    isUnsent && "italic opacity-60",
  );

  return (
    <div
      ref={wrapperRef}
      data-msg-id={msg.id}
      className={cn(
        "group/msg relative flex w-full mb-0.5 select-none scroll-mt-24 transition-shadow duration-300",
        isMine ? "justify-end pl-10" : "justify-start pr-10",
        highlight && "rounded-xl ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
      )}
      onMouseEnter={() => setShowQuickBar(true)}
      onMouseLeave={() => setShowQuickBar(false)}
    >
      {/* Reply hint icon when swiping */}
      {dragX !== 0 && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity",
            isMine ? "right-0" : "left-0",
          )}
          style={{ opacity: Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD) }}
        >
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            Math.abs(dragX) > SWIPE_THRESHOLD ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}>
            <Reply className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Avatar slot for incoming */}
      {!isMine && (
        <div className="w-7 mr-1.5 shrink-0 self-end">
          {showAvatar && (
            avatarUrl ? (
              <img src={avatarUrl} alt={otherName} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                {otherName.charAt(0)}
              </div>
            )
          )}
        </div>
      )}

      <motion.div
        className={cn("flex flex-col max-w-[78%] sm:max-w-[70%] min-w-0", isMine ? "items-end" : "items-start")}
        animate={{ x: dragX }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          const rect = wrapperRef.current?.getBoundingClientRect() || null;
          onOpenActions(msg, rect, wrapperRef.current);
        }}
      >
        {/* Reply quote */}
        {msg.reply_content && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (msg.reply_to_id && onJumpToReply) onJumpToReply(msg.reply_to_id);
            }}
            className={cn(
              "max-w-[75%] mb-1 px-2.5 py-1 rounded-lg text-[11px] border-l-2 -mb-1.5 pb-3 text-left cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity",
              isMine
                ? "bg-primary/10 border-primary/40 text-foreground/80 mr-2"
                : "bg-muted border-primary/40 text-foreground/80 ml-2",
            )}
          >
            <div className="font-semibold opacity-75">
              {msg.reply_sender_id === myId ? "আপনি" : otherName}
            </div>
            <div className="truncate opacity-80">{msg.reply_content}</div>
          </button>
        )}

        <div className={bubbleBase}>
          {isUnsent ? (
            <span className="text-xs">
              {isMine ? "আপনি একটি মেসেজ আনসেন্ড করেছেন" : `${otherName} একটি মেসেজ আনসেন্ড করেছেন`}
            </span>
          ) : (
            <>
              {msg.image_url && (
                <ChatImage
                  src={msg.image_url}
                  alt="পাঠানো ছবি"
                  onOpen={() => setLightboxOpen(true)}
                  className={hasText ? "mb-1.5" : undefined}
                />
              )}

              {msg.content && <span>{highlightQuery ? <Highlight text={msg.content} query={highlightQuery} /> : msg.content}</span>}
            </>
          )}
        </div>

        {/* Reactions chip — overlapping bubble bottom */}
        {reactionMap.size > 0 && !isUnsent && (
          <div className={cn(
            "-mt-2 flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 shadow-sm relative z-10",
            isMine ? "mr-2" : "ml-2",
          )}>
            {Array.from(reactionMap.entries()).slice(0, 3).map(([emoji, info]) => (
              <button
                key={emoji}
                onClick={(e) => { e.stopPropagation(); onQuickReact(msg, emoji); }}
                className={cn("text-[11px] leading-none", info.mine && "")}
                title={info.mine ? "ক্লিক করে সরান" : ""}
              >
                <span>{emoji}</span>
              </button>
            ))}
            {(msg.reactions?.length || 0) > 1 && (
              <span className="text-[10px] text-muted-foreground ml-0.5">
                {msg.reactions!.length}
              </span>
            )}
          </div>
        )}

        {/* Edited label */}
        {msg.edited_at && !isUnsent && (
          <button
            onClick={(e) => { e.stopPropagation(); onShowEditHistory?.(msg); }}
            className={cn(
              "text-[10px] mt-0.5 opacity-60 hover:underline",
              isMine ? "mr-2" : "ml-2",
            )}
          >
            এডিটেড{msg.has_edit_history ? " · দেখুন" : ""}
          </button>
        )}

        {/* Read receipt for last own message */}
        {isMine && showReceipt && !isUnsent && (() => {
          const fmt = (iso?: string | null) => {
            if (!iso) return "";
            const d = new Date(iso);
            return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
          };
          const sentTime = fmt(msg.created_at);
          const deliveredTime = fmt(msg.delivered_at);
          const readTime = fmt(msg.read_at);
          return (
            <button
              onClick={(e) => { e.stopPropagation(); onShowReceipts?.(msg); }}
              className="mt-0.5 mr-2 flex items-center gap-1 text-[10px] text-muted-foreground"
              title={
                (msg.is_read && readTime && `Seen ${readTime}`) ||
                (msg.delivered_at && deliveredTime && `Delivered ${deliveredTime}`) ||
                (sentTime && `Sent ${sentTime}`) || ""
              }
            >
              {msg.is_read ? (
                <>
                  <CheckCheck className="h-3 w-3 text-primary" />
                  <span>Seen{readTime ? ` · ${readTime}` : ""}</span>
                </>
              ) : isDelivered ? (
                <>
                  <CheckCheck className="h-3 w-3" />
                  <span>Delivered{deliveredTime ? ` · ${deliveredTime}` : ""}</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  <span>Sent{sentTime ? ` · ${sentTime}` : ""}</span>
                </>
              )}
            </button>
          );
        })()}
      </motion.div>

      {/* Hover quick action bar (desktop) */}
      <AnimatePresence>
        {showQuickBar && !isUnsent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "hidden md:flex absolute top-1/2 -translate-y-1/2 items-center gap-0.5 bg-card border border-border rounded-full px-1 py-0.5 shadow-md",
              isMine ? "right-full mr-1" : "left-full ml-1",
            )}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onQuickReact(msg, "❤️"); }}
              className="h-6 w-6 hover:bg-muted rounded-full text-[13px]"
              title="React"
            >❤️</button>
            <button
              onClick={(e) => { e.stopPropagation(); onStartReply(msg); }}
              className="h-6 w-6 flex items-center justify-center hover:bg-muted rounded-full"
              title="Reply"
            >
              <Reply className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const rect = wrapperRef.current?.getBoundingClientRect() || null;
                onOpenActions(msg, rect, wrapperRef.current);
              }}
              className="h-6 w-6 flex items-center justify-center hover:bg-muted rounded-full text-base leading-none"
              title="More"
            >…</button>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageLightbox
        src={lightboxOpen ? msg.image_url : null}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}


export { QUICK_EMOJIS };
