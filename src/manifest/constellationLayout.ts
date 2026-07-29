import type { ConstellationGraph, ConstellationNode, ConstellationTier } from './constellationGraph';
import { hashStringToIndex } from './colorHash';

/**
 * Curated layout engine for the Tech Stack Constellation. Not force-
 * directed, not randomly placed — a real algorithm (angular arcs sized by
 * category, so nodes never overlap) that respects each technology's
 * optional `layoutHint` (angle/orbit) when the manifest provides one, and
 * otherwise generates an intelligent, category-clustered default. Every
 * remaining degree of freedom (small position jitter) is deterministic,
 * hashed from the node's own id — never Math.random() — so the same
 * project always renders the same constellation.
 *
 * Two levels only, mirroring buildConstellationGraph()'s star-with-local-
 * branches topology: root-level nodes sit on one main ring around the
 * center; a node whose parent is itself a ring node (not the center) sits
 * a short branch further out, continuing in roughly the same outward
 * direction — the only source of "depth" here, and it falls out of
 * category structure, never hardcoded per project.
 */

export interface ConstellationPosition {
  x: number;
  y: number;
}

export interface ConstellationLayoutResult {
  positions: Map<string, ConstellationPosition>;
  width: number;
  height: number;
}

export const TIER_RADIUS: Record<ConstellationTier, number> = {
  primary: 46,
  secondary: 30,
  supporting: 21,
};

const MAIN_RING_RADIUS = 195;
const LOCAL_BRANCH_LENGTH = 92;
const RADIUS_JITTER = 0.16; // +/- fraction
const ANGLE_JITTER_FRACTION = 0.3; // fraction of a node's own slice
const BRANCH_LOCAL_SPREAD = (60 * Math.PI) / 180;
const LAYOUT_MARGIN = 80;

function jitterUnit(seed: string): number {
  return hashStringToIndex(seed, 10007) / 10007;
}

function radiusJitter(seed: string, base: number): number {
  const multiplier = 1 + (jitterUnit(`${seed}:len`) - 0.5) * 2 * RADIUS_JITTER;
  return base * multiplier;
}

export function layoutConstellation(graph: ConstellationGraph): ConstellationLayoutResult {
  const positions = new Map<string, ConstellationPosition>();
  if (!graph.rootId) {
    return { positions, width: 0, height: 0 };
  }

  positions.set(graph.rootId, { x: 0, y: 0 });

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const rootEdges = graph.edges.filter((e) => e.from === graph.rootId);
  const branchEdges = graph.edges.filter((e) => e.from !== graph.rootId);

  // Root-level nodes cluster by category into contiguous arcs (sized by
  // how many root-level nodes that category contributes), so same-category
  // technologies land near each other — a believable star-map cluster
  // rather than an interleaved ring.
  const rootLevelNodes = rootEdges.map((e) => nodeById.get(e.to)).filter((n): n is ConstellationNode => Boolean(n));
  const byCategory = new Map<number, ConstellationNode[]>();
  for (const node of rootLevelNodes) {
    const list = byCategory.get(node.categoryIndex) ?? [];
    list.push(node);
    byCategory.set(node.categoryIndex, list);
  }
  const categoryOrder = [...byCategory.keys()].sort((a, b) => a - b);
  const totalRootLevel = rootLevelNodes.length || 1;

  const rootOffset = (hashStringToIndex(graph.project, 360) * Math.PI) / 180;
  let cursor = rootOffset;

  for (const categoryIndex of categoryOrder) {
    const group = byCategory.get(categoryIndex) ?? [];
    const arcSpan = (group.length / totalRootLevel) * 2 * Math.PI;
    const arcStart = cursor;
    cursor += arcSpan;

    group.forEach((node, indexInGroup) => {
      const explicitAngle = node.layoutHint?.angle;
      const orbitMultiplier = node.layoutHint?.orbit ? Math.max(0.4, node.layoutHint.orbit) : 1;

      let angle: number;
      if (explicitAngle !== undefined) {
        angle = (explicitAngle * Math.PI) / 180;
      } else {
        const slice = arcSpan / group.length;
        const within = arcStart + (indexInGroup + 0.5) * slice;
        angle = within + (jitterUnit(`${node.id}:angle`) - 0.5) * slice * ANGLE_JITTER_FRACTION;
      }

      const radius = radiusJitter(node.id, MAIN_RING_RADIUS) * orbitMultiplier;
      positions.set(node.id, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    });
  }

  // Branch (second-level) nodes — a category with more than one
  // technology beyond its own entry — sit a short reach further out from
  // their already-placed parent, continuing outward from the center
  // rather than doubling back toward it.
  const branchByParent = new Map<string, string[]>();
  for (const edge of branchEdges) {
    const list = branchByParent.get(edge.from) ?? [];
    list.push(edge.to);
    branchByParent.set(edge.from, list);
  }

  for (const [parentId, childIds] of branchByParent) {
    const parentPos = positions.get(parentId);
    if (!parentPos) continue;
    const parentAngle = Math.atan2(parentPos.y, parentPos.x);

    childIds.forEach((childId, index) => {
      const node = nodeById.get(childId);
      if (!node) return;
      const explicitAngle = node.layoutHint?.angle;
      const orbitMultiplier = node.layoutHint?.orbit ? Math.max(0.4, node.layoutHint.orbit) : 1;

      let angle: number;
      if (explicitAngle !== undefined) {
        angle = (explicitAngle * Math.PI) / 180;
      } else {
        const within =
          childIds.length === 1
            ? parentAngle
            : parentAngle - BRANCH_LOCAL_SPREAD / 2 + (index / (childIds.length - 1)) * BRANCH_LOCAL_SPREAD;
        angle = within + (jitterUnit(`${node.id}:angle`) - 0.5) * 0.25;
      }

      const branchLength = radiusJitter(node.id, LOCAL_BRANCH_LENGTH) * orbitMultiplier;
      positions.set(node.id, {
        x: parentPos.x + branchLength * Math.cos(angle),
        y: parentPos.y + branchLength * Math.sin(angle),
      });
    });
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [id, pos] of positions) {
    const node = nodeById.get(id);
    const radius = node ? TIER_RADIUS[node.tier] : TIER_RADIUS.primary;
    minX = Math.min(minX, pos.x - radius);
    minY = Math.min(minY, pos.y - radius);
    maxX = Math.max(maxX, pos.x + radius);
    maxY = Math.max(maxY, pos.y + radius);
  }

  const width = maxX - minX + LAYOUT_MARGIN * 2;
  const height = maxY - minY + LAYOUT_MARGIN * 2;
  const shiftX = LAYOUT_MARGIN - minX;
  const shiftY = LAYOUT_MARGIN - minY;

  for (const [id, pos] of positions) {
    positions.set(id, { x: pos.x + shiftX, y: pos.y + shiftY });
  }

  return { positions, width, height };
}
