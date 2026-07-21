import { forwardRef, useEffect, useImperativeHandle, useRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Max height in px before internal scrolling kicks in. Default 120. */
  maxHeight?: number;
  /** Min height in px (single line). Default 36 to match h-9 inputs. */
  minHeight?: number;
}

/**
 * Textarea that grows with content up to `maxHeight`, then scrolls internally.
 * Styled to match the app's `<Input>` sizing so it drops into the chat composer.
 */
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, maxHeight = 120, minHeight = 36, value, onChange, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement, []);

    const resize = () => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    };

    useEffect(() => {
      resize();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    useEffect(() => {
      resize();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <textarea
        ref={innerRef}
        rows={1}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          resize();
        }}
        style={{ minHeight, maxHeight, resize: "none", overflowX: "hidden" }}
        className={cn(
          "flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm leading-5",
          "ring-offset-background placeholder:text-muted-foreground no-scrollbar",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
AutoResizeTextarea.displayName = "AutoResizeTextarea";
