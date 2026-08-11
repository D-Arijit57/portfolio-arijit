import type { VirtualFile } from '../types';

/**
 * The one place "is this the manifest file" is decided — shared by
 * EditorRenderer's pane dispatch and useStore's auto-split branch, so the
 * two can't drift out of sync. Matched by FileType alone, same as
 * `graph/fileMatch.ts`'s `isGraphFile` — `.explore` is a dedicated
 * extension now (constellation.explore, formerly manifest.yaml), not a
 * shared one like `.yaml` was, so there's no longer a generic sibling
 * (e.g. /skills/frontend.yaml) this needs to rule out by filename.
 */
export function isManifestFile(file: VirtualFile): boolean {
  return file.type === 'explore';
}
