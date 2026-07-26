import type { VirtualFile } from '../types';

/**
 * The one place "is this the manifest file" is decided — shared by
 * EditorRenderer's pane dispatch and useStore's auto-split branch, so the
 * two can't drift out of sync. Matched by exact filename, not FileType
 * (which is generically 'yaml' for every other .yaml file, e.g.
 * /skills/frontend.yaml) — only manifest.yaml gets this treatment, same
 * restriction ArchitectureCanvas has to `.mmd`.
 */
export function isManifestFile(file: VirtualFile): boolean {
  return file.type === 'yaml' && file.name === 'manifest.yaml';
}
