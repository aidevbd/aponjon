import {
  HeartHandshake,
  Users2,
  Coffee,
  Briefcase,
  Trees,
  BookOpen,
  LifeBuoy,
  Feather,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  "পরিবার": HeartHandshake,
  "আত্মীয়": Users2,
  "বন্ধু": Coffee,
  "সহকর্মী": Briefcase,
  "প্রতিবেশী": Trees,
  "শিক্ষক/গুরু": BookOpen,
  "জরুরি": LifeBuoy,
  "অন্যান্য": Feather,
};

export function getCategoryIcon(value?: string | null): LucideIcon {
  if (!value) return Feather;
  return CATEGORY_ICON[value] ?? Feather;
}

interface CategoryIconProps {
  category?: string | null;
  className?: string;
  strokeWidth?: number;
}

export function CategoryIcon({ category, className = "h-4 w-4", strokeWidth = 1.75 }: CategoryIconProps) {
  const Icon = getCategoryIcon(category);
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
