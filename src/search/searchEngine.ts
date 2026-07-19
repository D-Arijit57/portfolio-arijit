import type { SearchOptions, SearchResult } from './types';
import { getIndex } from './searchIndex';
import { matchIndex } from './matcher';
import { rankMatches } from './ranker';

/**
 * The one entry point the store calls (ARCHITECTURE.md §1/§3). Ties index +
 * matcher + ranker together. Never imports React or Zustand; never calls
 * buildIndex()/invalidateIndex() itself — that's the store's job (§8).
 *
 * Returns a Promise even though this resolves synchronously today — reserves
 * the async contract for a future async/AI-backed search to slot in as a
 * drop-in implementation swap with zero change to the call site (§3).
 *
 * `options` is accepted for future regex/case-sensitive/whole-word/semantic
 * modes (§11) but unused in Sprint 7B — those modes are explicit deferred
 * work, not implemented here.
 */
export async function search(query: string, _options?: SearchOptions): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const index = getIndex();
  if (!index) return [];

  const queryLower = trimmed.toLowerCase();
  const fileMatches = matchIndex(index, queryLower);
  return rankMatches(fileMatches, queryLower);
}
