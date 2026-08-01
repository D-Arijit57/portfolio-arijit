import type { Point } from '../../graph/layout/types';
import type { GraphVisualState } from '../../hooks/useGraphInteraction';
import { hashStringToIndex } from '../../manifest/colorHash';

/**
 * A single structural graph edge. Renders exactly what `PositionedGraph`
 * provides — no sibling helper lines, debug paths, or other diagnostic
 * overlays. `from`/`to` are only the ANCHOR points, used for a correct
 * first paint; every frame after that, `useGraphSimulation` writes fresh
 * `x1,y1,x2,y2` attributes directly onto this line's own DOM node (via
 * `edgeRef`) so it continuously tracks both endpoints' live simulated
 * positions — including ordinary ambient drift, not just an active drag —
 * without this component (or React) ever re-rendering for it.
 *
 * Two layers of CSS-only motion remain, matching the brief's "edge life"
 * (no particles, no flowing gradients):
 *
 * - An always-on, per-edge `opacity` keyframe (deterministic timing,
 *   hashed from the edge's own endpoints) — a barely-perceptible
 *   brightness breathing, skipped entirely under reduced motion.
 * - A `stroke-opacity` CSS transition driven by `visualState` (hover/
 *   selection highlight) — brightens when either endpoint is the active
 *   node, dims (not aggressively) otherwise.
 */

const EDGE_OPACITY: Record<GraphVisualState, number> = { default: 0.4, active: 0.75, connected: 0.55, dimmed: 0.18 };
const EDGE_WIDTH = 1;

const BREATHE_DURATION_MIN_S = 6;
const BREATHE_DURATION_MAX_S = 11;
const BREATHE_DELAY_WINDOW_S = 6;

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

export interface GraphEdgeLineProps {
  edgeKey: string;
  edgeRef: (el: SVGLineElement | null) => void;
  from: Point;
  to: Point;
  color: string;
  visualState: GraphVisualState;
  reduceMotion: boolean;
}

export function GraphEdgeLine({ edgeKey, edgeRef, from, to, color, visualState, reduceMotion }: GraphEdgeLineProps) {
  const durationS = BREATHE_DURATION_MIN_S + jitter(`edge-dur:${edgeKey}`, 4271) * (BREATHE_DURATION_MAX_S - BREATHE_DURATION_MIN_S);
  const delayS = jitter(`edge-delay:${edgeKey}`, 4283) * BREATHE_DELAY_WINDOW_S;

  return (
    <line
      ref={edgeRef}
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={color}
      shapeRendering="geometricPrecision"
      style={{
        strokeWidth: EDGE_WIDTH,
        strokeOpacity: EDGE_OPACITY[visualState],
        transition: 'stroke-opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        ...(reduceMotion
          ? undefined
          : { animation: `graph-edge-breathe ${durationS}s ease-in-out infinite`, animationDelay: `${delayS}s` }),
      }}
    />
  );
}
