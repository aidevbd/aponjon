# ডেস্কটপ UX অডিট + প্ল্যান

মোবাইল অপটিমাইজেশন করতে গিয়ে ডেস্কটপে যেসব জায়গায় empty space, narrow content, বা native-mobile-only ইন্টারঅ্যাকশন থেকে যাচ্ছে সেগুলো সব ঠিক করব।

## Priority 1 — বড় সমস্যা (must-fix)

1. **অ্যাডমিন চ্যাট ট্যাব: two-pane split view (lg+)**
   - বর্তমানে ডেস্কটপে চ্যাট খুললে বাম দিকে ন্যারো কন্টাক্ট লিস্ট, ডান দিকে ~60% ফাঁকা — messenger/WhatsApp-style desktop এ যেমন থাকে তেমন হবে না।
   - Fix: `lg:grid lg:grid-cols-[320px_1fr]` — বাম কলামে user list সবসময় visible, ডানে thread; কোনো user select না করলে ডানে "চ্যাট বেছে নিন" placeholder।
   - মোবাইলে current single-pane behavior অপরিবর্তিত।

2. **পাবলিক `/chat` পেজ (signed-out state)**
   - Login card 400px, চারপাশে বিশাল খালি জায়গা — কেন্দ্রে বসিয়ে দুইপাশে soft heirloom decoration/tagline দিয়ে ব্যালান্স করা।

3. **হোম + অ্যাক্সেস পেজ**
   - ডেস্কটপে vertical center হওয়ায় নিচে অনেক ফাঁকা — `min-height` টাইট করে content-hugging + subtle side decoration যোগ করে ব্যালান্স।

## Priority 2 — polish

4. **অ্যাডমিন কন্টাক্ট লিস্ট (lg+)**: ১৪৪০px-এ single-column list-item lines অনেক wide লাগে — `lg:grid lg:grid-cols-2 xl:grid-cols-2` করে density বাড়ানো (search/filter row full-width থাকবে)।

5. **অ্যাডমিন Activity Log / Settings**: max-width টাইট করে center-align, empty right column ঠিক করা।

6. **অ্যাডমিন হেডার**: `justify-between` এ logo বাম কোণে ও লগআউট ডান কোণে যা বিশাল ফাঁকা মাঝখান তৈরি করে — মাঝখানে subtle breadcrumb/section-label বসানো।

7. **Hover states + keyboard focus rings** সব প্রধান বোতাম/লিংকে verify — ডেস্কটপে mouse users যেন consistent feedback পায়।

## টেকনিক্যাল বিবরণ

- সব ব্রেকপয়েন্ট Tailwind `sm/md/lg/xl` follow করবে; `lg: ≥1024px` থেকে desktop treatment।
- `EmbeddedAdminChat.tsx` — root wrapper refactor: `AnimatePresence` মোবাইলে থাকবে, lg-এ দুই কলাম parallel render, ডান pane empty-state fallback সহ।
- Framer motion animations preserved; শুধু layout container বদলাবে।
- কোনো business logic / RPC / auth ফ্লো ছোঁয়া হবে না — pure presentational।

## Verification

প্রতিটা পেজে Playwright দিয়ে 1440×900 screenshot নিয়ে confirm করব যে empty space নেই এবং সব interactive element accessible।

---

**Approve করলে P1 থেকে সিরিয়ালি শুরু করব** (chat two-pane আগে, তারপর home/access, তারপর P2)।
