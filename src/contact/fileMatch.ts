import type { VirtualFile } from '../types';

/**
 * The one place "is this the contact file" is decided — shared by the
 * Visualization Registry and useStore's full-canvas branch, so the two
 * can't drift out of sync. Matched by exact filename rather than FileType,
 * for the same reason manifest/fileMatch.ts and experience/fileMatch.ts
 * do: `shell` is the generic type every .sh file in the workspace would
 * have, and only this one gets the Handoff renderer.
 */
export function isContactFile(file: VirtualFile): boolean {
  return file.type === 'shell' && file.name === 'contact.sh';
}
