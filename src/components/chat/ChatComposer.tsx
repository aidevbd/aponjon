import { forwardRef } from "react";
import { Loader2, Image as ImageIcon, Send, Pencil, Reply, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/EmojiPicker";
import { AutoResizeTextarea } from "@/components/chat/AutoResizeTextarea";

type MinimalMsg = { id: string; content: string | null };

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onImagePick: (file: File) => void;
  onCancelEditReply: () => void;
  onFocusInput: (force?: boolean) => void;
  emitTyping: () => void;
  sending: boolean;
  uploading: boolean;
  editingMsg: MinimalMsg | null;
  replyingTo: MinimalMsg | null;
  isTouch: boolean;
};

export const ChatComposer = forwardRef<HTMLTextAreaElement, Props>(function ChatComposer(
  {
    value,
    onChange,
    onSend,
    onImagePick,
    onCancelEditReply,
    onFocusInput,
    emitTyping,
    sending,
    uploading,
    editingMsg,
    replyingTo,
    isTouch,
  },
  inputRef,
) {
  const fileInputId = "chat-composer-file-input";

  return (
    <>
      {(editingMsg || replyingTo) && (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-xs">
            {editingMsg && (
              <>
                <Pencil className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate flex-1">এডিট করছেন: {editingMsg.content}</span>
              </>
            )}
            {replyingTo && (
              <>
                <Reply className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate flex-1">রিপ্লাই: {replyingTo.content || "ছবি"}</span>
              </>
            )}
            <button onClick={onCancelEditReply} className="shrink-0" aria-label="বাতিল">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm py-2 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <div className="flex items-end gap-1.5 sm:gap-2 w-full">
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImagePick(file);
              e.target.value = "";
            }}
            className="hidden"
          />
          <div className="flex items-center shrink-0">
            <EmojiPicker
              inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
              onSelect={(emoji) => onChange(value + emoji)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="ছবি পাঠান"
              onClick={() => document.getElementById(fileInputId)?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4 text-primary" />
              )}
            </Button>
          </div>
          <AutoResizeTextarea
            ref={inputRef}
            placeholder={editingMsg ? "এডিট করুন..." : "মেসেজ লিখুন..."}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              emitTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isTouch) {
                e.preventDefault();
                onSend();
              }
            }}
            className="flex-1 min-w-0"
            maxHeight={120}
          />
          <Button
            type="button"
            tabIndex={-1}
            variant="hero"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            aria-label="মেসেজ পাঠান"
            onMouseDown={(e) => {
              e.preventDefault();
              onFocusInput(true);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              onFocusInput(true);
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              onFocusInput(true);
              if (!sending) onSend();
            }}
            onClick={(e) => e.preventDefault()}
            disabled={!value.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
});
