## আপনজন — বাকি কাজের নোট (Backlog)

সর্বশেষ অডিট অনুযায়ী কোডবেসে যা এখনো বাকি।

---

### A. /chat রিফ্যাক্টর — অর্ধসমাপ্ত

Chat.tsx এখন **605 লাইন** (আগে 1235)। টার্গেট ছিল <200।

হয়েছে: `useChatTyping`, `useChatActions`, `useChatPresence`, `useChatRealtime`, `useChatConnectivity`, `useChatSessionKeepalive`, `ChatComposer`, `ChatContactList`, `ChatMessageList`

বাকি (এখনো Chat.tsx-এর ভেতরে inline):
- `components/chat/ChatHeader.tsx` — avatar, নাম, "আপনার আপনজন" badge, actions menu (Chat.tsx ~390-477)
- `components/chat/ChatSearchBar.tsx` — search overlay (Chat.tsx 473-477)
- `components/chat/ChatEmptyState.tsx` — "এখনো কথা শুরু হয়নি"
- `components/chat/ChatLoginForm.tsx` — session bootstrap form
- `hooks/useChatSearch.ts` — search state এখনো Chat.tsx-এ
- `hooks/useChatContacts.ts` — contacts fetch + unread map
- Desktop two-pane split (Phase 3) নিশ্চিতভাবে হয়নি — verify দরকার

---

### B. EmbeddedAdminChat.tsx — 1232 লাইন (সবচেয়ে বড় ফাইল)

অ্যাডমিন সাইডে সমান্তরাল আরেকটা চ্যাট implementation, কখনো রিফ্যাক্টর হয়নি। /chat-এর hook-গুলো এখানে reuse করা যায় — ডুপ্লিকেট লজিক কমবে।

---

### C. Design token cleanup (Phase 5)

- `text-[10px]` — ~40 জায়গায়। AdminDashboard (9), ContactFilters (6), ActiveSessionsCard (5), MyInfo (3), MessageBubble (3), JumpToLatest, EditHistoryDialog → `text-xs` বা proper scale
- `text-white` / `bg-black` — `ImageLightbox.tsx` (3), `MessageActionSheet.tsx:203` → semantic token
  (shadcn ui/ ফাইলের overlay গুলো intentional, বাদ)
- raw hex: ✅ ক্লিন, কিছু নেই

---

### D. কোড হেলথ

- ~~**Silent catch** — 21টা `catch {}`~~ ✅ **হয়ে গেছে** — `src/lib/devLog.ts`-এ `swallow(scope, error)` হেল্পার যুক্ত। সব bare `catch {}` এখন dev-mode-এ `[swallowed] <scope>` warning দেয়, production-এ চুপ থাকে। কভার: Chat.tsx (4), EmbeddedAdminChat (7), notificationPrefs (4), useGlobalChatNotifier (3), useGlobalPresenceHeartbeat, useChatPresence, EmojiPicker। এখন repo-তে bare `catch {}` = 0।
- **`any` টাইপ** — `useChatActions.ts:37,40,141,174`, `useChatPresence.ts:24,40`, `Chat.tsx:135,162` (`as any` on RPC — generated types-এ RPC নাম নেই)
- **400+ লাইনের ফাইল** — EmbeddedAdminChat (1232), AdminDashboard (817), MyInfo (695), Chat (605), ActiveSessionsCard (531), chatSession (461), ContactForm (420), ContactFilters (420)
- Accessibility: ✅ চ্যাট surface-এ icon button গুলোতে aria-label আছে
- TODO/FIXME: ✅ কিছু নেই

---

### অগ্রাধিকার সাজেশন

1. **D — silent catch ফিক্স** (বাগ ধরা পড়বে, দ্রুত কাজ)
2. **A — ChatHeader + SearchBar + EmptyState extract** (Chat.tsx ~300 লাইনে নামবে)
3. **C — text-[10px] cleanup** (মোবাইলে readability বাড়বে)
4. **B — EmbeddedAdminChat রিফ্যাক্টর** (সবচেয়ে বড়, সবচেয়ে ঝুঁকিপূর্ণ — শেষে)
