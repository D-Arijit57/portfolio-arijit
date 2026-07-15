import type { FileNodeRepository } from '../repositories/fileNodeRepository';
import { validateWorkspaceTree } from '../repositories/validation';
import type { WorkspaceTree } from '../types';

/**
 * Business logic layer between the route layer and FileNodeRepository
 * (VFS_DESIGN.md §4). Sprint 2B: a single method, getFullTree().
 *
 * Depends on the FileNodeRepository interface, not a concrete implementation —
 * swapping the in-memory repository for a database-backed one must never
 * require a change here.
 */
export class FileSystemService {
  constructor(private readonly repository: FileNodeRepository) {}

  /**
   * Assembles and validates the full workspace tree. Re-validates the
   * repository's output against every VFS_DESIGN.md §5 rule regardless of
   * which FileNodeRepository implementation produced it — the interface
   * itself carries no validation guarantee, only this concrete in-memory
   * implementation happens to also validate on write.
   */
  async getFullTree(): Promise<WorkspaceTree> {
    const tree = await this.repository.getRootTree();
    validateWorkspaceTree(tree);
    return tree;
  }
}
