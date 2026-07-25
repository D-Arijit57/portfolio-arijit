import type { VirtualFile } from '../types';

const PROJECT_DOC_PATH = /^\/projects\/[^/]+\/[^/]+\.md$/;

/**
 * The one place "is this a project documentation file" is decided —
 * mirrors src/manifest/fileMatch.ts's isManifestFile(). Matched by path
 * shape (any .md directly inside a /projects/<Name>/ folder), not by
 * filename, so it works automatically for every future project doc
 * (Nova.md, BuildEdge.md, ...) with zero code changes. README.md,
 * profile.md, RESUME.md and any other markdown outside /projects/ never
 * match, and keep rendering through the existing MarkdownFileView.
 */
export function isProjectDocFile(file: VirtualFile): boolean {
  return file.type === 'markdown' && PROJECT_DOC_PATH.test(file.path);
}
