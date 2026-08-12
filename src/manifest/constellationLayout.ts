import type { ConstellationGraph, ConstellationTier } from './constellationGraph';
import { hashStringToIndex } from './colorHash';

/**
 * Layout resolver for the Tech Stack Constellation — deliberately NOT a
 * force-directed or radial/angular generator. "Data-driven" here means
 * hand-authored: each technology may carry an explicit `position` (see
 * ManifestPosition in types.ts) as normalized [0, 1] coordinates, and this
 * module's only job is to scale those authored anchors into a fixed
 * world-space (never regenerated per render, independent of the current
 * viewport size), fall back to a plain deterministic default for anything
 * unpositioned, then compute the bounding box that *actually gets used*
 * (authored positions don't need to span the full 0-1 square) so the
 * renderer's own viewport-fit step (useConstellationViewport) can center
 * and scale that box into whatever screen it's shown on — the same
 * relative composition reproduces on any viewport size because only the
 * fit transform changes, never the underlying world-space positions
 * (which is also what keeps interactive pan/zoom cheap: it's just a
 * transform on top of a stable layout, not a layout recompute).
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

/**
 * Node ring radius. Uniform across tiers — every node is the same size.
 *
 * These were 46 / 30 / 21, encoding tier as scale. That read as three unrelated
 * node designs sharing a canvas rather than one system, and it fought the
 * reference anatomy, whose size guide describes a single ring with the icon
 * sized against it.
 *
 * This is a *world-space* radius, not a pixel size: `useConstellationViewport`
 * fits the whole composition to ~74% of the usable canvas, so what reaches the
 * screen is this value times the fit scale (currently ≈0.44 — a 42 here renders
 * as a ~37px ring). Raising it enlarges the nodes relative to the composition
 * without changing the framing, because the bounding box it feeds grows by only
 * 2×Δr against a spread of ~1500 units. That is the lever for "bigger nodes";
 * the fit padding is the lever for "bigger composition", and they are separate
 * on purpose.
 *
 * Hierarchy is still expressed, just not by size: the root sits at the centre of
 * the composition, carries a heavier ring stroke and its own sparkle accents,
 * and every node's category reads from its ring colour.
 *
 * Kept as a per-tier record rather than a single constant so the layout's bounds
 * math and the star renderer keep their existing shape, and so a future design
 * can re-differentiate by tier without threading a new type through both.
 */
const NODE_RADIUS = 42;

export const TIER_RADIUS: Record<ConstellationTier, number> = {
  primary: NODE_RADIUS,
  secondary: NODE_RADIUS,
  supporting: NODE_RADIUS,
};

// Normalized [0,1] authored coordinates are scaled into this fixed
// world-space before anything else (radii, margins, fallback spacing
// below) is applied — an arbitrary but stable reference size, not a pixel
// dimension of any real viewport.
const NORMALIZED_SCALE = 1000;

const LAYOUT_MARGIN = 60;
// Every node renders a title + subtitle beneath it (ManifestConstellation.tsx:
// y = radius+17 and radius+31, plus the subtitle's own line height) that the
// node's own TIER_RADIUS doesn't account for — without this, a composition
// that fills most of the canvas clips that label text against whatever sits
// below the canvas (the terminal panel).
const LABEL_HEIGHT = 46;
// Fallback spacing (world-space units) for a manifest that authored no
// positions at all.
const FALLBACK_STEP_X = 170;
const FALLBACK_BASE_Y = 300;
const FALLBACK_Y_JITTER = 110;

export function resolveConstellationLayout(graph: ConstellationGraph): ConstellationLayoutResult {
  const positions = new Map<string, ConstellationPosition>();
  if (graph.nodes.length === 0) {
    return { positions, width: 0, height: 0 };
  }

  graph.nodes.forEach((node, index) => {
    if (node.position) {
      positions.set(node.id, { x: node.position.x * NORMALIZED_SCALE, y: node.position.y * NORMALIZED_SCALE });
      return;
    }
    // Deterministic (hashed from the node's own id, never Math.random())
    // horizontal-flow default for a technology with no authored anchor.
    const jitter = (hashStringToIndex(`${node.id}:y`, 1000) / 1000 - 0.5) * 2 * FALLBACK_Y_JITTER;
    positions.set(node.id, { x: LAYOUT_MARGIN + index * FALLBACK_STEP_X, y: FALLBACK_BASE_Y + jitter });
  });

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
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
    maxY = Math.max(maxY, pos.y + radius + LABEL_HEIGHT);
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
