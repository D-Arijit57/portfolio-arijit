import type { PositionedGraph } from '../layout/types';
import type { EdgeVisualState, NodeVisualState } from './types';

/**
 * The Interaction Resolver — Milestone 7's single source of truth for
 * "what visual state should this node/edge currently be in." Pure
 * functions only (no React, no DOM), matching this codebase's established
 * `graph/*` convention (loader/builder/layout are all pure-data-in,
 * pure-data-out) — fully unit-testable in isolation, and reusable by any
 * future graph visualization since nothing here references "skills" or
 * any specific domain.
 *
 * `useGraphInteraction` (the React glue) is the ONLY caller; GraphNode,
 * GraphEdgeLine, InspectorPanel, and any future Search/Filter panel never
 * import from here directly — they only ever ask the hook "what state is
 * node X in," never "is search active" or "is hover active." That
 * indirection is the whole point: a future Search/Filter milestone adds
 * its own input to `InteractionState` and its own contribution inside
 * `resolveNodeState`/`resolveEdgeState` — the renderer components need
 * zero changes.
 */

export interface HighlightIndex {
  /**
   * Every node id's own precomputed "highlight set" — the full set of
   * node ids that should read as `related` (plus the anchor id itself)
   * when THIS node is the thing driving emphasis (hovered, focused, or
   * selected). Built once per `PositionedGraph`, O(n) total — hovering/
   * selecting never re-walks the graph, it's a single `Map.get` + `Set.has`.
   *
   * The hierarchy rule (root -> everything; category -> root + itself +
   * its own leaves; leaf -> itself + its own category + root) is baked in
   * here, not scattered across the renderer or the hook.
   */
  highlightSetById: Map<string, Set<string>>;
}

export function buildHighlightIndex(positioned: PositionedGraph): HighlightIndex {
  const parentById = new Map<string, string>();
  const childrenById = new Map<string, string[]>();
  for (const edge of positioned.edges) {
    parentById.set(edge.to, edge.from);
    if (!childrenById.has(edge.from)) childrenById.set(edge.from, []);
    childrenById.get(edge.from)!.push(edge.to);
  }

  const allIds = positioned.nodes.map((node) => node.id);
  const rootId = positioned.nodes.find((node) => node.kind === 'root')?.id;

  const highlightSetById = new Map<string, Set<string>>();
  for (const node of positioned.nodes) {
    if (node.kind === 'root') {
      // Hovering/selecting the hub highlights the entire graph.
      highlightSetById.set(node.id, new Set(allIds));
    } else if (node.kind === 'category') {
      const children = childrenById.get(node.id) ?? [];
      const ids = [rootId, node.id, ...children].filter((id): id is string => !!id);
      highlightSetById.set(node.id, new Set(ids));
    } else {
      const parent = parentById.get(node.id);
      const ids = [node.id, parent, rootId].filter((id): id is string => !!id);
      highlightSetById.set(node.id, new Set(ids));
    }
  }

  return { highlightSetById };
}

export interface InteractionState {
  selectedId: string | null;
  hoveredId: string | null;
  focusedId: string | null;
}

/**
 * The single id currently driving hover/focus-style emphasis — mouse
 * hover wins if somehow both are set (practically mutually exclusive: a
 * mouse hover and a keyboard focus rarely land on different nodes at the
 * same instant, but if they did, the pointer is the more immediate signal).
 * "Hover and Focus share the same resolver" per the brief — this is the
 * one place that unifies them into a single input.
 */
function emphasizedId(state: InteractionState): string | null {
  return state.hoveredId ?? state.focusedId;
}

/**
 * The node id whose highlight set currently governs the whole graph's
 * emphasis partition. Selection always wins: once something is selected,
 * hovering/focusing a DIFFERENT node never changes which nodes read as
 * related/dimmed — that would mean the emphasis pattern silently
 * reshuffling under the user's cursor while something stays selected,
 * which is exactly the flicker the brief calls out. Hover/focus only
 * takes over the partition when nothing is selected at all.
 */
export function resolveAnchorId(state: InteractionState): string | null {
  return state.selectedId ?? emphasizedId(state);
}

export function resolveNodeState(nodeId: string, state: InteractionState, index: HighlightIndex): NodeVisualState {
  const anchorId = resolveAnchorId(state);
  if (!anchorId) return 'default';

  if (nodeId === state.selectedId) return 'selected';
  // Only reachable when nothing is selected (selection already claimed
  // the branch above) — this is "hover/focus with nothing selected."
  if (nodeId === anchorId) return 'hovered';

  const highlightSet = index.highlightSetById.get(anchorId);
  return highlightSet?.has(nodeId) ? 'related' : 'dimmed';
}

export function resolveEdgeState(fromId: string, toId: string, state: InteractionState, index: HighlightIndex): EdgeVisualState {
  const anchorId = resolveAnchorId(state);
  if (!anchorId) return 'default';

  const highlightSet = index.highlightSetById.get(anchorId);
  return highlightSet?.has(fromId) && highlightSet?.has(toId) ? 'highlighted' : 'dimmed';
}

/**
 * True exactly when hover/focus is landing on the SELECTED node itself —
 * "if a selected node is hovered, selection styling remains dominant;
 * hover only contributes cursor + a tiny scale adjustment." This is
 * deliberately NOT folded into `NodeVisualState` as a 7th state (the
 * brief names exactly six) — it's a small supplementary signal the
 * renderer uses to nudge scale slightly on top of the `selected` state's
 * own baseline, never a competing animation target.
 */
export function isPointerOnSelected(nodeId: string, state: InteractionState): boolean {
  return nodeId === state.selectedId && emphasizedId(state) === nodeId;
}
