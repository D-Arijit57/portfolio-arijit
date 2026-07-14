import {
  isValidFileType,
  isVirtualFile,
  type VirtualFile,
  type VirtualFolder,
  type VirtualNode,
  WorkspaceIntegrityError,
} from '../types';

/**
 * Enforces every WorkspaceTree invariant from VFS_DESIGN.md §1.3/§5: single root,
 * global id uniqueness, path consistency, valid discrimination, valid node types.
 * Throws WorkspaceIntegrityError on the first violation found.
 */
export function validateWorkspaceTree(root: VirtualFolder): void {
  if (root.id !== 'root' || root.path !== '/') {
    throw new WorkspaceIntegrityError(
      `WorkspaceTree root must have id "root" and path "/" (got id="${root.id}", path="${root.path}")`,
    );
  }
  validateNode(root, '/', new Set<string>());
}

function validateNode(node: VirtualNode, expectedPath: string, seenIds: Set<string>): void {
  if (!node.id) {
    throw new WorkspaceIntegrityError(`Node at path "${node.path}" has an empty id`);
  }
  // Tree-wide uniqueness (§5.8) — also the practical acyclic guard: a node whose id
  // was already visited during this same traversal indicates the tree references
  // the same node twice rather than being a strict single-parent hierarchy.
  if (seenIds.has(node.id)) {
    throw new WorkspaceIntegrityError(`Duplicate id "${node.id}" found in WorkspaceTree`);
  }
  seenIds.add(node.id);

  if (node.path !== expectedPath) {
    throw new WorkspaceIntegrityError(
      `Node "${node.id}" has inconsistent path: expected "${expectedPath}", got "${node.path}"`,
    );
  }

  if (expectedPath !== '/') {
    const expectedName = expectedPath.slice(expectedPath.lastIndexOf('/') + 1);
    if (node.name !== expectedName) {
      throw new WorkspaceIntegrityError(
        `Node "${node.id}" name "${node.name}" does not match final path segment "${expectedName}"`,
      );
    }
  }

  // Discrimination contract (§1.2/§5.6): a node must be a file XOR a folder,
  // never both and never neither. Checked explicitly here rather than inferred
  // from whichever branch `isVirtualFile` happens to land in, so a node
  // carrying both keys can't silently be treated as a file with its `children`
  // ignored (previously unreachable/unvalidated/unindexed).
  const hasContent = 'content' in node;
  const hasChildren = 'children' in node;

  if (hasContent === hasChildren) {
    throw new WorkspaceIntegrityError(
      hasContent
        ? `Node "${node.id}" carries both "content" and "children" — a node must be either a file or a folder, never both`
        : `Node "${node.id}" carries neither "content" nor "children" — a node must be either a file or a folder`,
    );
  }

  if (hasContent) {
    const file = node as VirtualFile;
    if (typeof file.content !== 'string') {
      throw new WorkspaceIntegrityError(`File "${file.id}" must have string content`);
    }
    if (!isValidFileType(file.type)) {
      throw new WorkspaceIntegrityError(`File "${file.id}" has invalid type "${file.type}"`);
    }
  } else {
    const folder = node as VirtualFolder;
    if (!Array.isArray(folder.children)) {
      throw new WorkspaceIntegrityError(`Folder "${folder.id}" must have a children array`);
    }
    for (const child of folder.children) {
      const childPath = expectedPath === '/' ? `/${child.name}` : `${expectedPath}/${child.name}`;
      validateNode(child, childPath, seenIds);
    }
  }
}

/**
 * Static ids must never contain ":" — that character is reserved as the
 * namespace separator for generated content (VFS_DESIGN.md §2). Run once,
 * at construction, over the static seed only.
 */
export function assertNoColonInStaticIds(node: VirtualNode): void {
  if (node.id.includes(':')) {
    throw new WorkspaceIntegrityError(
      `Static node id "${node.id}" must not contain ":" — reserved for generated-content namespacing`,
    );
  }
  if (!isVirtualFile(node)) {
    node.children.forEach(assertNoColonInStaticIds);
  }
}

/**
 * Every node contributed to a generated namespace must carry an id prefixed
 * "<namespace>:" (VFS_DESIGN.md §2/§7) — checked before the candidate node set
 * is ever merged into the tree.
 */
export function assertGeneratedIdsNamespaced(namespace: string, nodes: readonly VirtualNode[]): void {
  const prefix = `${namespace}:`;
  const check = (node: VirtualNode): void => {
    if (!node.id.startsWith(prefix)) {
      throw new WorkspaceIntegrityError(
        `Generated node "${node.id}" under namespace "${namespace}" must have an id prefixed "${prefix}"`,
      );
    }
    if (!isVirtualFile(node)) {
      node.children.forEach(check);
    }
  };
  nodes.forEach(check);
}
