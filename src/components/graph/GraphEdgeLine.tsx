import { motion } from 'motion/react';
import type { Point } from '../../graph/layout/types';
import type { GraphVisualState } from '../../hooks/useGraphInteraction';
import { hashStringToIndex } from '../../manifest/colorHash';

/**
 * A single structural graph edge. Renders exactly what `PositionedGraph`
 * provides — no sibling helper lines, debug paths, or other diagnostic
 * overlays. Two layers of motion, matching the brief's "edge life" (no
 * particles, no flowing gradients):
 *
 * - An always-on, per-edge CSS `opacity` keyframe (deterministic timing,
 *   hashed from the edge's own endpoints) — a barely-perceptible
 *   brightness breathing, skipped entirely under reduced motion.
 * - A `stroke-opacity` CSS transition driven by `visualState` (hover/
 *   selection highlight) — brightens when either endpoint is the active
 *   node, dims (not aggressively) otherwise.
 *
 * `dragEndpoint` is the one case genuinely driven by Motion rather than
 * plain CSS: while a node is being dragged (or springing back after
 * release), the edge's matching endpoint needs the exact same spring
 * physics as the node itself so it stays visually attached throughout —
 * plain CSS transitions can't do spring easing, Motion's `type: 'spring'`
 * can. Every other edge never touches Motion's `animate` target at all.
 */

const EDGE_OPACITY: Record<GraphVisualState, number> = { default: 0.4, active: 0.75, connected: 0.55, dimmed: 0.18 };
const EDGE_WIDTH = 1;

const BREATHE_DURATION_MIN_S = 6;
const BREATHE_DURATION_MAX_S = 11;
const BREATHE_DELAY_WINDOW_S = 6;

const DRAG_TRANSITION = { duration: 0 };
const SPRING_BACK_TRANSITION = { type: 'spring' as const, stiffness: 300, damping: 22 };

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

export interface GraphDragEndpoint {
  end: 'from' | 'to';
  offset: Point;
  isDragging: boolean;
}

export interface GraphEdgeLineProps {
  edgeKey: string;
  from: Point;
  to: Point;
  color: string;
  visualState: GraphVisualState;
  dragEndpoint?: GraphDragEndpoint | null;
  reduceMotion: boolean;
}

export function GraphEdgeLine({ edgeKey, from, to, color, visualState, dragEndpoint, reduceMotion }: GraphEdgeLineProps) {
  const durationS = BREATHE_DURATION_MIN_S + jitter(`edge-dur:${edgeKey}`, 4271) * (BREATHE_DURATION_MAX_S - BREATHE_DURATION_MIN_S);
  const delayS = jitter(`edge-delay:${edgeKey}`, 4283) * BREATHE_DELAY_WINDOW_S;

  const x1 = from.x + (dragEndpoint?.end === 'from' ? dragEndpoint.offset.x : 0);
  const y1 = from.y + (dragEndpoint?.end === 'from' ? dragEndpoint.offset.y : 0);
  const x2 = to.x + (dragEndpoint?.end === 'to' ? dragEndpoint.offset.x : 0);
  const y2 = to.y + (dragEndpoint?.end === 'to' ? dragEndpoint.offset.y : 0);

  return (
    <motion.line
      initial={false}
      animate={{ x1, y1, x2, y2 }}
      transition={dragEndpoint?.isDragging ? DRAG_TRANSITION : SPRING_BACK_TRANSITION}
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
