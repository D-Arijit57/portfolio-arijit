/**
 * Collision-safe slugs for section anchors. A dedupe map (not a global
 * counter) means slugify() is safe to call repeatedly across parses of
 * different documents without leaking state between them — callers create
 * one map per document parse.
 */
export function createSlugger() {
  const seen = new Map<string, number>();

  return function slugify(text: string): string {
    const base = text
      .toLowerCase()
      .replace(/[*_`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';

    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}
