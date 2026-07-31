import type { GraphNode } from '../types';

/**
 * Output shape of the Graph Builder (buildGraph.ts) — the single source of
 * truth every renderer, layout, and interaction layer downstream consumes.
 * Nothing here computes a position; that's the Layout Engine's job later.
 *
 * Three node kinds form a fixed three-level tree (root -> category -> leaf),
 * a deliberate union instead of one bag-of-optional-fields type: a root
 * node has no `categoryKey`, a category node has no `source`, so there's
 * nothing to leave undefined and no kind-specific field can be misread on
 * the wrong node type.
 */

export interface GraphRootBuildNode {
  kind: 'root';
  id: string;
  label: string;
  description?: string;
  depth: 0;
}

export interface GraphCategoryBuildNode {
  kind: 'category';
  id: string;
  /** The category's own authored key (e.g. "frontend"), distinct from `id`, which is namespaced to avoid colliding with leaf node ids. */
  key: string;
  label: string;
  depth: 1;
}

export interface GraphLeafBuildNode {
  kind: 'leaf';
  /** Same as the authored GraphNode.id — leaves are never renamespaced, since Milestone 1's YAML already treats ids as globally unique within a graph. */
  id: string;
  label: string;
  categoryKey: string;
  depth: 2;
  /** The full authored node — icon, description, proficiency, relatedNodes, etc. Untouched by the builder; renderers read it directly. */
  source: GraphNode;
}

export type GraphBuildNode = GraphRootBuildNode | GraphCategoryBuildNode | GraphLeafBuildNode;

/** Structural parent -> child edges only (root->category, category->leaf). `relatedNodes`/`prerequisites` are validated but deliberately not materialized as edges — see ARCHITECTURE.md's Milestone 1 note on why `relatedNodes` stays out of the permanent graph. */
export interface GraphBuildEdge {
  from: string;
  to: string;
}

export type GraphValidationWarningType =
  | 'duplicate-category'
  | 'duplicate-id'
  | 'category-mismatch'
  | 'missing-category'
  | 'invalid-related-node'
  | 'invalid-prerequisite'
  | 'self-reference';

export interface GraphValidationWarning {
  type: GraphValidationWarningType;
  nodeId: string;
  message: string;
}

/** Lightweight structural stats, computed once in buildGraph() so no downstream consumer (layout tuning, dev tooling, future .graph validation) recomputes them. */
export interface GraphStatistics {
  totalNodes: number;
  totalEdges: number;
  totalCategories: number;
  maxDepth: number;
  /** Nodes with zero tree neighbors (no parent and no children) — 0 for any normal graph, since every leaf has a parent and every category retains at least one node. */
  isolatedNodes: number;
  /** Mean number of children per node across the whole tree (totalEdges / totalNodes) — a simple branching-density figure, not scoped to non-leaf nodes only. */
  averageChildren: number;
}

export interface GraphBuildResult {
  /** All nodes — root, then categories, then leaves — in deterministic, authored order. */
  nodes: GraphBuildNode[];
  edges: GraphBuildEdge[];
  rootNode: GraphRootBuildNode;
  categoryNodes: GraphCategoryBuildNode[];
  leafNodes: GraphLeafBuildNode[];
  nodeById: Map<string, GraphBuildNode>;
  childrenById: Map<string, string[]>;
  parentById: Map<string, string | undefined>;
  /** Tree adjacency: a node's parent plus its children. Not the same graph `relatedNodes` describes. */
  neighborsById: Map<string, string[]>;
  categoryLookup: Map<string, GraphCategoryBuildNode>;
  warnings: GraphValidationWarning[];
  statistics: GraphStatistics;
}
