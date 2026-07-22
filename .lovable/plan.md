# চ্যাট সেশন UX — পূর্ণ মডেল

বর্তমান: ২৪ ঘণ্টা fixed, sessionStorage only, কোনো warning/refresh নেই।
লক্ষ্য: WhatsApp Web-স্টাইল rolling সেশন + ইউজার-কন্ট্রোল।

---

## ১. ডাটাবেস পরিবর্তন

`chat_sessions` টেবিলে নতুন কলাম:
- `last_used_at timestamptz` — sliding expiry-র জন্য
- `trusted_device boolean` — ইউজার "এই ডিভাইসে মনে রাখুন" চেপেছেন কি না
- `device_label text` — UA থেকে ছোট নাম (যেমন "Chrome on Android")
- `created_at timestamptz` (যদি না থাকে) — session list দেখানোর জন্য

`create_chat_session` RPC আপডেট:
- নতুন প্যারাম `p_trusted boolean` (default false)
- Trusted হলে `expires_at = now() + 30 days`, নাহলে `now() + 24 hours`
- `device_label`, `last_used_at` সেট
- **পুরনো একই-ডিভাইসের সেশন ডিলিট নয়** — অন্য ডিভাইসে লগইন থাকা অক্ষুণ্ণ থাকবে

নতুন RPC:
- `touch_chat_session(p_token)` — `last_used_at = now()`; trusted হলে `expires_at = now() + 30 days` (sliding refresh)
- `list_my_chat_sessions(p_token)` — সব active সেশন return (device_label, last_used_at, current কি না)
- `revoke_chat_session(p_token, p_session_id)` — নির্দিষ্ট একটা রিভোক
- `revoke_all_other_chat_sessions(p_token)` — বর্তমানটা ছাড়া সব রিভোক
- `revoke_all_chat_sessions(p_token)` — নিজেরটাসহ সব (=সব ডিভাইস থেকে সাইন-আউট)

---

## ২. ফ্রন্টএন্ড — session storage

`src/lib/chatSession.ts`:
- `sessionStorage` → পলিসি-ভিত্তিক: trusted হলে `localStorage`, নাহলে `sessionStorage`
- `ChatSession`-এ `trusted: boolean`, `expiresAt: number` (সার্ভার থেকে ফেরত) যোগ
- `getChatSession()`-এ প্রি-এক্সপায়ারি চেক: expiry-র <২৪ ঘণ্টা বাকি থাকলে flag return করে যাতে UI toast দেখায়
- `touchChatSession()` helper — প্রতি ১০ মিনিট বা প্রতি sendMessage-এ ব্যাকগ্রাউন্ডে কল

---

## ৩. Verify পেজে ট্রাস্টেড-ডিভাইস চয়েস

`src/pages/Verify.tsx`:
- সিক্রেট কোড ইনপুটের নিচে চেকবক্স: **"এই ডিভাইসে ৩০ দিন মনে রাখুন"** (ডিফল্ট off)
- সহায়ক টেক্সট: *"শেয়ারড/পাবলিক ডিভাইসে চেক করবেন না।"*
- ভ্যালু `createChatSession(phone, code, trusted)`-এ পাস

---

## ৪. Sliding refresh + pre-expiry warning

`useGlobalChatNotifier`-এর মতো একটি hook `useChatSessionKeepalive`:
- প্রতি ১০ মিনিটে `touch_chat_session` কল (visible tab-এ)
- প্রতি sendMessage-এর পর একবার
- প্রতিটি tick-এ expiry চেক — <২৪ ঘণ্টা বাকি হলে দিনে একবার সফট টোস্ট: *"সেশন শীঘ্রই শেষ হবে। একটিভ থাকতে চ্যাটে ঢুকুন।"* (localStorage flag দিয়ে duplicate আটকাব)
- এক্সপায়ার হলে টোস্ট: *"নিরাপত্তার জন্য আবার যাচাই করুন"* → `/verify?next=chat`

---

## ৫. Settings-এ Active Sessions সেকশন

`DashboardHome.tsx`-এর সেটিং অংশে (অথবা `/me`-তে) নতুন কার্ড **"সক্রিয় ডিভাইস"**:
- সেশনের তালিকা: device label, "শেষ সক্রিয়: X মিনিট আগে", বর্তমান হলে "এই ডিভাইস" ব্যাজ
- প্রতিটির পাশে "সাইন-আউট" বাটন → `revoke_chat_session`
- নিচে দুটি বাটন:
  - **"অন্য সব ডিভাইস থেকে সাইন-আউট"** (কনফার্মেশন সহ)
  - **"সব ডিভাইস থেকে সাইন-আউট"** (destructive; কনফার্ম করলে নিজেও logout → `/`)

`/me` পেজের সাইন-আউট বাটনের নিচে নতুন link: *"সব ডিভাইস থেকে বেরিয়ে যান"*।

---

## ৬. প্রযুক্তিগত ডিটেইলস

- Device label: `navigator.userAgent` থেকে ক্লায়েন্টে parse (browser + OS), সার্ভারে string হিসেবে save
- Rate limit: `revoke_all_*` fns-এ per-session rate limit (rate_limit_attempts টেবিল ব্যবহার)
- Migration-এ existing rows-এ `last_used_at = created_at`, `trusted_device = false` backfill
- `validate_chat_session` অপরিবর্তিত থাকবে (already checks `expires_at > now()`)
- Grant: `chat_sessions`-এ SELECT/DELETE service_role only (RPC-এর মাধ্যমেই সব access)

---

## ৭. পরীক্ষার চেকলিস্ট

- Trust off → sessionStorage, ২৪ ঘণ্টা; ট্যাব বন্ধ = লগআউট
- Trust on → localStorage, ৩০ দিন; ট্যাব বন্ধ করলেও থাকে
- একটিভ ইউজারের expiry কখনো hit করে না (sliding refresh কাজ করছে)
- দুটি ডিভাইস থেকে লগইন → দুটোই তালিকায় দেখা যায়
- এক ডিভাইস থেকে "অন্য সব সাইন-আউট" → অন্য ডিভাইসে next RPC 401 → verify redirect
- Expiry-র ২৩ ঘণ্টা আগে টোস্ট আসে (একবারই)

---

কনফার্ম দিলে ধাপে ধাপে ইমপ্লিমেন্ট করব — মাইগ্রেশন প্রথমে, তারপর ক্লায়েন্ট।