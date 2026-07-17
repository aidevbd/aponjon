import { Skeleton } from "@/components/ui/skeleton";

/** Chat message list skeleton — mimics alternating incoming/outgoing bubbles. */
export function ChatMessagesSkeleton({ rows = 6 }: { rows?: number }) {
  // Predefined bubble widths + sides for a natural staggered look
  const bubbles: { mine: boolean; w: string }[] = [
    { mine: false, w: "w-[55%]" },
    { mine: true,  w: "w-[45%]" },
    { mine: false, w: "w-[70%]" },
    { mine: true,  w: "w-[35%]" },
    { mine: false, w: "w-[50%]" },
    { mine: true,  w: "w-[60%]" },
    { mine: false, w: "w-[40%]" },
    { mine: true,  w: "w-[55%]" },
  ];
  return (
    <div
      className="flex-1 overflow-hidden px-4 py-4 space-y-3"
      aria-busy="true"
      aria-label="মেসেজ লোড হচ্ছে"
    >
      {/* Date header skeleton */}
      <div className="flex justify-center my-2">
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
      {bubbles.slice(0, rows).map((b, i) => (
        <div
          key={i}
          className={`flex items-end gap-2 ${b.mine ? "justify-end" : "justify-start"}`}
        >
          {!b.mine && <Skeleton className="h-7 w-7 rounded-full shrink-0" />}
          <div className={`flex flex-col gap-1 ${b.mine ? "items-end" : "items-start"}`}>
            <Skeleton
              className={`h-9 ${b.w} min-w-[80px] ${
                b.mine ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md"
              }`}
            />
            {i % 3 === 0 && <Skeleton className="h-2.5 w-10" />}
          </div>
        </div>
      ))}
    </div>
  );
}
