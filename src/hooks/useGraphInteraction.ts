import { useCallback, useMemo, useRef, useState } from 'react';
import type { Point, PositionedGraph } from '../graph/layout/types';

/**
 * Hover/selection/drag state for the Knowledge Graph — the Milestone 5
 * Interaction Layer. Deliberately generic over any `PositionedGraph`
 * (built purely from its own `edges`, never from a specific layout's
 * internals), so it's reusable by any future graph visualization, not
 * just `skills.graph`.
 *
 * This hook only ever produces STATE and pure derivations from it. It
 * never touches a node's `x`/`y` in `PositionedGraph` — a drag's live
 * `offset` is presentation-only, applied by the renderer on top of the
 * frozen layout position, and reset to `{0, 0}` on release rather than
 * committed anywhere. The pipeline's contract ("Layout Engine positions,
 * Renderer draws, Interaction Layer animates rendered positions") holds
 * throughout.
 */

export type GraphVisualState = 'default' | 'active' | 'connected' | 'dimmed';

export interface GraphDragState {
  nodeId: string;
  /** World-space offset from the node's real (frozen) layout position — never fed back into `PositionedGraph`. */
  offset: Point;
  /** True only while the pointer is actually down; false during the release spring-back, so the renderer knows whether to track 1:1 or ease. */
  isDragging: boolean;
}

export interface UseGraphInteractionResult {
  hoveredId: string | null;
  selectedId: string | null;
  /** `hoveredId ?? selectedId` — the single id driving highlight, same precedence Constellation's own hover/select system already uses. */
  activeId: string | null;
  dragState: GraphDragState | null;
  visualStateForNode: (nodeId: string) => GraphVisualState;
  visualStateForEdge: (fromId: string, toId: string) => GraphVisualState;
  handleNodeHoverStart: (nodeId: string) => void;
  handleNodeHoverEnd: (nodeId: string) => void;
  handleNodeSelect: (nodeId: string) => void;
  clearSelection: () => void;
  startDrag: (nodeId: string, clientPoint: Point) => void;
  updateDrag: (clientPoint: Point) => void;
  endDrag: () => void;
}

export function useGraphInteraction(positioned: PositionedGraph, viewportScale: number): UseGraphInteractionResult {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<GraphDragState | null>(null);
  const dragOriginRef = useRef<Point | null>(null);

  // Direct graph neighbors only (structural edges) — "directly connected"
  // per the brief, not the full ancestor/descendant chain Constellation's
  // own dependency-highlight uses.
  const neighborsById = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of positioned.edges) {
      if (!map.has(edge.from)) map.set(edge.from, new Set());
      if (!map.has(edge.to)) map.set(edge.to, new Set());
      map.get(edge.from)!.add(edge.to);
      map.get(edge.to)!.add(edge.from);
    }
    return map;
  }, [positioned]);

  const activeId = hoveredId ?? selectedId;

  const visualStateForNode = useCallback(
    (nodeId: string): GraphVisualState => {
      if (!activeId) return 'default';
      if (nodeId === activeId) return 'active';
      return neighborsById.get(activeId)?.has(nodeId) ? 'connected' : 'dimmed';
    },
    [activeId, neighborsById],
  );

  const visualStateForEdge = useCallback(
    (fromId: string, toId: string): GraphVisualState => {
      if (!activeId) return 'default';
      return fromId === activeId || toId === activeId ? 'active' : 'dimmed';
    },
    [activeId],
  );

  const handleNodeHoverStart = useCallback((nodeId: string) => setHoveredId(nodeId), []);
  const handleNodeHoverEnd = useCallback(
    (nodeId: string) => setHoveredId((current) => (current === nodeId ? null : current)),
    [],
  );
  // Click a selected node again to deselect — "single node selected at a
  // time," never a hard no-op click.
  const handleNodeSelect = useCallback((nodeId: string) => setSelectedId((current) => (current === nodeId ? null : nodeId)), []);
  const clearSelection = useCallback(() => setSelectedId(null), []);

  const startDrag = useCallback((nodeId: string, clientPoint: Point) => {
    dragOriginRef.current = clientPoint;
    setDragState({ nodeId, offset: { x: 0, y: 0 }, isDragging: true });
  }, []);

  const updateDrag = useCallback(
    (clientPoint: Point) => {
      setDragState((current) => {
        if (!current || !dragOriginRef.current) return current;
        // Screen-space pointer delta divided by the current viewport scale
        // — so a drag feels 1:1 with the cursor regardless of zoom level.
        const dx = (clientPoint.x - dragOriginRef.current.x) / viewportScale;
        const dy = (clientPoint.y - dragOriginRef.current.y) / viewportScale;
        return { ...current, offset: { x: dx, y: dy } };
      });
    },
    [viewportScale],
  );

  // Ends the gesture and lets Motion spring the visual offset back to
  // {0,0} — the layout position itself was never touched. Deliberately
  // does NOT decide selection here: whether this release also selects
  // the node (and moves the camera) is the caller's call, since that
  // couples two different concerns (raw drag state vs. viewport focus)
  // this hook has no business knowing about.
  const endDrag = useCallback(() => {
    dragOriginRef.current = null;
    setDragState((current) => (current ? { ...current, offset: { x: 0, y: 0 }, isDragging: false } : current));
  }, []);

  return {
    hoveredId,
    selectedId,
    activeId,
    dragState,
    visualStateForNode,
    visualStateForEdge,
    handleNodeHoverStart,
    handleNodeHoverEnd,
    handleNodeSelect,
    clearSelection,
    startDrag,
    updateDrag,
    endDrag,
  };
}
