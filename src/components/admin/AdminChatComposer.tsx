import { type RefObject, type ChangeEvent } from "react";
import { Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoResizeTextarea } from "@/components/chat/AutoResizeTextarea";
import { EmojiPicker } from "@/components/EmojiPicker";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onTyping: () => void;
  onSend: () => void;
  sending: boolean;
  uploading: boolean;
  isEditing: boolean;
  isTouch: boolean;
  inputRef: RefObject<HTMLTextAreaElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  onPickImage: (e: ChangeEvent<HTMLInputElement>) => void;
  restoreInputFocus: (force?: boolean) => void;
}

export function AdminChatComposer({
  value,
  onChange,
  onTyping,
  onSend,
  sending,
  uploading,
  isEditing,
  isTouch,
  inputRef,
  fileInputRef,
  onPickImage,
  restoreInputFocus,
}: Props) {
  return (
    <div className="pt-2 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-1.5 sm:gap-2 w-full">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
        <EmojiPicker inputRef={inputRef} onSelect={(emoji) => onChange(value + emoji)} />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="ছবি পাঠান"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-primary" />}
        </Button>
        <AutoResizeTextarea
          ref={inputRef}
          placeholder={isEditing ? "এডিট করুন..." : "উত্তর লিখুন..."}
          value={value}
          onChange={(e) => { onChange(e.target.value); onTyping(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isTouch) {
              e.preventDefault();
              onSend();
            }
          }}
          className="bg-card flex-1 min-w-0"
          maxHeight={120}
        />
        <Button
          type="button"
          tabIndex={-1}
          variant="hero"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label="মেসেজ পাঠান"
          onMouseDown={(e) => { e.preventDefault(); restoreInputFocus(true); }}
          onTouchStart={(e) => { e.preventDefault(); restoreInputFocus(true); }}
          onPointerDown={(e) => { e.preventDefault(); restoreInputFocus(true); if (!sending) onSend(); }}
          onClick={(e) => e.preventDefault()}
          disabled={!value.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
