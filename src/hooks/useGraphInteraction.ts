import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PositionedGraph } from '../graph/layout/types';
import {
  buildHighlightIndex,
  resolveAnchorId,
  resolveEdgeState,
  resolveNodeState,
  isPointerOnSelected as resolveIsPointerOnSelected,
} from '../graph/interaction/interactionResolver';
import type { EdgeVisualState, NodeCursor, NodeVisualState } from '../graph/interaction/types';

export type { EdgeVisualState, NodeCursor, NodeVisualState } from '../graph/interaction/types';

/**
 * The React glue around the Interaction Resolver (`graph/interaction/
 * interactionResolver.ts`) — this hook owns the discrete, low-frequency
 * state (hover/focus/selection) and hands every render's worth of
 * per-node/per-edge state resolution to that pure module. Deliberately
 * generic over any `PositionedGraph`, so it's reusable by any future
 * graph visualization, not just `skills.graph`.
 *
 * Performance, concretely (per Milestone 7's explicit requirement):
 * - `highlightIndex` is built ONCE per `positioned` (O(n)) via `useMemo`
 *   — hovering/focusing/selecting never re-walks the graph.
 * - `visualStateForNode`/`visualStateForEdge`/`cursorForNode` are
 *   `useCallback`'d against `[state, highlightIndex]` so their identity
 *   only changes when the resolved output actually could.
 * - Hover/focus handlers are cached per node id (`getHoverStartHandler`
 *   etc., a `Map` in a ref) rather than allocated fresh every render —
 *   the exact pattern `useGraphSimulation`'s own `registerNodeEl`/
 *   `registerEdgeEl` already established — so a parent passing these down
 *   to a `React.memo`'d `GraphNode` doesn't defeat that memoization with
 *   a new function identity on every unrelated re-render.
 */

export interface UseGraphInteractionResult {
  hoveredId: string | null;
  selectedId: string | null;
  focusedId: string | null;
  /** The node id currently governing the highlight partition — selection, else hover, else keyboard focus. Also what the renderer paints LAST (raises z-index) so the active node never reads as obscured by a neighbor. Null when nothing is active. */
  emphasizedNodeId: string | null;
  visualStateForNode: (nodeId: string) => NodeVisualState;
  visualStateForEdge: (fromId: string, toId: string) => EdgeVisualState;
  /** True only when hover/focus is landing on the currently-selected node itself — see `interactionResolver.ts`'s own doc comment for why this is a supplementary signal, not a 7th state. */
  isPointerOnSelected: (nodeId: string) => boolean;
  cursorForNode: (isDragging: boolean) => NodeCursor;
  getHoverStartHandler: (nodeId: string) => () => void;
  getHoverEndHandler: (nodeId: string) => () => void;
  /** Keyboard focus — "Hover and Focus should share the same resolver." Wired to `onFocus`/`onBlur` on each node's own interactive element. */
  getFocusHandler: (nodeId: string) => () => void;
  getBlurHandler: (nodeId: string) => () => void;
  handleNodeSelect: (nodeId: string) => void;
  clearSelection: () => void;
}

export function useGraphInteraction(positioned: PositionedGraph): UseGraphInteractionResult {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const highlightIndex = useMemo(() => buildHighlightIndex(positioned), [positioned]);
  const state = useMemo(() => ({ selectedId, hoveredId, focusedId }), [selectedId, hoveredId, focusedId]);

  const visualStateForNode = useCallback(
    (nodeId: string): NodeVisualState => resolveNodeState(nodeId, state, highlightIndex),
    [state, highlightIndex],
  );
  const visualStateForEdge = useCallback(
    (fromId: string, toId: string): EdgeVisualState => resolveEdgeState(fromId, toId, state, highlightIndex),
    [state, highlightIndex],
  );
  const isPointerOnSelected = useCallback((nodeId: string) => resolveIsPointerOnSelected(nodeId, state), [state]);
  // Milestone 8: "Cursor: default -> grab -> grabbing" — explicit, so
  // this supersedes Milestone 7's own flagged `pointer`-at-rest call.
  const cursorForNode = useCallback((isDragging: boolean): NodeCursor => (isDragging ? 'grabbing' : 'grab'), []);

  // Per-node-id cached handlers — same shape as useGraphSimulation's
  // registerNodeEl/registerEdgeEl. Reset (not preserved) when `positioned`
  // changes: a new graph has a new node-id space, and setHoveredId/
  // setFocusedId themselves are stable across renders regardless, so
  // there's nothing worth carrying over.
  const hoverStartHandlers = useRef(new Map<string, () => void>());
  const hoverEndHandlers = useRef(new Map<string, () => void>());
  const focusHandlers = useRef(new Map<string, () => void>());
  const blurHandlers = useRef(new Map<string, () => void>());
  useEffect(() => {
    hoverStartHandlers.current = new Map();
    hoverEndHandlers.current = new Map();
    focusHandlers.current = new Map();
    blurHandlers.current = new Map();
  }, [positioned]);

  const getHoverStartHandler = useCallback((nodeId: string) => {
    const cache = hoverStartHandlers.current;
    let fn = cache.get(nodeId);
    if (!fn) {
      fn = () => setHoveredId(nodeId);
      cache.set(nodeId, fn);
    }
    return fn;
  }, []);

  const getHoverEndHandler = useCallback((nodeId: string) => {
    const cache = hoverEndHandlers.current;
    let fn = cache.get(nodeId);
    if (!fn) {
      fn = () => setHoveredId((current) => (current === nodeId ? null : current));
      cache.set(nodeId, fn);
    }
    return fn;
  }, []);

  const getFocusHandler = useCallback((nodeId: string) => {
    const cache = focusHandlers.current;
    let fn = cache.get(nodeId);
    if (!fn) {
      fn = () => setFocusedId(nodeId);
      cache.set(nodeId, fn);
    }
    return fn;
  }, []);

  const getBlurHandler = useCallback((nodeId: string) => {
    const cache = blurHandlers.current;
    let fn = cache.get(nodeId);
    if (!fn) {
      fn = () => setFocusedId((current) => (current === nodeId ? null : current));
      cache.set(nodeId, fn);
    }
    return fn;
  }, []);

  // Click a selected node again to deselect — "single node selected at a
  // time," never a hard no-op click.
  const handleNodeSelect = useCallback((nodeId: string) => setSelectedId((current) => (current === nodeId ? null : nodeId)), []);
  const clearSelection = useCallback(() => setSelectedId(null), []);

  const emphasizedNodeId = resolveAnchorId(state);

  return {
    hoveredId,
    selectedId,
    focusedId,
    emphasizedNodeId,
    visualStateForNode,
    visualStateForEdge,
    isPointerOnSelected,
    cursorForNode,
    getHoverStartHandler,
    getHoverEndHandler,
    getFocusHandler,
    getBlurHandler,
    handleNodeSelect,
    clearSelection,
  };
}
