import { useCallback, useMemo, useState } from 'react';
import type { PositionedGraph } from '../graph/layout/types';

/**
 * Hover/selection state for the Knowledge Graph. Deliberately generic
 * over any `PositionedGraph` (built purely from its own `edges`, never
 * from a specific layout's internals), so it's reusable by any future
 * graph visualization, not just `skills.graph`.
 *
 * Drag mechanics live in `useGraphSimulation` instead (a continuous
 * physics simulation, not discrete state this hook could represent) —
 * this hook only ever produces hover/selection STATE and pure
 * derivations from it.
 */

export type GraphVisualState = 'default' | 'active' | 'connected' | 'dimmed';

export interface UseGraphInteractionResult {
  hoveredId: string | null;
  selectedId: string | null;
  /** `hoveredId ?? selectedId` — the single id driving highlight, same precedence Constellation's own hover/select system already uses. */
  activeId: string | null;
  visualStateForNode: (nodeId: string) => GraphVisualState;
  visualStateForEdge: (fromId: string, toId: string) => GraphVisualState;
  handleNodeHoverStart: (nodeId: string) => void;
  handleNodeHoverEnd: (nodeId: string) => void;
  handleNodeSelect: (nodeId: string) => void;
  clearSelection: () => void;
}

export function useGraphInteraction(positioned: PositionedGraph): UseGraphInteractionResult {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  return {
    hoveredId,
    selectedId,
    activeId,
    visualStateForNode,
    visualStateForEdge,
    handleNodeHoverStart,
    handleNodeHoverEnd,
    handleNodeSelect,
    clearSelection,
  };
}
