import {
  HeartHandshake,
  Users,
  Coffee,
  Briefcase,
  TreePine,
  BookOpen,
  Siren,
  Bookmark,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  "পরিবার": HeartHandshake,
  "আত্মীয়": Users,
  "বন্ধু": Coffee,
  "সহকর্মী": Briefcase,
  "প্রতিবেশী": TreePine,
  "শিক্ষক/গুরু": BookOpen,
  "জরুরি": Siren,
  "অন্যান্য": Bookmark,
};

export function CategoryIcon({
  category,
  className = "h-3 w-3",
}: {
  category?: string | null;
  className?: string;
}) {
  const Icon = (category && MAP[category]) || Bookmark;
  return <Icon className={className} strokeWidth={1.6} />;
}
