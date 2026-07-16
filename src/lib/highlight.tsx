import React from "react";

/** Escape regex special chars in a user-provided query. */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Render `text` with all case-insensitive occurrences of `query` wrapped in
 * a soft-gold <mark>. Returns the original text unchanged when the query is empty.
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

  const re = new RegExp(`(${escapeRegex(q)})`, "gi");
  const parts = text.split(re);

  return (
    <>
      {parts.map((part, i) =>
        re.test(part) && part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className={
              className ||
              "bg-[hsl(var(--heirloom-gold)/0.28)] text-[hsl(var(--heirloom-ink))] rounded-[2px] px-0.5"
            }
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
