import type { GraphBuildNode, GraphBuildResult } from './types';

/**
 * Traversal helpers over a GraphBuildResult — the foundation hover,
 * selection, highlighting, search, filters, and future layouts all build
 * on, so none of them ever walk `childrenById`/`parentById` by hand.
 *
 * Plain functions taking the result as their first argument, not methods on
 * the result object — same style as loadGraphModel()/buildConstellationGraph
 * (data and behavior kept separate, no classes) elsewhere in this codebase.
 * Every walk here follows `childrenById`, which is built in authored order,
 * so results are deterministic across calls.
 */

function nodesFor(result: GraphBuildResult, ids: readonly string[]): GraphBuildNode[] {
  const found: GraphBuildNode[] = [];
  for (const id of ids) {
    const node = result.nodeById.get(id);
    if (node) found.push(node);
  }
  return found;
}

export function getChildren(result: GraphBuildResult, id: string): GraphBuildNode[] {
  return nodesFor(result, result.childrenById.get(id) ?? []);
}

export function getParent(result: GraphBuildResult, id: string): GraphBuildNode | undefined {
  const parentId = result.parentById.get(id);
  return parentId ? result.nodeById.get(parentId) : undefined;
}

export function getNeighbors(result: GraphBuildResult, id: string): GraphBuildNode[] {
  return nodesFor(result, result.neighborsById.get(id) ?? []);
}

/** Breadth-first, excluding `id` itself. */
export function getDescendants(result: GraphBuildResult, id: string): GraphBuildNode[] {
  const descendants: GraphBuildNode[] = [];
  const queue: string[] = [...(result.childrenById.get(id) ?? [])];

  while (queue.length > 0) {
    const nextId = queue.shift()!;
    const node = result.nodeById.get(nextId);
    if (!node) continue;
    descendants.push(node);
    queue.push(...(result.childrenById.get(nextId) ?? []));
  }

  return descendants;
}

/** Walks parent -> parent up to (and including) the root, excluding `id` itself. */
export function getAncestors(result: GraphBuildResult, id: string): GraphBuildNode[] {
  const ancestors: GraphBuildNode[] = [];
  let currentId = result.parentById.get(id);

  while (currentId) {
    const node = result.nodeById.get(currentId);
    if (!node) break;
    ancestors.push(node);
    currentId = result.parentById.get(currentId);
  }

  return ancestors;
}
