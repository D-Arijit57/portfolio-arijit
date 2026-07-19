import type { SearchIndex, SearchIndexEntry, SearchMatch } from './types';

/**
 * Produces raw matches only — no ranking, sorting, or truncation
 * (ARCHITECTURE.md §1's per-layer responsibility table).
 */

// Bounds work on files where the query occurs many times; the ranker caps
// the score bonus from extra occurrences anyway (§7), so matches beyond this
// don't change ranking outcomes.
const MAX_CONTENT_MATCHES_PER_FILE = 20;

export interface FileMatches {
  entry: SearchIndexEntry;
  matches: SearchMatch[];
}

/** `queryLower` must already be normalized by the caller (searchEngine.ts). */
export function matchEntry(entry: SearchIndexEntry, queryLower: string): SearchMatch[] {
  if (queryLower === '') return [];

  const matches: SearchMatch[] = [];

  const nameIndex = entry.nameLower.indexOf(queryLower);
  if (nameIndex !== -1) {
    matches.push({ field: 'name', index: nameIndex, length: queryLower.length });
  }

  const pathIndex = entry.pathLower.indexOf(queryLower);
  if (pathIndex !== -1) {
    matches.push({ field: 'path', index: pathIndex, length: queryLower.length });
  }

  let from = 0;
  let contentMatchCount = 0;
  while (contentMatchCount < MAX_CONTENT_MATCHES_PER_FILE) {
    const contentIndex = entry.contentLower.indexOf(queryLower, from);
    if (contentIndex === -1) break;
    matches.push({ field: 'content', index: contentIndex, length: queryLower.length });
    from = contentIndex + queryLower.length;
    contentMatchCount++;
  }

  return matches;
}

export function matchIndex(index: SearchIndex, queryLower: string): FileMatches[] {
  const results: FileMatches[] = [];
  for (const entry of index.entries) {
    const matches = matchEntry(entry, queryLower);
    if (matches.length > 0) {
      results.push({ entry, matches });
    }
  }
  return results;
}
