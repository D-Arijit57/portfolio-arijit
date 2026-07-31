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
 * The category color a node belongs to — generic and hash-derived
 * (`manifest/colorHash.ts`, the same stable palette categories/badges
 * already use elsewhere in this app), never a hardcoded per-category-name
 * palette. Root has no category of its own.
 */
export function categoryColorForNode(node: PositionedNode): string | undefined {
  if (node.kind === 'root') return undefined;
  const key = node.kind === 'category' ? node.key : node.categoryKey;
  return colorForString(key);
}
