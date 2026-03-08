import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";

interface ContactFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  filterCategory: string;
  onCategoryChange: (val: string) => void;
  filterBloodGroup: string;
  onBloodGroupChange: (val: string) => void;
  categoryCount: Record<string, number>;
}

export function ContactFilters({
  search, onSearchChange,
  filterCategory, onCategoryChange,
  filterBloodGroup, onBloodGroupChange,
  categoryCount,
}: ContactFiltersProps) {
  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="নাম, নম্বর বা কি-ওয়ার্ড..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-card h-9 text-sm"
        />
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onCategoryChange("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
            filterCategory === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
          }`}
        >
          সব
        </button>
        {CATEGORIES.map((cat) => {
          const count = categoryCount[cat.value] || 0;
          if (count === 0) return null;
          return (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(filterCategory === cat.value ? "all" : cat.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors border flex items-center gap-1 ${
                filterCategory === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.value}</span>
              <span className={`text-[10px] rounded-full px-1 ${
                filterCategory === cat.value ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Blood Group Filter */}
      <Select value={filterBloodGroup} onValueChange={onBloodGroupChange}>
        <SelectTrigger className="bg-card h-8 text-xs w-40">
          <SelectValue placeholder="রক্তের গ্রুপ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">সব গ্রুপ</SelectItem>
          {BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
