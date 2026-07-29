import type { ConstellationGraph } from './constellationGraph';

/**
 * Construction order for the Tech Stack Constellation — "neurons
 * connecting," not a flat fade-in. A depth-first, parent-before-child
 * traversal of the tree buildConstellationGraph() produces: the root
 * appears, then for each of its children in turn — the edge to that child
 * draws, the child appears, and the child's own subtree is fully revealed
 * — before moving to the next sibling. Siblings are never simultaneous:
 * each gets a strictly later position in this list, which
 * useFileRevealSequence turns into a later delay.
 */

export type ConstellationRevealUnit =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string; from: string; to: string };

export function buildConstellationRevealOrder(graph: ConstellationGraph): ConstellationRevealUnit[] {
  const units: ConstellationRevealUnit[] = [];
  if (!graph.rootId) return units;

  const childrenOf = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = childrenOf.get(edge.from) ?? [];
    list.push(edge.to);
    childrenOf.set(edge.from, list);
  }

  units.push({ type: 'node', id: graph.rootId });

  const visit = (parentId: string) => {
    for (const childId of childrenOf.get(parentId) ?? []) {
      units.push({ type: 'edge', id: `${parentId}->${childId}`, from: parentId, to: childId });
      units.push({ type: 'node', id: childId });
      visit(childId);
    }
  };
  visit(graph.rootId);

  return units;
}
