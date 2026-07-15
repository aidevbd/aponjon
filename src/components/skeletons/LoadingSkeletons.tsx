import { Skeleton } from "@/components/ui/skeleton";

/** Row skeleton for chat user / contact preview lists (avatar + 2 lines + meta). */
export function ChatUserRowSkeleton() {
  return (
    <div className="w-full flex items-center gap-3 rounded-xl p-3 border border-transparent">
      <Skeleton className="h-11 w-11 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-10 ml-auto" />
        </div>
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function ChatUserListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1" aria-busy="true" aria-label="লোড হচ্ছে">
      {Array.from({ length: rows }).map((_, i) => (
        <ChatUserRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Row skeleton for admin contact list item (avatar + name + phone + badges). */
export function ContactListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-6 w-14 rounded-full" />
    </div>
  );
}

export function ContactListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1" aria-busy="true" aria-label="লোড হচ্ছে">
      {Array.from({ length: rows }).map((_, i) => (
        <ContactListItemSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full admin dashboard skeleton — mimics header + hero card + pills + quick actions + list. */
export function AdminDashboardSkeleton() {
  return (
    <div className="min-h-screen warm-gradient" aria-busy="true" aria-label="ড্যাশবোর্ড লোড হচ্ছে">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-3 max-w-7xl space-y-4">
        {/* Tabs */}
        <div className="grid grid-cols-5 gap-0.5 p-1 bg-muted/40 rounded-md">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>

        {/* Welcome card */}
        <div className="glass-card p-4 flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-3 flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
