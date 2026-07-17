// Shared helpers to keep chat message lists deduplicated and consistent
// across realtime events and thread refetches.

type MessageLike = {
  id: string;
  created_at: string;
  [key: string]: any;
};

/**
 * Upsert a single incoming message into the current list, deduping by id.
 * If the id exists, non-null fields on the incoming record overwrite the
 * previous ones (so status transitions like delivered/read/edit are picked
 * up even if the message row already exists). Otherwise the message is
 * appended and the list stays sorted by created_at ASC.
 */
export function upsertMessage<T extends MessageLike>(prev: T[], incoming: T): T[] {
  const idx = prev.findIndex((m) => m.id === incoming.id);
  if (idx !== -1) {
    const existing = prev[idx];
    const merged: T = { ...existing };
    for (const [k, v] of Object.entries(incoming)) {
      if (v !== null && v !== undefined) (merged as any)[k] = v;
    }
    if (merged === existing) return prev;
    const next = prev.slice();
    next[idx] = merged;
    return next;
  }
  // Insert preserving created_at ASC order
  const next = prev.slice();
  const t = new Date(incoming.created_at).getTime();
  let insertAt = next.length;
  for (let i = next.length - 1; i >= 0; i--) {
    if (new Date(next[i].created_at).getTime() <= t) { insertAt = i + 1; break; }
    if (i === 0) insertAt = 0;
  }
  next.splice(insertAt, 0, incoming);
  return next;
}

/**
 * Reconcile a full refetch against the current list.
 * The server list is the source of truth; we return it deduped by id
 * (defensive — RPCs already return unique rows) so a repeated refetch
 * never produces duplicate keys in React.
 */
export function reconcileMessages<T extends MessageLike>(next: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const m of next) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}
