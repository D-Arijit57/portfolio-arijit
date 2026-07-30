import type { VirtualFile } from '../types';

/**
 * Matched by FileType, not filename — deliberately the opposite of
 * `manifest/fileMatch.ts`'s `isManifestFile` (which matches one specific
 * filename because every other .yaml file has to keep rendering as plain
 * YAML). Every `.graph` file is graph content by construction, so a future
 * `resume.graph`/`projects.graph` gets the Knowledge Graph Renderer for
 * free — no renderer change, no second file-match function to keep in
 * sync with this one.
 */
export function isGraphFile(file: VirtualFile): boolean {
  return file.type === 'graph';
}
