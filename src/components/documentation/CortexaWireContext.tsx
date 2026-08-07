import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Cortexa Workspace Refinement §3–5 — the anchor/status registry behind
 * ExecutionWireLayer's execution wires. Exists because the two ends of a
 * wire live in genuinely separate component subtrees that can't reach each
 * other through props: `problem.sh`/`cortexa.sh` are a markdown-fence
 * widget instantiated by react-markdown deep inside `intro` (see
 * documentationWidgets.tsx), while Core Features/Continue Exploring are
 * plain React children rendered in `main`. Context is the one mechanism
 * that skips that unrelated markdown-rendering layer without threading refs
 * through it.
 *
 * Two independent registries:
 * - Anchors: a DOM node per named point a wire needs to touch (e.g. the
 *   right edge of problem.sh). Registered via a ref callback so a
 *   component just does `<div ref={useWireAnchorRef('problemOut')}>`.
 * - Edge status: `{ pulsing, connected }` per edge, reported by whichever
 *   component owns that edge's source-side execution state (see
 *   ExecutionStage.tsx and ProblemSolutionTerminals.tsx). The wire's own
 *   *path* is derived purely from anchor geometry; status only ever
 *   changes how it's drawn (dim/pulsing/glowing), never where.
 *
 * Both are plain useState, not refs-only bookkeeping — ExecutionWireLayer
 * needs to re-render when an anchor node first mounts or a status flips.
 */

export type WireAnchorId = 'problemOut' | 'cortexaIn' | 'cortexaOut' | 'featuresIn' | 'featuresOut' | 'exploreIn';
export type WireEdgeId = 'problemToCortexa' | 'cortexaToFeatures' | 'featuresToExplore';

export interface WireEdgeStatus {
  pulsing: boolean;
  connected: boolean;
}

const IDLE_STATUS: WireEdgeStatus = { pulsing: false, connected: false };

interface WireRegistry {
  anchors: Partial<Record<WireAnchorId, HTMLElement>>;
  edgeStatus: Record<WireEdgeId, WireEdgeStatus>;
  setAnchor: (id: WireAnchorId, node: HTMLElement | null) => void;
  setEdgeStatus: (id: WireEdgeId, status: WireEdgeStatus) => void;
}

const WireContext = createContext<WireRegistry | null>(null);

export function CortexaWireProvider({ children }: { children: React.ReactNode }) {
  const [anchors, setAnchors] = useState<Partial<Record<WireAnchorId, HTMLElement>>>({});
  const [edgeStatus, setEdgeStatusState] = useState<Record<WireEdgeId, WireEdgeStatus>>({
    problemToCortexa: IDLE_STATUS,
    cortexaToFeatures: IDLE_STATUS,
    featuresToExplore: IDLE_STATUS,
  });

  const setAnchor = useCallback((id: WireAnchorId, node: HTMLElement | null) => {
    setAnchors((prev) => {
      if (node == null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      if (prev[id] === node) return prev;
      return { ...prev, [id]: node };
    });
  }, []);

  const setEdgeStatus = useCallback((id: WireEdgeId, status: WireEdgeStatus) => {
    setEdgeStatusState((prev) => {
      const current = prev[id];
      if (current.pulsing === status.pulsing && current.connected === status.connected) return prev;
      return { ...prev, [id]: status };
    });
  }, []);

  const value = useMemo<WireRegistry>(
    () => ({ anchors, edgeStatus, setAnchor, setEdgeStatus }),
    [anchors, edgeStatus, setAnchor, setEdgeStatus],
  );

  return <WireContext.Provider value={value}>{children}</WireContext.Provider>;
}

/** `<div ref={useWireAnchorRef('cortexaOut')}>` — registers/unregisters this
 * element as the named anchor point on mount/unmount. Stable across
 * re-renders (memoized on `setAnchor` — a `useCallback([])` in the
 * provider, so referentially constant — and `id`, never on the *whole*
 * context object). That distinction matters: `anchors`/`edgeStatus` state
 * changes give the context value itself a new identity on every
 * registration, so depending on the object as a whole would make this
 * callback's own identity change every time too — which React reads as
 * "the ref changed," detaching and reattaching it (calling it with `null`
 * then the node again), which calls `setAnchor` again, which changes the
 * context value again, forever. Depending on the one stable function
 * inside it sidesteps that entirely. */
export function useWireAnchorRef(id: WireAnchorId): (node: HTMLElement | null) => void {
  const ctx = useContext(WireContext);
  const setAnchor = ctx?.setAnchor;
  return useCallback((node: HTMLElement | null) => setAnchor?.(id, node), [setAnchor, id]);
}

/** Reports this edge's current `{ pulsing, connected }` state. Cheap to call
 * on every render — the provider no-ops (skips the state update) when the
 * values haven't actually changed. Same "depend on the one stable function,
 * not the whole context object" reasoning as useWireAnchorRef above —
 * harmless here either way since nothing passes this directly as a `ref`,
 * but keeping both hooks built the same way is one less thing to reason
 * about differently later. */
export function useWireEdgeStatusSetter(id: WireEdgeId): (status: WireEdgeStatus) => void {
  const ctx = useContext(WireContext);
  const setEdgeStatus = ctx?.setEdgeStatus;
  return useCallback((status: WireEdgeStatus) => setEdgeStatus?.(id, status), [setEdgeStatus, id]);
}

/** ExecutionWireLayer-only: the full current registry to draw from. */
export function useWireRegistry(): WireRegistry | null {
  return useContext(WireContext);
}
