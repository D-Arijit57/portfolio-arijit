import type { ConstellationGraph } from './constellationGraph';

/**
 * Construction order for the Tech Stack Constellation — "software being
 * assembled," never random. A real graph-engine step (Kahl's algorithm)
 * computes a topological order over the authored `connectsTo` edges, so a
 * convergence node (two or more incoming edges, e.g. a framework two other
 * technologies both connect into) only appears once every technology that
 * feeds it already exists — something a single-root DFS can't express.
 *
 * For each node in that order: the node appears, then every edge leading
 * OUT of it draws immediately after (toward wherever its target — which
 * may not exist yet — will settle). This matches the "after a node
 * appears, draw its dependent edges" sequencing: a node can have its
 * outgoing line already drawn across empty space before the node at the
 * far end has had its own turn.
 */

export type ConstellationRevealUnit =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string; from: string; to: string };

/** Kahn's algorithm. If the authored `connectsTo` data contains a cycle
 * (shouldn't happen for hand-authored data, but never trust content as a
 * guarantee), whatever nodes remain stuck are appended in their original
 * declaration order rather than left out — "detect cycles and break them
 * gracefully," not silently drop technologies from the constellation. */
function topologicalOrder(graph: ConstellationGraph): string[] {
  const inDegree = new Map<string, number>(graph.nodes.map((n) => [n.id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue: string[] = graph.nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  const order: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (visited.has(id)) continue;
    visited.add(id);
    order.push(id);
    for (const nextId of outgoing.get(id) ?? []) {
      const remaining = (inDegree.get(nextId) ?? 0) - 1;
      inDegree.set(nextId, remaining);
      if (remaining === 0) queue.push(nextId);
    }
  }

  if (visited.size < graph.nodes.length) {
    for (const node of graph.nodes) {
      if (!visited.has(node.id)) order.push(node.id);
    }
  }

  return order;
}

export function buildConstellationRevealOrder(graph: ConstellationGraph): ConstellationRevealUnit[] {
  if (graph.nodes.length === 0) return [];

  const units: ConstellationRevealUnit[] = [];
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  }

  for (const nodeId of topologicalOrder(graph)) {
    units.push({ type: 'node', id: nodeId });
    for (const targetId of outgoing.get(nodeId) ?? []) {
      units.push({ type: 'edge', id: `${nodeId}->${targetId}`, from: nodeId, to: targetId });
    }
  }

  return units;
}
