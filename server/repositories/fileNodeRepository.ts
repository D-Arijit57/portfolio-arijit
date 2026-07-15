import type { VirtualFile, VirtualFolder, VirtualNode, WorkspaceTree } from '../types';

/**
 * Hides the storage mechanism (in-memory seed today, a database later) from
 * FileSystemService and everything above it — see VFS_DESIGN.md §3.
 *
 * Methods return Promises even though today's implementation is synchronous
 * in-memory data: a future database-backed implementation must be a drop-in
 * replacement with no change to this interface or any of its consumers.
 */
export interface FileNodeRepository {
  /** The only method Sprint 2A's consumer (Milestone 2's route, next sprint) needs. */
  getRootTree(): Promise<WorkspaceTree>;

  getFileById(id: string): Promise<VirtualFile | undefined>;

  getFolderById(id: string): Promise<VirtualFolder | undefined>;

  /**
   * Persists an edit to an existing file's content (VFS_DESIGN.md §3.1) — the
   * only way a single file's content changes outside of reconcileGeneratedSubtree's
   * namespace-level replace. Mutates `content` only; `id`, `name`, `path`, `type`
   * are immutable through this method. Throws NotFoundError if `id` is absent or
   * resolves to a folder; throws WorkspaceIntegrityError if the candidate tree
   * fails validation. Does not check `isReadonly` — that is FileSystemService's
   * business-policy responsibility, not this method's.
   */
  updateFileContent(id: string, content: string): Promise<VirtualFile>;

  listChildren(folderId: string): Promise<readonly VirtualNode[] | undefined>;

  /** Basic name/path substring match over the reconciled tree — not the Phase 3 Search Engine. */
  searchFiles(query: string): Promise<VirtualFile[]>;

  /**
   * The only way generated content enters or leaves the tree (VFS_DESIGN.md §7).
   * `nodes` is the complete current node set for `namespace` — a full-replace
   * reconciliation, not an incremental diff: ids in `nodes` not previously
   * present are inserted, ids present in both are updated, and previously
   * present ids absent from `nodes` are removed.
   */
  reconcileGeneratedSubtree(namespace: string, nodes: readonly VirtualNode[]): Promise<void>;
}
