import {
  isVirtualFile,
  NotFoundError,
  WorkspaceIntegrityError,
  type VirtualFile,
  type VirtualFolder,
  type VirtualNode,
  type WorkspaceTree,
} from '../types';
import type { FileNodeRepository } from './fileNodeRepository';
import {
  assertGeneratedIdsNamespaced,
  assertNoColonInStaticIds,
  validateWorkspaceTree,
} from './validation';

/**
 * Phase 1 / Sprint 2A implementation of FileNodeRepository, backed by an
 * in-memory seed (BACKEND_BOOTSTRAP.md Milestone 2 scope — swapping this for a
 * database-backed implementation is explicitly deferred, not this sprint's job).
 *
 * Owns the single reconciled source of truth for static + generated content
 * (VFS_DESIGN.md §3/§7) — every method reads from the same `root`/`index`,
 * there is no separate merge step anywhere above this class.
 */
export class InMemoryFileNodeRepository implements FileNodeRepository {
  private root: WorkspaceTree;
  private index: Map<string, VirtualNode>;

  constructor(seed: VirtualFolder) {
    // Confirms local content is readable/well-formed at construction time —
    // the in-memory equivalent of BACKEND_BOOTSTRAP.md's startup lifecycle
    // step "FileNodeRepository establishes its data source connection."
    validateWorkspaceTree(seed);
    assertNoColonInStaticIds(seed);
    this.root = seed;
    this.index = InMemoryFileNodeRepository.buildIndex(seed);
  }

  async getRootTree(): Promise<WorkspaceTree> {
    return this.root;
  }

  async getFileById(id: string): Promise<VirtualFile | undefined> {
    const node = this.index.get(id);
    return node && isVirtualFile(node) ? node : undefined;
  }

  async getFolderById(id: string): Promise<VirtualFolder | undefined> {
    const node = this.index.get(id);
    return node && !isVirtualFile(node) ? node : undefined;
  }

  async listChildren(folderId: string): Promise<readonly VirtualNode[] | undefined> {
    const folder = await this.getFolderById(folderId);
    return folder?.children;
  }

  async searchFiles(query: string): Promise<VirtualFile[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    const results: VirtualFile[] = [];
    for (const node of this.index.values()) {
      if (!isVirtualFile(node)) {
        continue;
      }
      if (node.name.toLowerCase().includes(needle) || node.path.toLowerCase().includes(needle)) {
        results.push(node);
      }
    }
    return results;
  }

  async reconcileGeneratedSubtree(namespace: string, nodes: readonly VirtualNode[]): Promise<void> {
    if (!namespace || namespace.includes('/') || namespace.includes(':')) {
      throw new WorkspaceIntegrityError(`Invalid generated-content namespace "${namespace}"`);
    }
    // Every node in this namespace's contribution must be correctly namespaced
    // before it's allowed anywhere near the tree (VFS_DESIGN.md §2/§7).
    assertGeneratedIdsNamespaced(namespace, nodes);

    const namespacePath = `/${namespace}`;
    const namespaceFolder: VirtualFolder = {
      id: namespace,
      name: namespace,
      path: namespacePath,
      children: nodes,
    };

    // Full-replace by namespace: drop whatever this namespace's folder held
    // before, wholesale, and put the new set in its place. This single
    // operation is what gives insert/update/delete semantics for free —
    // an id absent from `nodes` is simply gone, with no separate diff step.
    const candidateRoot: WorkspaceTree = {
      ...this.root,
      children: [
        ...this.root.children.filter((child) => child.path !== namespacePath),
        namespaceFolder,
      ],
    };

    // Validate the whole candidate tree — static content plus every generated
    // namespace — before committing. A violation here (e.g. an id collision
    // with static content or another namespace) leaves `this.root`/`this.index`
    // completely untouched: reconciliation is atomic, never partially applied.
    validateWorkspaceTree(candidateRoot);

    this.root = candidateRoot;
    this.index = InMemoryFileNodeRepository.buildIndex(candidateRoot);
  }

  async updateFileContent(id: string, content: string): Promise<VirtualFile> {
    const existing = this.index.get(id);
    if (!existing || !isVirtualFile(existing)) {
      throw new NotFoundError(`No file found with id "${id}"`);
    }

    let updated: VirtualFile | undefined;

    // Rebuilds only the ancestor chain from root down to the target file,
    // reusing every untouched sibling/subtree by reference — the same
    // structural-sharing approach as reconcileGeneratedSubtree, just recursive
    // instead of single-level, since a static file can be arbitrarily deep
    // (VFS_DESIGN.md §3.1).
    const rebuild = (node: VirtualNode): VirtualNode => {
      if (isVirtualFile(node)) {
        return node;
      }
      let changed = false;
      const children = node.children.map((child) => {
        if (isVirtualFile(child)) {
          if (child.id !== id) {
            return child;
          }
          changed = true;
          updated = { ...child, content };
          return updated;
        }
        const rebuiltChild = rebuild(child);
        if (rebuiltChild !== child) {
          changed = true;
        }
        return rebuiltChild;
      });
      return changed ? { ...node, children } : node;
    };

    const candidateRoot = rebuild(this.root) as WorkspaceTree;

    // Validate the whole candidate tree before committing — same atomicity
    // guarantee as reconcileGeneratedSubtree: a failed candidate leaves
    // `this.root`/`this.index` completely untouched (VFS_DESIGN.md §3.1).
    validateWorkspaceTree(candidateRoot);

    this.root = candidateRoot;
    this.index = InMemoryFileNodeRepository.buildIndex(candidateRoot);

    return updated as VirtualFile;
  }

  private static buildIndex(root: WorkspaceTree): Map<string, VirtualNode> {
    const index = new Map<string, VirtualNode>();
    const visit = (node: VirtualNode): void => {
      index.set(node.id, node);
      if (!isVirtualFile(node)) {
        node.children.forEach(visit);
      }
    };
    visit(root);
    return index;
  }
}
