import { memo } from 'react';
import type { EdgeVisualState } from '../../graph/interaction/types';
import type { Point } from '../../graph/layout/types';
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
 * `visualState` is resolved entirely upstream by the Interaction Resolver
 * (`graph/interaction/interactionResolver.ts`) — this component never
 * decides for itself whether an endpoint is "active." Wrapped in
 * `React.memo` for the same reason `GraphNode` is: a hover/selection
 * change elsewhere only re-renders the edges whose own resolved state
 * actually changed.
 *
 * Two layers of CSS-only motion remain, matching the brief's "edge life"
 * (no particles, no flowing gradients, no pulsing):
 *
 * - An always-on, per-edge `opacity` keyframe (deterministic timing,
 *   hashed from the edge's own endpoints) — a barely-perceptible
 *   brightness breathing, skipped entirely under reduced motion.
 * - A `stroke-opacity` CSS transition driven by `visualState` — brighter
 *   when highlighted, dimmed (not aggressively) otherwise.
 */

const EDGE_OPACITY: Record<EdgeVisualState, number> = { default: 0.4, highlighted: 0.75, dimmed: 0.18 };
const EDGE_WIDTH = 1;

// Widened from 6-11s so no two edges land on comparable cycles — the old
// range was narrow enough that groups of edges visibly pulsed together,
// which is precisely the "looping animation" tell this pass removes.
const BREATHE_DURATION_MIN_S = 7;
const BREATHE_DURATION_MAX_S = 19;
const BREATHE_DELAY_WINDOW_S = 11;

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

export interface GraphEdgeLineProps {
  edgeKey: string;
  edgeRef: (el: SVGLineElement | null) => void;
  from: Point;
  to: Point;
  color: string;
  visualState: EdgeVisualState;
  reduceMotion: boolean;
  /**
   * Milliseconds into the construction animation at which this edge starts
   * drawing itself in, or `null` to skip the reveal (reduced motion). The
   * schedule guarantees this lands after BOTH endpoints have appeared —
   * see `revealSchedule.ts`.
   */
  revealDelayMs: number | null;
}

function GraphEdgeLineImpl({ edgeKey, edgeRef, from, to, color, visualState, reduceMotion, revealDelayMs }: GraphEdgeLineProps) {
  const durationS = BREATHE_DURATION_MIN_S + jitter(`edge-dur:${edgeKey}`, 4271) * (BREATHE_DURATION_MAX_S - BREATHE_DURATION_MIN_S);
  const delayS = jitter(`edge-delay:${edgeKey}`, 4283) * BREATHE_DELAY_WINDOW_S;

  // The draw-on runs on `stroke-dashoffset` against `pathLength="1"`, which
  // normalizes the dash pattern to the line's own length whatever that
  // length happens to be. That matters because the simulation rewrites
  // x1/y1/x2/y2 every frame the moment construction ends — a dash pattern
  // expressed in user units would visibly re-scale as the graph relaxes,
  // while a normalized one cannot. The pattern starts at (x1,y1), which is
  // the parent, so the line grows parent -> child as required.
  const reveal = revealDelayMs === null ? null : revealDelayMs;
  const animations: string[] = [];
  if (reveal !== null) animations.push(`graph-edge-reveal 380ms cubic-bezier(0.22, 1, 0.36, 1) ${reveal}ms both`);
  if (!reduceMotion) {
    // Held off until this edge's own draw-on has finished, so the ambient
    // opacity breathing never fights the reveal for the same property.
    const breatheDelayS = delayS + (reveal !== null ? (reveal + 380) / 1000 : 0);
    animations.push(`graph-edge-breathe ${durationS}s ease-in-out ${breatheDelayS}s infinite`);
  }

  return (
    <line
      ref={edgeRef}
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={color}
      shapeRendering="geometricPrecision"
      pathLength={reveal !== null ? 1 : undefined}
      style={{
        strokeWidth: EDGE_WIDTH,
        strokeOpacity: EDGE_OPACITY[visualState],
        transition: 'stroke-opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        ...(reveal !== null ? { strokeDasharray: 1 } : undefined),
        ...(animations.length > 0 ? { animation: animations.join(', ') } : undefined),
      }}
    />
  );
}

export const GraphEdgeLine = memo(GraphEdgeLineImpl);
