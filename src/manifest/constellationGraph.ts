import type { ManifestModel } from './types';

/**
 * Tech Stack Constellation — graph data derived from a ManifestModel. Pure
 * function, same "structured data in, model out" philosophy as
 * parseManifest() itself: never hardcodes a project, category, or
 * technology. Deliberately independent of src/architecture/.
 *
 * Topology: a star, not a deep dependency tree — the manifest's primary
 * technology (see tier rules below) sits at the center, and every
 * category's own "entry" technology connects directly to it. A category
 * with more than one technology gets one small local branch: its other
 * technologies connect to that category's own entry, not to the center.
 * For a project like Cortexa, where the primary technology's own category
 * (frontend) is also the center, this collapses to almost every node
 * connecting directly to the center — matching the reference's mostly-
 * direct-to-hub composition — while a category with several technologies
 * (deployment: Vercel + Convex Cloud + Stream Cloud) still reads as its
 * own small cluster rather than three more spokes crowding the center.
 * This falls out of category structure automatically; nothing here is
 * Cortexa-specific.
 *
 * Curated hierarchy: each technology may set an explicit `importance`
 * ('primary' | 'secondary' | 'supporting') in the manifest. Absent that,
 * a sensible default applies — the manifest's first technology overall is
 * primary (the center), each category's first technology is secondary,
 * everything else is supporting. "If hints exist, respect them; if not,
 * generate intelligent defaults."
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

export interface ConstellationLayoutHint {
  depth?: number;
  orbit?: number;
  angle?: number;
}

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
  layoutHint?: ConstellationLayoutHint;
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
  rootId: string | undefined;
  /** In manifest-authored order — used for the Legend and the Architecture Flow list. */
  categories: ConstellationCategorySummary[];
}

export function buildConstellationGraph(model: ManifestModel): ConstellationGraph {
  const nodes: ConstellationNode[] = [];
  const categories: ConstellationCategorySummary[] = [];

  model.categories.forEach((category, categoryIndex) => {
    const color = constellationColorForCategory(categoryIndex);
    categories.push({ key: category.key, label: category.title, color, count: category.technologies.length });

    category.technologies.forEach((tech, techIndex) => {
      const isFirstOverall = categoryIndex === 0 && techIndex === 0;
      const isCategoryEntry = techIndex === 0;
      const tier: ConstellationTier =
        tech.importance ?? (isFirstOverall ? 'primary' : isCategoryEntry ? 'secondary' : 'supporting');

      nodes.push({
        id: `tech:${category.key}:${tech.technology}`,
        technology: tech.technology,
        role: tech.role,
        description: tech.description,
        tags: tech.tags,
        categoryKey: category.key,
        categoryLabel: category.title,
        categoryIndex,
        color,
        tier,
        layoutHint: tech.layoutHint,
      });
    });
  });

  // The center: whichever node an explicit `importance: 'primary'` marks
  // (first one found, if the data marks more than one), else the first
  // technology in the manifest.
  const rootId = nodes.find((n) => n.tier === 'primary')?.id ?? nodes[0]?.id;

  const edges: ConstellationEdge[] = [];
  if (rootId) {
    const nodesByCategory = new Map<string, ConstellationNode[]>();
    for (const node of nodes) {
      const list = nodesByCategory.get(node.categoryKey) ?? [];
      list.push(node);
      nodesByCategory.set(node.categoryKey, list);
    }

    for (const categoryNodes of nodesByCategory.values()) {
      const entry = categoryNodes.find((n) => n.tier !== 'supporting') ?? categoryNodes[0];
      if (entry.id !== rootId) {
        edges.push({ from: rootId, to: entry.id });
      }
      for (const node of categoryNodes) {
        if (node.id === entry.id) continue;
        edges.push({ from: entry.id, to: node.id });
      }
    }
  }

  return { project: model.project, description: model.description, nodes, edges, rootId, categories };
}
