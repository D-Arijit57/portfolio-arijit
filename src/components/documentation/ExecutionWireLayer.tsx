import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { useWireRegistry, type WireAnchorId, type WireEdgeId } from './CortexaWireContext';

const ACCENT = '#569cd6';

interface Point {
  x: number;
  y: number;
}

/** Where along a given anchor's own element to plant the wire's endpoint —
 * e.g. `problemOut` is the *right edge, vertical center* of whatever
 * element registered as `problemOut`. Purely geometric, independent of
 * which edge(s) the anchor participates in. */
const ANCHOR_POINTS: Record<WireAnchorId, (rect: DOMRect) => Point> = {
  problemOut: (r) => ({ x: r.right, y: r.top + r.height / 2 }),
  cortexaIn: (r) => ({ x: r.left, y: r.top + r.height / 2 }),
  cortexaOut: (r) => ({ x: r.left + r.width / 2, y: r.bottom }),
  featuresIn: (r) => ({ x: r.left + r.width / 2, y: r.top }),
  featuresOut: (r) => ({ x: r.left + r.width / 2, y: r.bottom }),
  exploreIn: (r) => ({ x: r.left + r.width / 2, y: r.top }),
};

const EDGES: { id: WireEdgeId; from: WireAnchorId; to: WireAnchorId }[] = [
  { id: 'problemToCortexa', from: 'problemOut', to: 'cortexaIn' },
  { id: 'cortexaToFeatures', from: 'cortexaOut', to: 'featuresIn' },
  { id: 'featuresToExplore', from: 'featuresOut', to: 'exploreIn' },
];

/** A smooth S-curve between two points — the same cubic-bezier-with-
 * horizontal-control-points formula node editors (React Flow's default
 * edge included) use for "smoothstep"-style routing. Degenerates to a
 * visually straight line when `from.x` and `to.x` are already equal (the
 * Core Features -> Continue Exploring case, both full-width blocks). */
function bezierPath(from: Point, to: Point): string {
  const midY = from.y + (to.y - from.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

/**
 * Cortexa Workspace Refinement §3–5 — the actual execution wires: a
 * permanent, always-visible base path per edge plus a traveling pulse while
 * that edge's source stage is running, and a brighter permanent glow once
 * it's connected. Purely a renderer over CortexaWireContext's registry —
 * every pixel of "when is this edge pulsing/connected" logic lives in
 * ProblemSolutionTerminals.tsx and ExecutionStage.tsx, not here.
 *
 * Rendered once by ProjectDocumentationViewer as DocumentationLayout's
 * `overlay`, inside the same `position: relative` wrapper that also
 * contains `intro` (where problem.sh/cortexa.sh actually live, several DOM
 * layers down inside a markdown-widget) and `main` (Core Features/Continue
 * Exploring). `position: absolute; inset: 0` on this component's own root
 * makes its own bounding rect exactly match that wrapper's content box, so
 * "this element's rect" doubles as "the wrapper's rect" for free — no
 * separate parent lookup needed.
 *
 * Re-measures via ResizeObserver on the wrapper *and* every registered
 * anchor node (so a terminal growing taller as it types re-routes the wire
 * live) plus a window resize listener as a catch-all. Deliberately no
 * scroll listener: both endpoints of every edge scroll together with the
 * page, so their on-screen difference — the only thing a relative path
 * needs — never changes on scroll, only on an actual size/layout change.
 */
export function ExecutionWireLayer() {
  const registry = useWireRegistry();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [paths, setPaths] = useState<Partial<Record<WireEdgeId, string>>>({});
  const reduceMotion = prefersReducedMotion();

  const anchors = registry?.anchors;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !anchors) return undefined;

    const recompute = () => {
      const wrapperRect = wrapper.getBoundingClientRect();
      const points: Partial<Record<WireAnchorId, Point>> = {};
      (Object.keys(ANCHOR_POINTS) as WireAnchorId[]).forEach((id) => {
        const node = anchors[id];
        if (!node) return;
        const raw = ANCHOR_POINTS[id](node.getBoundingClientRect());
        points[id] = { x: raw.x - wrapperRect.left, y: raw.y - wrapperRect.top };
      });

      const nextPaths: Partial<Record<WireEdgeId, string>> = {};
      for (const edge of EDGES) {
        const from = points[edge.from];
        const to = points[edge.to];
        if (from && to) nextPaths[edge.id] = bezierPath(from, to);
      }
      setPaths(nextPaths);
    };

    recompute();

    const observer = new ResizeObserver(recompute);
    observer.observe(wrapper);
    Object.values(anchors).forEach((node) => node && observer.observe(node));
    window.addEventListener('resize', recompute);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [anchors]);

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg className="h-full w-full overflow-visible">
        {EDGES.map((edge) => {
          const d = paths[edge.id];
          if (!d) return null;
          const status = registry?.edgeStatus[edge.id];
          const connected = status?.connected ?? false;
          const pulsing = !reduceMotion && (status?.pulsing ?? false);

          return (
            <g key={edge.id}>
              <path
                d={d}
                fill="none"
                stroke={ACCENT}
                strokeWidth={1.5}
                strokeOpacity={connected ? 0.75 : 0.28}
                style={{
                  filter: connected ? 'drop-shadow(0 0 4px rgba(86,156,214,0.6))' : undefined,
                  transition: 'stroke-opacity 0.6s ease-out, filter 0.6s ease-out',
                }}
              />
              {pulsing && (
                <path
                  d={d}
                  pathLength={100}
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray="6 94"
                  className="execution-wire-pulse"
                  style={{ filter: 'drop-shadow(0 0 5px rgba(86,156,214,0.9))' }}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
