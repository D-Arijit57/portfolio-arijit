import type { VirtualFile } from '../types';

/**
 * The one place "is this the work history file" is decided — shared by the
 * Visualization Registry and useStore's full-canvas branch, so the two
 * can't drift out of sync. Matched by exact filename rather than FileType,
 * for the same reason `manifest/fileMatch.ts` does: `yaml` is the generic
 * type of every other .yaml file in the workspace, and only this one gets
 * the experience visualization.
 *
 * The file is named for the company (americanchase.yaml) so the explorer
 * reads as "one file per employer". A second employer gets its own file,
 * and — since ExperienceVisualizationViewer resolves `workHistory[0]` —
 * its own match plus its own registry entry; matching the exact name here
 * keeps that future addition explicit instead of silently routing every
 * /experience/*.yaml through American Chase's pipeline.
 */
export function isWorkHistoryFile(file: VirtualFile): boolean {
  return file.type === 'yaml' && file.name === 'americanchase.yaml';
}
