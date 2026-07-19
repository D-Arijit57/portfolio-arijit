/**
 * Generic Content Provider pattern (VFS_DESIGN.md §11). Every generated
 * namespace reconcileGeneratedSubtree accepts is produced by exactly one
 * ContentProvider implementation. This interface stays deliberately generic —
 * no GitHub-specific (or any source-specific) methods belong here (§11.1).
 */

export type ProviderState = 'idle' | 'syncing' | 'error';

export interface ProviderStatus {
  readonly state: ProviderState;
  /** ISO timestamp of the last successful refresh, if any (§11.4). */
  readonly lastSyncedAt?: string;
  /** Message from the most recent failed refresh, if any (§11.4). */
  readonly lastError?: string;
}

export interface ContentProvider {
  /** 'github', 'leetcode', 'blog', ... — same namespace §2/§7.1 already require. */
  readonly namespace: string;

  /** Fetch → transform → generate → reconcile (§11.2). Never throws — failures are captured in getStatus(). */
  refresh(): Promise<void>;

  /** In-memory only; never a VirtualFile field, never sent through /api/fs/* (§11.4). */
  getStatus(): ProviderStatus;
}
