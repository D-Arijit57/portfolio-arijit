import type { VirtualFile, VirtualFolder } from '../types';

/**
 * cwd-relative path resolution against the hydrated workspace tree.
 * Not named in TERMINAL_DESIGN.md §15's file list, but it's the concrete
 * implementation behind the `resolvePath` capability §5/§16 already
 * specified — a leaf helper in the domain layer, not a new architectural
 * layer. Deliberately exact-match only (path or id), no substring/fuzzy
 * matching — TERMINAL_DESIGN.md §17 flags the old `.includes()` matching
 * in Terminal.tsx as debt to retire, not a pattern to carry forward.
 *
 * Extension-suffix fallback mirrors the same bounded set useRouterSync.ts
 * already uses for URL resolution, rather than inventing a new convention.
 */
const KNOWN_EXTENSIONS = ['md', 'ts', 'tsx', 'py', 'json', 'yaml', 'yml', 'sh', 'mmd'];

function segments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export function joinVfsPath(cwd: string, input: string): string {
  const base = input.startsWith('/') ? [] : segments(cwd);
  const result = [...base];
  for (const part of segments(input)) {
    if (part === '.') continue;
    if (part === '..') result.pop();
    else result.push(part);
  }
  return '/' + result.join('/');
}

function findByExactPath(
  node: VirtualFile | VirtualFolder,
  path: string
): VirtualFile | VirtualFolder | undefined {
  if (node.path.toLowerCase() === path.toLowerCase()) return node;
  if ('children' in node) {
    for (const child of node.children) {
      const found = findByExactPath(child, path);
      if (found) return found;
    }
  }
  return undefined;
}

function findById(
  node: VirtualFile | VirtualFolder,
  id: string
): VirtualFile | VirtualFolder | undefined {
  if (node.id.toLowerCase() === id.toLowerCase()) return node;
  if ('children' in node) {
    for (const child of node.children) {
      const found = findById(child, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Resolves `input` (absolute path, cwd-relative path, bare filename, or
 * raw VFS id) against `tree` from the given `cwd`. Returns undefined if
 * nothing matches — callers decide how to report "not found".
 */
export function resolveVfsPath(
  tree: VirtualFolder,
  cwd: string,
  input: string
): VirtualFile | VirtualFolder | undefined {
  const trimmed = input.trim();
  if (trimmed === '') {
    return findByExactPath(tree, cwd);
  }

  const joined = joinVfsPath(cwd, trimmed);

  const direct = findByExactPath(tree, joined);
  if (direct) return direct;

  const hasExtension = /\.[a-zA-Z0-9]+$/.test(joined);
  if (!hasExtension) {
    for (const ext of KNOWN_EXTENSIONS) {
      const withExt = findByExactPath(tree, `${joined}.${ext}`);
      if (withExt) return withExt;
    }
  }

  return findById(tree, trimmed);
}
