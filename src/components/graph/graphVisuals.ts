import { colorForString } from '../../manifest/colorHash';
import type { PositionedNode } from '../../graph/layout/types';

/**
 * Shared visual constants for the Knowledge Graph renderer — deliberately
 * separate from the Layout Engine's own `NODE_FOOTPRINT` (spacing math
 * only, not a rendering directive, per `radialLayout.ts`'s own comment).
 * The renderer picks its own visual sizes independently; it never imports
 * anything from `src/graph/layout` beyond the public `PositionedGraph`
 * shape.
 */
export const NODE_RADIUS: Record<PositionedNode['kind'], number> = {
  root: 30,
  category: 20,
  leaf: 12,
};

/**
 * Curated colors for `skills.graph`'s own category keys — pixel-sampled
 * directly from the approved reference's own color legend (flatter, lower
 * saturation, matte — deliberately NOT the earlier neon/Tailwind-500
 * palette a first pass used). This is a deliberate, narrow exception to
 * the "never a hardcoded per-category-name palette" rule Milestone 4 set
 * — the approved reference names these exact category/color pairings as
 * the visual source of truth, which a hash can't guarantee. Any category
 * key NOT in this table (a future graph file with its own categories)
 * still falls through to the generic hash-derived palette below, so the
 * renderer stays domain-agnostic for everything except this one graph's
 * already-approved palette.
 */
const CURATED_CATEGORY_COLORS: Record<string, string> = {
  languages: '#3380f1', // Programming Languages -> blue
  frontend: '#df6e56', // Frontend -> muted coral-orange
  backend: '#39a195', // Backend -> muted teal-green
  ai: '#ee7a49', // Artificial Intelligence -> muted amber-orange
  cloud: '#d15c7e', // Cloud -> muted rose-pink
  devtools: '#27a63e', // Developer Tools -> muted green
};

/** Root's own neutral fill — deliberately colorless (it belongs to no category), a light gray rather than pure white per the approved reference's own "Center (Skills)" legend swatch. */
export const ROOT_FILL = '#c9c9cb';

/** Root -> category edges and any node's subtle outline ring both read as neutral chrome, never tinted — only category -> leaf edges (and node fills) carry a category's color, per the approved reference. */
export const NEUTRAL_EDGE_COLOR = '#6b7280';

/**
 * The category color a node belongs to — curated first (see
 * `CURATED_CATEGORY_COLORS`), falling back to the generic hash-derived
 * palette (`manifest/colorHash.ts`, the same stable palette categories/
 * badges already use elsewhere in this app) for any category this graph
 * didn't curate a color for. Root has no category of its own.
 */
export function categoryColorForNode(node: PositionedNode): string | undefined {
  if (node.kind === 'root') return undefined;
  const key = node.kind === 'category' ? node.key : node.categoryKey;
  return CURATED_CATEGORY_COLORS[key] ?? colorForString(key);
}
