import React from "react";
import { romanize } from "@/lib/banglaSearch";

/**
 * Find non-overlapping match ranges of `query` inside `text`, supporting:
 *   1. Case-insensitive raw substring   ("রহি" in "রহিম", "rah" in "Rahim")
 *   2. Romanized/phonetic substring     ("rahim" → highlights "রহিম")
 *
 * Returns ranges as [start, end) indices into the ORIGINAL text so we can
 * wrap the visible characters even when the match was found on the
 * romanized form.
 */
function findMatchRanges(text: string, query: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  if (!text || !query) return ranges;

  const chars = [...text]; // handle surrogate pairs / combining marks safely
  const lowerText = text.toLowerCase();
  const q = query.toLowerCase();

  // ── Pass 1: raw case-insensitive substring ──
  let from = 0;
  while (from <= lowerText.length - q.length) {
    const idx = lowerText.indexOf(q, from);
    if (idx === -1) break;
    ranges.push([idx, idx + q.length]);
    from = idx + q.length;
  }
  if (ranges.length) return ranges;

  // ── Pass 2: romanized substring, mapped back to original char range ──
  const qr = romanize(q).replace(/\s+/g, "");
  if (!qr) return ranges;

  // Build romanized text + a map: for each romanized char, which source char index?
  let roman = "";
  const romanToSrc: number[] = []; // roman index → source char index (in `chars`)
  for (let i = 0; i < chars.length; i++) {
    const seg = romanize(chars[i]);
    for (let k = 0; k < seg.length; k++) romanToSrc.push(i);
    roman += seg;
  }

  let rFrom = 0;
  while (rFrom <= roman.length - qr.length) {
    const rIdx = roman.indexOf(qr, rFrom);
    if (rIdx === -1) break;
    const srcStart = romanToSrc[rIdx];
    const srcEndChar = romanToSrc[rIdx + qr.length - 1];
    // Convert char-array indices to string indices
    const strStart = chars.slice(0, srcStart).join("").length;
    const strEnd = chars.slice(0, srcEndChar + 1).join("").length;
    ranges.push([strStart, strEnd]);
    rFrom = rIdx + qr.length;
  }

  return ranges;
}

/**
 * Wraps matching portions of `text` with a soft-gold <mark>. Supports both
 * literal substring and Bangla ↔ roman phonetic matches.
 */
export function Highlight({
  text,
  query,
  className = "",
}: {
  text?: string | null;
  query?: string;
  className?: string;
}) {
  if (!text) return null;
  const q = (query ?? "").trim();
  if (!q) return <>{text}</>;

  const ranges = findMatchRanges(text, q);
  if (!ranges.length) return <>{text}</>;

  const markClass =
    className ||
    "bg-heirloom-gold/[0.28] text-heirloom-ink rounded-[2px] px-0.5";

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([s, e], i) => {
    if (s > cursor) nodes.push(<React.Fragment key={`t${i}`}>{text.slice(cursor, s)}</React.Fragment>);
    nodes.push(
      <mark key={`m${i}`} className={markClass}>
        {text.slice(s, e)}
      </mark>
    );
    cursor = e;
  });
  if (cursor < text.length) nodes.push(<React.Fragment key="tail">{text.slice(cursor)}</React.Fragment>);

  return <>{nodes}</>;
}
