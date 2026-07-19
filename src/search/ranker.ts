import type { SearchIndexEntry, SearchMatch, SearchResult } from './types';
import type { FileMatches } from './matcher';

/**
 * Frozen ranking (ARCHITECTURE.md §7): exact filename > filename prefix >
 * filename substring > path match > content match. Independent of the
 * matcher — takes raw per-file matches, never re-matches or re-scans.
 */

const SCORE_EXACT_NAME = 1000;
const SCORE_PREFIX_NAME = 800;
const SCORE_SUBSTRING_NAME = 600;
const SCORE_PATH_EXACT = 400;
const SCORE_PATH_PREFIX = 350;
const SCORE_PATH_CONTAINS = 300;
const SCORE_CONTENT_BASE = 100;
const CONTENT_OCCURRENCE_BONUS = 5;
const CONTENT_OCCURRENCE_BONUS_CAP = 50;

const SNIPPET_RADIUS = 40;

export function rankMatches(fileMatches: FileMatches[], queryLower: string): SearchResult[] {
  const results = fileMatches.map(({ entry, matches }) => scoreEntry(entry, matches, queryLower));

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    const nameLengthDiff = a.file.name.length - b.file.name.length;
    if (nameLengthDiff !== 0) return nameLengthDiff;

    return minMatchIndex(a.matches) - minMatchIndex(b.matches);
  });
}

function scoreEntry(entry: SearchIndexEntry, matches: SearchMatch[], queryLower: string): SearchResult {
  let score = 0;

  const nameMatch = matches.some((m) => m.field === 'name');
  if (nameMatch) {
    if (entry.nameLower === queryLower) score = Math.max(score, SCORE_EXACT_NAME);
    else if (entry.nameLower.startsWith(queryLower)) score = Math.max(score, SCORE_PREFIX_NAME);
    else score = Math.max(score, SCORE_SUBSTRING_NAME);
  }

  const pathMatch = matches.some((m) => m.field === 'path');
  if (pathMatch) {
    if (entry.pathLower === queryLower) score = Math.max(score, SCORE_PATH_EXACT);
    else if (entry.pathLower.startsWith(queryLower)) score = Math.max(score, SCORE_PATH_PREFIX);
    else score = Math.max(score, SCORE_PATH_CONTAINS);
  }

  const contentMatches = matches.filter((m) => m.field === 'content');
  // Content is the lowest tier — only scores when no name/path match exists,
  // so a large file mentioning the term can't outrank a real name match.
  if (contentMatches.length > 0 && score === 0) {
    const bonus = Math.min((contentMatches.length - 1) * CONTENT_OCCURRENCE_BONUS, CONTENT_OCCURRENCE_BONUS_CAP);
    score = SCORE_CONTENT_BASE + bonus;
  }

  return {
    file: entry.file,
    namespace: entry.namespace,
    matches,
    snippet: buildSnippet(entry, contentMatches[0]),
    score,
  };
}

function buildSnippet(entry: SearchIndexEntry, match: SearchMatch | undefined): string | undefined {
  if (!match) return undefined;

  const content = entry.file.content;
  const start = Math.max(0, match.index - SNIPPET_RADIUS);
  const end = Math.min(content.length, match.index + match.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';

  return `${prefix}${content.slice(start, end).trim()}${suffix}`;
}

function minMatchIndex(matches: SearchMatch[]): number {
  return matches.reduce((min, m) => Math.min(min, m.index), Infinity);
}
