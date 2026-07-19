import type { VirtualFile } from '../types';

/**
 * Domain types for the Global Search subsystem. Frozen shape per
 * ARCHITECTURE.md "Global Search Subsystem" §4/§6.
 */

export type MatchField = 'name' | 'path' | 'content';

export interface SearchMatch {
  field: MatchField;
  index: number;
  length: number;
}

export interface SearchResult {
  file: VirtualFile;
  namespace: string;
  matches: SearchMatch[];
  snippet?: string;
  score: number;
}

export interface SearchIndexEntry {
  file: VirtualFile;
  namespace: string;
  nameLower: string;
  pathLower: string;
  contentLower: string;
}

export interface SearchIndex {
  entries: SearchIndexEntry[];
  builtAt: number;
  fileCount: number;
}

// Reserved contract slots (§9, §11) — accepted by search()/matchEntry() but
// not implemented in Sprint 7B. Regex/case-sensitive/whole-word/semantic are
// explicit Sprint 7B out-of-scope items; the fields exist so a future
// implementation is a drop-in swap behind the unchanged search() signature.
export interface SearchOptions {
  mode?: 'substring' | 'regex' | 'semantic';
  caseSensitive?: boolean;
  wholeWord?: boolean;
  signal?: AbortSignal;
}

// Derived structurally from VirtualFile.id (VFS_DESIGN.md §2's frozen id
// format: static ids never contain ':', generated ids are '<namespace>:<key>').
// No ProviderRegistry import, no hardcoded namespace list — a future
// leetcode:/blog: id namespace produces a correct value automatically.
export function namespaceOf(file: VirtualFile): string {
  const i = file.id.indexOf(':');
  return i === -1 ? 'workspace' : file.id.slice(0, i);
}
