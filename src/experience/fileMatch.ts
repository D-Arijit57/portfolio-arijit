import type { VirtualFile } from '../types';

/**
 * The one place "is this the work history file" is decided — shared by the
 * Visualization Registry and useStore's full-canvas branch, so the two
 * can't drift out of sync. Matched by exact filename rather than FileType,
 * for the same reason `manifest/fileMatch.ts` does: `yaml` is the generic
 * type of every other .yaml file in the workspace, and only this one gets
 * the experience visualization.
 */
export function isWorkHistoryFile(file: VirtualFile): boolean {
  return file.type === 'yaml' && file.name === 'work_history.yaml';
}
