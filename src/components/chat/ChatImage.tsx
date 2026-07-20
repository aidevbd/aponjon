import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface ChatImageProps {
  src: string;
  alt?: string;
  onOpen?: () => void;
  className?: string;
  maxWidth?: number;
  initialAspect?: string; // e.g. "4 / 3"
}

/**
 * Progressive, lazy-loaded chat image.
 * - Reserves aspect-ratio to prevent layout shift.
 * - IntersectionObserver defers actual network fetch until near viewport.
 * - Shimmer skeleton until decoded, then fades in.
 * - Snaps to real natural aspect ratio once loaded.
 */
export function ChatImage({
  src,
  alt = "ছবি",
  onOpen,
  className,
  maxWidth = 240,
  initialAspect = "4 / 3",
}: ChatImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative mb-1.5 overflow-hidden rounded-lg bg-muted/40",
        className,
      )}
      style={{ width: `min(${maxWidth}px, 100%)`, aspectRatio: initialAspect }}
    >
      {/* Shimmer skeleton */}
      {!loaded && !errored && (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-muted/40 via-muted/70 to-muted/40 bg-[length:200%_100%] animate-[shimmer_1.4s_linear_infinite]"
        />
      )}

      {errored && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
          <ImageOff className="h-5 w-5" />
          <span>ছবি লোড হয়নি</span>
        </div>
      )}

      {inView && !errored && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          role={onOpen ? "button" : undefined}
          tabIndex={onOpen ? 0 : undefined}
          aria-label={onOpen ? "ছবি বড় করে দেখুন" : undefined}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            onOpen && "cursor-pointer",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={(e) => {
            const img = e.currentTarget;
            const parent = wrapRef.current;
            if (parent && img.naturalWidth && img.naturalHeight) {
              parent.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
            }
            setLoaded(true);
          }}
          onError={() => setErrored(true)}
          onClick={onOpen ? (e) => { e.stopPropagation(); onOpen(); } : undefined}
          onKeyDown={onOpen ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onOpen();
            }
          } : undefined}
        />
      )}
    </div>
  );
}
