export interface Contact {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  imo?: string;
  email?: string;
  category: string;
  customCategory?: string;
  note?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: string;
  secretCode?: string;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORIES = [
  { value: "পরিবার", label: "💕 পরিবার", icon: "💕" },
  { value: "আত্মীয়", label: "🏠 আত্মীয়", icon: "🏠" },
  { value: "বন্ধু", label: "🤝 বন্ধু", icon: "🤝" },
  { value: "সহকর্মী", label: "💼 সহকর্মী", icon: "💼" },
  { value: "প্রতিবেশী", label: "🏘️ প্রতিবেশী", icon: "🏘️" },
  { value: "শিক্ষক/গুরু", label: "📚 শিক্ষক/গুরু", icon: "📚" },
  { value: "জরুরি", label: "🚨 জরুরি", icon: "🚨" },
  { value: "অন্যান্য", label: "✨ অন্যান্য", icon: "✨" },
] as const;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
