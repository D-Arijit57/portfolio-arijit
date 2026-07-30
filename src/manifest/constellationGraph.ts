import type { ManifestModel, ManifestPosition } from './types';

/**
 * Tech Stack Constellation — graph data derived from a ManifestModel. Pure
 * function, same "structured data in, model out" philosophy as
 * parseManifest() itself: never hardcodes a project, category, or
 * technology.
 *
 * Topology is authored, not inferred: each technology's optional
 * `connectsTo` names the technologies it visually connects to and precedes
 * in the construction sequence (see constellationReveal.ts's topological
 * sort). This is what lets a project's constellation read as a real,
 * asymmetric, hand-mapped star chart — an apex, a convergence point, two
 * diverging rails, a closing chain — instead of a hub-and-spoke graph
 * mechanically generated from category membership. A manifest that
 * authors no `connectsTo` anywhere (an older-style or minimal manifest)
 * falls back to a simple declaration-order chain across all technologies,
 * so nothing crashes and something reasonable still renders.
 */

const CONSTELLATION_PALETTE = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
  '#9ca3af', // gray
  '#ec4899', // pink
  '#84cc16', // lime
] as const;

function constellationColorForCategory(categoryIndex: number): string {
  return CONSTELLATION_PALETTE[categoryIndex % CONSTELLATION_PALETTE.length];
}

export type ConstellationTier = 'primary' | 'secondary' | 'supporting';

export interface ConstellationNode {
  id: string;
  technology: string;
  role: string;
  description?: string;
  tags?: string[];
  categoryKey: string;
  categoryLabel: string;
  categoryIndex: number;
  color: string;
  tier: ConstellationTier;
  /** Hand-authored anchor point, if the manifest provides one. */
  position?: ManifestPosition;
}

export interface ConstellationEdge {
  from: string;
  to: string;
}

export interface ConstellationCategorySummary {
  key: string;
  label: string;
  color: string;
  count: number;
}

export interface ConstellationGraph {
  project: string;
  description: string;
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  /** In manifest-authored order — used for the Legend and the Architecture Flow list. */
  categories: ConstellationCategorySummary[];
}

export function buildConstellationGraph(model: ManifestModel): ConstellationGraph {
  const nodes: ConstellationNode[] = [];
  const categories: ConstellationCategorySummary[] = [];
  const idByName = new Map<string, string>();

  model.categories.forEach((category, categoryIndex) => {
    const color = constellationColorForCategory(categoryIndex);
    categories.push({ key: category.key, label: category.title, color, count: category.technologies.length });

    category.technologies.forEach((tech) => {
      const id = `tech:${category.key}:${tech.technology}`;
      idByName.set(tech.technology, id);

      nodes.push({
        id,
        technology: tech.technology,
        role: tech.role,
        description: tech.description,
        tags: tech.tags,
        categoryKey: category.key,
        categoryLabel: category.title,
        categoryIndex,
        color,
        tier: tech.importance ?? 'supporting',
        position: tech.position,
      });
    });
  });

  const authoredEdges: ConstellationEdge[] = [];
  model.categories.forEach((category) => {
    category.technologies.forEach((tech) => {
      const fromId = idByName.get(tech.technology);
      if (!fromId || !tech.connectsTo) return;
      for (const targetName of tech.connectsTo) {
        const toId = idByName.get(targetName);
        if (toId) authoredEdges.push({ from: fromId, to: toId });
      }
    });
  });

  // Fallback for a manifest with no authored topology at all: chain every
  // node in declaration order, so a bare-bones manifest (no connectsTo)
  // still produces a connected, sensible-looking constellation rather than
  // a field of disconnected stars.
  const edges: ConstellationEdge[] =
    authoredEdges.length > 0
      ? authoredEdges
      : nodes.slice(1).map((node, i) => ({ from: nodes[i].id, to: node.id }));

  return { project: model.project, description: model.description, nodes, edges, categories };
}
