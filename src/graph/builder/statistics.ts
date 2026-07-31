import type { GraphBuildEdge, GraphBuildNode, GraphStatistics } from './types';

/**
 * Pure, side-effect-free structural stats over a finished build's
 * nodes/edges/adjacency. Split out from buildGraph.ts's assembly loop for
 * the same reason validate.ts is separate: a standalone rule that's easy to
 * test and reason about without constructing a full GraphModel.
 */
export function computeGraphStatistics(
  nodes: GraphBuildNode[],
  edges: GraphBuildEdge[],
  categoryCount: number,
  neighborsById: Map<string, string[]>,
): GraphStatistics {
  const totalNodes = nodes.length;
  const totalEdges = edges.length;

  let maxDepth = 0;
  let isolatedNodes = 0;
  for (const node of nodes) {
    if (node.depth > maxDepth) maxDepth = node.depth;
    if ((neighborsById.get(node.id)?.length ?? 0) === 0) isolatedNodes += 1;
  }

  return {
    totalNodes,
    totalEdges,
    totalCategories: categoryCount,
    maxDepth,
    isolatedNodes,
    averageChildren: totalNodes > 0 ? totalEdges / totalNodes : 0,
  };
}
