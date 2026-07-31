import type { GraphModel } from '../types';
import type {
  GraphBuildEdge,
  GraphBuildNode,
  GraphBuildResult,
  GraphCategoryBuildNode,
  GraphLeafBuildNode,
  GraphRootBuildNode,
  GraphValidationWarning,
} from './types';
import { computeGraphStatistics } from './statistics';
import { validateCategoryDeclaration, validatePrerequisites, validateRelatedNodes } from './validate';

/**
 * Graph Builder — turns a parsed GraphModel (Milestone 1) into the
 * GraphBuildResult every renderer/layout/interaction layer downstream
 * consumes. Same "pure function, structured data in, structured data out"
 * contract as loadGraphModel() and buildConstellationGraph(): no React, no
 * DOM, no coordinates. Generic over any GraphModel — nothing here knows
 * "skills", "frontend", or any other domain the content happens to use.
 *
 * GraphModel's `categories`/`nodes` are arrays, not object keys, so authored
 * YAML order is already deterministic; this builder processes them in a
 * single top-to-bottom pass and never reaches for a Set/Map whose iteration
 * order could vary, so the same GraphModel always produces byte-identical
 * `nodes`/`edges` ordering.
 *
 * Root and category ids are namespaced (`graph:root`, `graph:category:*`)
 * so they can never collide with an author-chosen leaf id like "react" or
 * "python"; leaf ids are used verbatim since Milestone 1's YAML already
 * treats them as globally unique within one graph.
 */

const ROOT_ID = 'graph:root';

function categoryNodeId(key: string): string {
  return `graph:category:${key}`;
}

export function buildGraph(model: GraphModel): GraphBuildResult {
  const warnings: GraphValidationWarning[] = [];
  const nodes: GraphBuildNode[] = [];
  const edges: GraphBuildEdge[] = [];
  const nodeById = new Map<string, GraphBuildNode>();
  const childrenById = new Map<string, string[]>();
  const parentById = new Map<string, string | undefined>();
  const categoryLookup = new Map<string, GraphCategoryBuildNode>();
  const categoryNodes: GraphCategoryBuildNode[] = [];
  const leafNodes: GraphLeafBuildNode[] = [];

  const rootNode: GraphRootBuildNode = {
    kind: 'root',
    id: ROOT_ID,
    label: model.title,
    description: model.description || undefined,
    depth: 0,
  };
  nodes.push(rootNode);
  nodeById.set(rootNode.id, rootNode);
  childrenById.set(rootNode.id, []);
  parentById.set(rootNode.id, undefined);

  const seenCategoryKeys = new Set<string>();
  const seenLeafIds = new Set<string>();

  for (const category of model.categories) {
    if (seenCategoryKeys.has(category.key)) {
      warnings.push({
        type: 'duplicate-category',
        nodeId: category.key,
        message: `Duplicate category key "${category.key}" — skipping the repeat.`,
      });
      continue;
    }

    const catId = categoryNodeId(category.key);
    if (nodeById.has(catId)) {
      warnings.push({
        type: 'duplicate-id',
        nodeId: catId,
        message: `Category id "${catId}" collides with an existing node id — skipping category "${category.key}".`,
      });
      continue;
    }
    seenCategoryKeys.add(category.key);

    const categoryNode: GraphCategoryBuildNode = {
      kind: 'category',
      id: catId,
      key: category.key,
      label: category.title,
      depth: 1,
    };
    nodes.push(categoryNode);
    categoryNodes.push(categoryNode);
    categoryLookup.set(category.key, categoryNode);
    nodeById.set(catId, categoryNode);
    childrenById.set(catId, []);
    parentById.set(catId, rootNode.id);
    childrenById.get(rootNode.id)!.push(catId);
    edges.push({ from: rootNode.id, to: catId });

    for (const rawNode of category.nodes) {
      if (nodeById.has(rawNode.id)) {
        warnings.push({
          type: 'duplicate-id',
          nodeId: rawNode.id,
          message: seenLeafIds.has(rawNode.id)
            ? `Duplicate node id "${rawNode.id}" — skipping the repeat.`
            : `Node id "${rawNode.id}" collides with a category/root id — skipping.`,
        });
        continue;
      }
      seenLeafIds.add(rawNode.id);

      const leafNode: GraphLeafBuildNode = {
        kind: 'leaf',
        id: rawNode.id,
        label: rawNode.name,
        categoryKey: category.key,
        depth: 2,
        source: rawNode,
      };
      nodes.push(leafNode);
      leafNodes.push(leafNode);
      nodeById.set(leafNode.id, leafNode);
      childrenById.set(leafNode.id, []);
      parentById.set(leafNode.id, catId);
      childrenById.get(catId)!.push(leafNode.id);
      edges.push({ from: catId, to: leafNode.id });
    }
  }

  // Referential validation runs after every leaf/category id is known, so
  // cross-references (relatedNodes, prerequisites, mismatched category
  // labels) can be checked regardless of declaration order in the YAML.
  for (const leaf of leafNodes) {
    const categoryWarning = validateCategoryDeclaration(leaf, seenCategoryKeys);
    if (categoryWarning) warnings.push(categoryWarning);
    warnings.push(...validateRelatedNodes(leaf, seenLeafIds));
    warnings.push(...validatePrerequisites(leaf, seenLeafIds));
  }

  const neighborsById = new Map<string, string[]>();
  for (const node of nodes) {
    const parent = parentById.get(node.id);
    const children = childrenById.get(node.id) ?? [];
    neighborsById.set(node.id, parent ? [parent, ...children] : [...children]);
  }

  for (const problem of warnings) {
    console.warn(`[graph-builder] ${problem.message}`);
  }

  const statistics = computeGraphStatistics(nodes, edges, categoryNodes.length, neighborsById);

  return {
    nodes,
    edges,
    rootNode,
    categoryNodes,
    leafNodes,
    nodeById,
    childrenById,
    parentById,
    neighborsById,
    categoryLookup,
    warnings,
    statistics,
  };
}
