## `/add` পেজকে Heirloom থিমে রূপান্তর

Home-এর sepia/gold/corner-ornament ভাষাটাই `/add`-এ নিয়ে আসব — যাতে primary CTA-তে ক্লিক করে ইউজার একই "চিঠি"-র ভেতরে ঢুকেছে বলে অনুভব করে।

### স্কোপ

দুই স্তরে কাজ:

**১. Page wrapper (`src/pages/AddContact.tsx`)** — সম্পূর্ণ নতুন করে
- `warm-gradient` → `bg-[hsl(var(--heirloom-bg))]`
- Heirloom paper container: `heirloom-page` + paper texture + ৪ corner ornaments (Home-এর মতো)
- ছোট wax seal (আ) + gold divider + heading
  - Heading: "আপনজন ডাইরেক্টরিতে স্বাগতম" (💕 emoji বাদ — heirloom-এ বেমানান)
  - Sub: "আপনার তথ্য রেখে যান, আমরা যত্ন করে সংরক্ষণ করব"
- `glass-card` সরিয়ে ফর্ম সরাসরি heirloom কাগজের ভেতরে বসাবে

**২. Form's rose accents (`src/components/ContactForm.tsx`)** — targeted বদল, structure অক্ষত
Home-এর সাথে যেসব জায়গা সবচেয়ে চোখে লাগে সেগুলোই টাচ করব:

| জায়গা | এখন | পরিবর্তন |
|---|---|---|
| Photo upload circle (line 167) | `bg-primary/10 ring-primary/10` | `heirloom-chip` স্টাইল + gold ring |
| Photo initial fallback (line 194) | `bg-primary/10 text-primary` | Sepia bg + heirloom-ink text |
| "নেই" toggle button (line 223) | `border-primary/30` | `heirloom-btn-ghost` |
| Step indicator dots (line 266) | `hero-gradient` active | Heirloom gold-filled active, sepia inactive |
| Step connector (line 269) | `bg-primary/40` | `bg-[hsl(var(--heirloom-gold))]/50` |
| যেকোনো "সাবমিট" / "পরের ধাপ" বাটন | rose gradient | `heirloom-btn-primary` |

Form-এর label, input, spacing — অপরিবর্তিত। শুধু accent রঙ ও badge shapes heirloom-এ আসবে।

### যা করব না (এই টাস্কে)
- Form validation/logic — অটুট
- ContactForm-এর step flow বা field structure
- অন্য পেজ (`/access`, `/chat` ইত্যাদি) — পরের step
- Header লোগোর rose heart — আলাদা siding decision

### Verification
Playwright দিয়ে mobile (390) + desktop (1280) দুটোতেই `/add` screenshot নিয়ে Home-এর সাথে visual continuity confirm করব — sepia bg, corner ornaments, seal badge, gold accent সব ধাপে থাকে।

### প্রশ্ন
- Step indicator-এ active dot — **gold filled circle** (heirloom-এর সাথে সবচেয়ে মিল) নাকি **wax-seal মিনি** (আরও থিম্যাটিক কিন্তু ভারী)? — ডিফল্টে gold filled নেব যদি না বলেন।
