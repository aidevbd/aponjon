// Pure formatting helpers extracted from Chat.tsx

export const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
};

export const getDateLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000);
  if (diffDays === 0) return "আজ";
  if (diffDays === 1) return "গতকাল";
  if (diffDays < 7) return d.toLocaleDateString("bn-BD", { weekday: "long" });
  return d.toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
};

export const shouldShowDateHeader = <T extends { created_at: string }>(msgs: T[], idx: number) => {
  if (idx === 0) return true;
  const prev = new Date(msgs[idx - 1].created_at).toDateString();
  const curr = new Date(msgs[idx].created_at).toDateString();
  return prev !== curr;
};

export const formatLastSeen = (presence?: { is_online: boolean; last_seen_at: string }) => {
  if (!presence) return null;
  if (presence.is_online) return "এখন অনলাইন";
  const diff = Date.now() - new Date(presence.last_seen_at).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "এইমাত্র অনলাইন ছিলেন";
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ঘন্টা আগে`;
  const days = Math.floor(hours / 24);
  return `${days} দিন আগে`;
};
