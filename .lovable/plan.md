## /chat পুরো Refactor — P1 থেকে P5

### লক্ষ্য
Chat.tsx (1235 lines, 58 hooks) কে ছোট ছোট, testable module-এ ভাঙা এবং একই সময়ে UX/design সমস্যাগুলো ঠিক করা। কোনো feature বাদ যাবে না — সব behavior preserve হবে।

---

### Phase 1 — Custom hooks-এ logic বের করা (কোন UI change নেই)
Chat.tsx থেকে business logic আলাদা hook-এ:

- `hooks/useChatContacts.ts` — contacts fetch, unread map, previews, presence subscribe
- `hooks/useChatMessages.ts` — messages fetch, realtime subscribe, reconcile, signing
- `hooks/useChatComposer.ts` — msgInput, send, edit, reply, image upload, offline queue
- `hooks/useChatTyping.ts` — typing indicator broadcast + receive
- `hooks/useChatSearch.ts` — search state + filter
- `hooks/useChatActions.ts` — react, unsend, remove-for-me, edit history, pin

Chat.tsx এখন এই hook-গুলো compose করবে মাত্র।

---

### Phase 2 — UI components-এ break করা
- `components/chat/ChatHeader.tsx` — avatar, name, "আপনার আপনজন" badge, presence, actions menu
- `components/chat/ChatContactList.tsx` — sidebar list (desktop) + fallback
- `components/chat/ChatThread.tsx` — message list, grouping, auto-scroll
- `components/chat/ChatComposer.tsx` — textarea, image, emoji, reply/edit preview, send
- `components/chat/ChatSearchBar.tsx` — search overlay
- `components/chat/ChatEmptyState.tsx` — "এখনো কথা শুরু হয়নি" heirloom empty state
- `components/chat/ChatLoginForm.tsx` — session bootstrap form

Chat.tsx target: <200 lines।

---

### Phase 3 — Desktop split layout (P1 fix)
- ≥768px-এ two-pane: বাম দিকে contact list (280px), ডান দিকে thread
- একটাই contact থাকলে সরাসরি thread খোলা (P3 fix)
- <768px-এ current fixed-viewport mobile behavior অক্ষুণ্ণ

---

### Phase 4 — Header simplify (P3 fix)
- Mobile header: Avatar + Name + overflow menu (Search/Settings/Notif/Home/Logout DropdownMenu-তে)
- Desktop header: full spread, কিন্তু breathing room বেশি

---

### Phase 5 — Design token cleanup (P4 fix)
- Hardcoded color (`text-white`, `bg-black`, hex) → semantic token
- `text-[10px]` মত tiny font → `text-xs` বা proper scale
- MessageBubble-এ heirloom rose/gold tokens verify

---

### Technical Details

**File structure after refactor:**
```text
src/pages/Chat.tsx                 (~180 lines, composition only)
src/hooks/
  useChatContacts.ts
  useChatMessages.ts
  useChatComposer.ts
  useChatTyping.ts
  useChatSearch.ts
  useChatActions.ts
src/components/chat/
  ChatHeader.tsx
  ChatContactList.tsx
  ChatThread.tsx
  ChatComposer.tsx
  ChatSearchBar.tsx
  ChatEmptyState.tsx
  ChatLoginForm.tsx
  (existing: MessageBubble, MessageActionSheet, etc.)
```

**Preservation guarantees:**
- সব realtime subscription (messages, typing, presence, reactions) same
- Offline queue behavior same
- Session/keepalive/trust-device same
- MessageBubble, ActionSheet, ImageLightbox unchanged
- Chat RPCs (create_chat_session, mark_conversation_read_admin, ইত্যাদি) same

**Risk mitigation:**
- Phase-by-phase commit-able state
- প্রতি phase-এর পর manually verify: login → contact select → send text → send image → reply → edit → react → unsend → search → offline queue

---

### সময়/scope estimate
৫টা phase একসাথে করলে file count বাড়বে ~13টা, কিন্তু কোনো file 300 লাইনের বেশি না। এক turn-এ পুরোটা করব — শেষে build check + `/chat` flow verify।

শুরু করি?