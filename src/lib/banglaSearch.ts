/**
 * Bangla ↔ English phonetic search helpers.
 *
 * Goals:
 *  1. Normalize Bangla names to a roman phonetic form so "রহিম" matches "Rahim"
 *  2. Handle spelling variance ("Rahim" / "Rohim" / "Roheem") via a consonant
 *     skeleton (Soundex-lite): keeps consonants, drops repeated vowels
 *  3. Return the *display* first-letter for section headers, in the user's
 *     original script (so "অনিক" groups under "অ", "Anik" under "A")
 */

const BANGLA_MAP: Record<string, string> = {
  // Vowels
  "অ": "o", "আ": "a", "ই": "i", "ঈ": "i", "উ": "u", "ঊ": "u",
  "ঋ": "ri", "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
  // Consonants
  "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng",
  "চ": "ch", "ছ": "ch", "জ": "j", "ঝ": "jh", "ঞ": "n",
  "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n",
  "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n",
  "প": "p", "ফ": "f", "ব": "b", "ভ": "v", "ম": "m",
  "য": "j", "র": "r", "ল": "l", "শ": "sh", "ষ": "sh", "স": "s", "হ": "h",
  "ড়": "r", "ঢ়": "rh", "য়": "y",
  // Vowel signs (matras)
  "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri",
  "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
  // Modifiers
  "ং": "ng", "ঃ": "h", "ঁ": "n", "্": "",
  // Digits
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

/** Convert any Bangla characters to roman-phonetic; leave others untouched. */
export function romanize(s: string): string {
  if (!s) return "";
  let out = "";
  for (const ch of s) out += BANGLA_MAP[ch] ?? ch;
  return out.toLowerCase();
}

/**
 * Consonant skeleton — first character kept, subsequent vowels dropped.
 * Absorbs spelling variance: rahim / rohim / roheem → "rhm"
 */
export function phoneticKey(s: string): string {
  const r = romanize(s).replace(/[^a-z0-9]/g, "");
  if (!r) return "";
  return (r[0] + r.slice(1).replace(/[aeiou]/g, "")).replace(/(.)\1+/g, "$1");
}

/**
 * Fuzzy match: substring in the raw text, in its romanized form, or in its
 * consonant skeleton. Empty query always matches.
 */
export function matchesFuzzy(text: string | null | undefined, query: string): boolean {
  if (!query) return true;
  if (!text) return false;
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (t.includes(q)) return true;

  const tr = romanize(t);
  const qr = romanize(q);
  if (qr && tr.includes(qr)) return true;

  const tk = phoneticKey(t);
  const qk = phoneticKey(q);
  if (qk && qk.length >= 2 && tk.includes(qk)) return true;

  return false;
}

/**
 * Section header for A-Z grouping. Returns the first meaningful character in
 * the user's original script (Bangla vowel/consonant, or uppercase English),
 * falling back to "#" for digits/symbols/empty names.
 */
export function getSectionKey(name: string): string {
  if (!name) return "#";
  const trimmed = name.trim();
  if (!trimmed) return "#";
  const first = [...trimmed][0];
  // English letter
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
  // Bangla independent vowels or consonants
  if (BANGLA_MAP[first] && !/^[০-৯]$/.test(first) && first !== "্") {
    return first;
  }
  return "#";
}

/**
 * Sort key for section headers so groups appear in a stable, sensible order:
 * Bangla independent vowels → Bangla consonants → English A-Z → "#".
 */
const BANGLA_ORDER = [
  "অ", "আ", "ই", "ঈ", "উ", "ঊ", "ঋ", "এ", "ঐ", "ও", "ঔ",
  "ক", "খ", "গ", "ঘ", "ঙ",
  "চ", "ছ", "জ", "ঝ", "ঞ",
  "ট", "ঠ", "ড", "ঢ", "ণ",
  "ত", "থ", "দ", "ধ", "ন",
  "প", "ফ", "ব", "ভ", "ম",
  "য", "র", "ল", "শ", "ষ", "স", "হ",
  "ড়", "ঢ়", "য়",
];

export function sectionSortIndex(key: string): number {
  const bi = BANGLA_ORDER.indexOf(key);
  if (bi >= 0) return bi;
  if (/^[A-Z]$/.test(key)) return 100 + key.charCodeAt(0);
  return 9999; // "#" / others last
}
