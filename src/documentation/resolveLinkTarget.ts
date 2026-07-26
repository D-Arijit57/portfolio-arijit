import { getFileByPath } from '../content/fileSystem';

export type LinkTarget =
  | { kind: 'external'; href: string }
  | { kind: 'internal'; fileId: string }
  | { kind: 'unresolved'; href: string };

const EXTERNAL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Resolves a link-card href (documentation/linkCards.ts) against the
 * current document's own folder — the same "relative to this file" rule a
 * real filesystem link would use. A bare filename like `architecture.mmd`
 * or `manifest.yaml` resolves to that sibling VirtualFile generically (no
 * hardcoded project/file ids); a `scheme://` URL is always external. A
 * relative name that doesn't match any sibling file degrades to
 * 'unresolved' — still rendered as a link (see LinkCardGrid), just without
 * in-app navigation, rather than being silently dropped.
 */
export function resolveLinkTarget(href: string, basePath: string): LinkTarget {
  if (EXTERNAL_PATTERN.test(href)) {
    return { kind: 'external', href };
  }

  const resolvedPath = `${basePath}/${href}`.replace(/\/+/g, '/');
  const file = getFileByPath(resolvedPath);
  if (file) return { kind: 'internal', fileId: file.id };

  return { kind: 'unresolved', href };
}
