import { Mail } from "lucide-react";

/** কাউকে বাছার আগে ডান পাশের খালি অবস্থা (heirloom টোন)। */
export const ChatEmptyState = () => (
  <div className="flex-1 flex items-center justify-center text-center px-6">
    <div className="max-w-xs">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
        <Mail className="h-6 w-6 text-primary/60" aria-hidden="true" />
      </div>
      <p className="font-display text-base text-foreground">এখনো কথা শুরু হয়নি</p>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
        বাম দিকের তালিকা থেকে একজন আপনজনকে বাছুন — তারপর এখানে মনের কথা লেখা যাবে।
      </p>
    </div>
  </div>
);
