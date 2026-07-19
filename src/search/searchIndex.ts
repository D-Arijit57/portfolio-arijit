import type { VirtualFile } from '../types';
import type { SearchIndex, SearchIndexEntry } from './types';
import { namespaceOf } from './types';

/**
 * Module-level cache, not store state (ARCHITECTURE.md §2) — same reasoning
 * as the terminal command registry, except this cache is rebuildable since
 * its source (workspaceFiles) changes during a session.
 */
let currentIndex: SearchIndex | undefined;

export function buildIndex(files: readonly VirtualFile[]): SearchIndex {
  const entries: SearchIndexEntry[] = files.map((file) => ({
    file,
    namespace: namespaceOf(file),
    nameLower: file.name.toLowerCase(),
    pathLower: file.path.toLowerCase(),
    contentLower: file.content.toLowerCase(),
  }));

  currentIndex = {
    entries,
    builtAt: Date.now(),
    fileCount: entries.length,
  };

  return currentIndex;
}

export function getIndex(): SearchIndex | undefined {
  return currentIndex;
}

export function invalidateIndex(): void {
  currentIndex = undefined;
}
