import { Download, LogOut } from "lucide-react";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

interface Props {
  adminEmail: string;
  contactCount: number;
  onLogout: () => void;
  onExportCSV: () => void;
}

export function AdminSettingsTab({ adminEmail, contactCount, onLogout, onExportCSV }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <div className="mb-3 px-1">
          <h2 className="font-display text-[15px] tracking-tight text-heirloom-ink">অ্যাকাউন্ট</h2>
          <p className="mt-0.5 text-[12px] text-heirloom-ink-soft">লগইন সেশন ও পরিচয়</p>
        </div>
        <div className="rounded-sm border border-heirloom-line bg-heirloom-paper/[0.6] divide-y divide-heirloom-line">
          <div className="flex items-center justify-between gap-4 p-4 sm:px-5">
            <div className="min-w-0">
              <div className="text-[13px] text-heirloom-ink">সাইন-ইন করা আছেন</div>
              <div className="mt-0.5 truncate text-[12px] text-heirloom-ink-soft">{adminEmail || "—"}</div>
            </div>
            <span className="shrink-0 rounded-full border border-heirloom-gold/[0.4] bg-heirloom-gold/[0.08] px-2 py-0.5 text-micro uppercase tracking-[0.12em] text-heirloom-gold-deep">
              অ্যাডমিন
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 p-4 sm:px-5">
            <div className="min-w-0">
              <div className="text-[13px] text-heirloom-ink">লগআউট</div>
              <div className="mt-0.5 text-[12px] text-heirloom-ink-soft">এই ডিভাইস থেকে সেশন বন্ধ করুন</div>
            </div>
            <button
              onClick={onLogout}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-sm border border-destructive/40 bg-heirloom-paper px-3 py-1.5 text-[13px] text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              লগআউট
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 px-1">
          <h2 className="font-display text-[15px] tracking-tight text-heirloom-ink">সিকিউরিটি</h2>
          <p className="mt-0.5 text-[12px] text-heirloom-ink-soft">পাসওয়ার্ড পরিবর্তন করুন</p>
        </div>
        <ChangePasswordForm />
      </section>

      <section>
        <div className="mb-3 px-1">
          <h2 className="font-display text-[15px] tracking-tight text-heirloom-ink">ডেটা</h2>
          <p className="mt-0.5 text-[12px] text-heirloom-ink-soft">ব্যাকআপ ও এক্সপোর্ট</p>
        </div>
        <div className="rounded-sm border border-heirloom-line bg-heirloom-paper/[0.6] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] text-heirloom-ink">কন্টাক্ট CSV এক্সপোর্ট</div>
              <p className="mt-0.5 text-[12px] leading-[1.6] text-heirloom-ink-soft">
                সব কন্টাক্টের একটি CSV কপি ডাউনলোড করে নিরাপদে সংরক্ষণ করুন।
              </p>
            </div>
            <button
              onClick={onExportCSV}
              disabled={contactCount === 0}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-sm border border-heirloom-gold/[0.5] bg-heirloom-paper px-4 py-2 text-[13px] text-heirloom-gold-deep transition-colors hover:bg-heirloom-cream/[0.6] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              CSV ডাউনলোড {contactCount > 0 && <span className="text-heirloom-ink-soft">({contactCount})</span>}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
