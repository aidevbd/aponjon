import { motion } from "framer-motion";
import { Search, UserPlus, Users } from "lucide-react";
import { ContactFilters } from "@/components/ContactFilters";
import { VirtualContactList } from "@/components/VirtualContactList";
import type { ContactRow } from "@/lib/store";

interface Props {
  contacts: ContactRow[];
  filtered: ContactRow[];
  query: string;
  search: string;
  onSearchChange: (v: string) => void;
  filterCategory: string;
  onCategoryChange: (v: string) => void;
  filterBloodGroup: string;
  onBloodGroupChange: (v: string) => void;
  categoryCount: Record<string, number>;
  highlightedId: string | null;
  onPickContact: (c: ContactRow) => void;
  onResetFilters: () => void;
  onAddContact: () => void;
}

export function AdminContactsTab({
  contacts,
  filtered,
  query,
  search,
  onSearchChange,
  filterCategory,
  onCategoryChange,
  filterBloodGroup,
  onBloodGroupChange,
  categoryCount,
  highlightedId,
  onPickContact,
  onResetFilters,
  onAddContact,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 sm:space-y-4">
      <div className="sticky top-0 z-40 -mx-3 sm:mx-0 rounded-none sm:rounded-sm border-y sm:border border-heirloom-line bg-heirloom-paper px-3 py-2.5 shadow-heirloom-sticky-soft">
        <ContactFilters
          search={search}
          onSearchChange={onSearchChange}
          filterCategory={filterCategory}
          onCategoryChange={onCategoryChange}
          filterBloodGroup={filterBloodGroup}
          onBloodGroupChange={onBloodGroupChange}
          categoryCount={categoryCount}
          contacts={contacts}
          onPickContact={onPickContact}
          totalCount={contacts.length}
        />
      </div>

      {contacts.length > 0 && filtered.length !== contacts.length && (
        <div className="px-1 text-[12px] text-heirloom-ink-soft">
          <span className="text-heirloom-gold-deep">{filtered.length}</span>
          {" / "}{contacts.length} জন মিলেছে
        </div>
      )}

      {contacts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center py-16"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-heirloom-gold/[0.4] bg-heirloom-gold/[0.08]">
            <Users className="h-6 w-6 text-heirloom-gold-deep" />
          </div>
          <div aria-hidden className="mt-5 h-px w-24 bg-gradient-to-r from-transparent via-heirloom-gold to-transparent" />
          <h3 className="mt-5 font-display text-2xl leading-[1.15] tracking-tight text-heirloom-ink">
            কোনো কন্টাক্ট নেই
          </h3>
          <p className="mt-3 max-w-sm text-[14px] leading-[1.6] text-heirloom-ink-soft">
            আপনার প্রিয়জনদের তথ্য যোগ করা শুরু করুন।
          </p>
          <button
            onClick={onAddContact}
            className="heirloom-btn-primary mt-8 flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-[14px] font-medium transition-all duration-300"
          >
            <UserPlus className="h-4 w-4" />
            প্রথম কন্টাক্ট যোগ করুন
          </button>
        </motion.div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center text-center py-14">
          <Search className="h-8 w-8 text-heirloom-ink-mute opacity-60" />
          <p className="mt-4 text-[14px] text-heirloom-ink-soft">কোনো কন্টাক্ট পাওয়া যায়নি</p>
          <button
            onClick={onResetFilters}
            className="mt-3 text-[12px] text-heirloom-gold-deep underline-offset-4 hover:underline"
          >
            ফিল্টার রিসেট করুন
          </button>
        </div>
      ) : (
        <VirtualContactList
          contacts={filtered}
          query={query}
          highlightedId={highlightedId}
          onClick={onPickContact}
        />
      )}
    </div>
  );
}
