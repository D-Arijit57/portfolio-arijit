import type { FileNodeRepository } from '../repositories/fileNodeRepository';
import { validateWorkspaceTree } from '../repositories/validation';
import { BadRequestError, NotFoundError, type VirtualFile, type WorkspaceTree } from '../types';

/**
 * Business logic layer between the route layer and FileNodeRepository
 * (VFS_DESIGN.md §4). Sprint 2B added getFullTree(); Sprint 2C (§4.1) adds
 * getFileById() and updateFile() — thin orchestration plus the one piece of
 * business policy Phase 2 introduces: readonly enforcement.
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

  /**
   * Retrieves a single file by id (VFS_DESIGN.md §4.1). A file already inside
   * the reconciled tree is already known-valid — it passed validateWorkspaceTree
   * when it entered the tree — so no additional validation is performed here.
   */
  async getFileById(id: string): Promise<VirtualFile> {
    const file = await this.repository.getFileById(id);
    if (!file) {
      throw new NotFoundError(`No file found with id "${id}"`);
    }
    return file;
  }

  /**
   * Persists an edit to a file's content (VFS_DESIGN.md §4.1). Owns the
   * readonly-enforcement policy: checked here, against the pre-edit node, and
   * not inside the repository, because readonly is a business rule about who
   * is allowed to write, not a structural fact about the tree itself
   * (§3.1 "Readonly behavior"). Persistence mechanics (candidate tree, atomic
   * commit) belong entirely to FileNodeRepository.updateFileContent.
   */
  async updateFile(id: string, content: string): Promise<VirtualFile> {
    const existing = await this.repository.getFileById(id);
    if (!existing) {
      throw new NotFoundError(`No file found with id "${id}"`);
    }
    if (existing.isReadonly) {
      throw new BadRequestError(`File "${id}" is readonly and cannot be edited`);
    }
    return this.repository.updateFileContent(id, content);
  }
}
