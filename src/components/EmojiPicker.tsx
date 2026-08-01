import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { swallow } from "@/lib/devLog";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: "😀", emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"] },
  { label: "❤️", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","💋","💯","💢","💥","💫","💦","💨","🕳️","💣","💬","👁️‍🗨️","🗨️","🗯️","💭","💤"] },
  { label: "👋", emojis: ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄"] },
  { label: "🎉", emojis: ["🎉","🎊","🎈","🎁","🎗️","🎟️","🎫","🎖️","🏆","🏅","🥇","🥈","🥉","⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥅","⛳","🏒","🏑","🥍","🏏","🪃","🎯","🪁","🎮","🕹️","🎰","🎲","♟️","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🪗","🎸","🪕","🎻","🎪"] },
  { label: "🍔", emojis: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🫘","🥐","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫓","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🥛","🫗","🍼","🫖","☕","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾","🧊"] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  /** Optional: input ref to keep focused after each emoji insert (prevents mobile keyboard collapse). */
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
}

export function EmojiPicker({ onSelect, inputRef }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Prevent the picker from stealing focus from the message input.
  // Using onMouseDown/onPointerDown with preventDefault keeps the input focused,
  // which keeps the on-screen keyboard open on mobile.
  const preventFocusSteal = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const handleEmojiPick = (emoji: string) => {
    onSelect(emoji);
    // Restore focus to the input so the keyboard stays open
    if (inputRef?.current) {
      const el = inputRef.current;
      requestAnimationFrame(() => {
        el.focus({ preventScroll: true });
        try {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        } catch (e) { swallow("EmojiPicker.restoreCaret", e); }
      });
    }
  };

  return (
    <div className="relative" ref={ref} onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        aria-label="ইমোজি খুলুন"
        onMouseDown={preventFocusSteal}
        onPointerDown={preventFocusSteal}
        onClick={(e) => { e.preventDefault(); setOpen(!open); }}
        type="button"
      >
        <Smile className="h-4 w-4 text-primary" />
      </Button>
      {open && (
        <div className="absolute bottom-12 left-0 z-50 w-72 rounded-xl border border-border bg-card shadow-lg" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}>
          <div className="flex border-b border-border/50 px-1 pt-1">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={preventFocusSteal}
                onPointerDown={preventFocusSteal}
                onClick={(e) => { e.preventDefault(); setTab(i); }}
                className={`flex-1 py-1.5 text-sm rounded-t-lg transition-colors ${tab === i ? "bg-primary/10" : "hover:bg-muted"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto no-scrollbar">
            {EMOJI_CATEGORIES[tab].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onMouseDown={preventFocusSteal}
                onPointerDown={preventFocusSteal}
                onClick={(e) => { e.preventDefault(); handleEmojiPick(emoji); }}
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
