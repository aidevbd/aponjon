import { useCallback, useMemo, useState } from "react";

/** থ্রেডের মেসেজ সার্চ state + filter এক জায়গায়। */
export function useChatSearch<T extends { content: string | null }>(messages: T[]) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchQuery("");
    setSearchOpen((prev) => !prev);
  }, []);

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    const needle = searchQuery.toLowerCase();
    return messages.filter((m) => m.content?.toLowerCase().includes(needle));
  }, [messages, searchQuery]);

  return { searchOpen, searchQuery, setSearchQuery, toggleSearch, closeSearch, filteredMessages };
}
