import type { PositionedGraph } from '../layout/types';

/**
 * The Knowledge Graph's construction ("growth") schedule — when each node
 * and each edge becomes visible during the ~1.6s reveal that plays every
 * time the graph opens.
 *
 * Pure and synchronous: it produces two delay tables ONCE, which the
 * renderer then hands to CSS as per-element `animation-delay` values. No
 * timers, no per-frame React state, no RAF — the browser's own compositor
 * runs the entire construction animation. The only thing JavaScript waits
 * for is `totalMs`, a single `setTimeout` that flips the simulation on.
 *
 * Randomization is deliberately two-layered, because the brief asks for
 * two things that sound contradictory: "every page refresh should produce
 * a slightly different reveal order" AND "deterministic within a single
 * animation instance." So exactly ONE nondeterministic number enters the
 * system — the `seed` argument, drawn once per mount by the caller — and
 * every ordering/jitter decision below is derived from it deterministically
 * via `mulberry32`. Re-running this function with the same seed always
 * yields a byte-identical schedule; `Math.random()` is never called during
 * the animation itself. This is the narrow, documented exception to this
 * codebase's "never Math.random for motion" convention, which exists to
 * keep motion reproducible across builds — here per-instance variation is
 * the explicit requirement, not an accident.
 */

/** Window over which all non-root nodes appear. Node/edge animations run past its end, so the true total is longer — see `totalMs`. */
const NODE_WINDOW_MS = 1150;
/** How long a single node's own opacity/scale reveal runs (must match the `graph-node-reveal` keyframe's duration in KnowledgeGraphScene). */
export const NODE_REVEAL_MS = 400;
/** How long a single edge's own draw-on runs (must match `graph-edge-reveal`). */
export const EDGE_REVEAL_MS = 380;
/**
 * Gap between an edge's latest endpoint appearing and that edge starting
 * to draw. The brief requires an edge to begin only AFTER its destination
 * node appears; this schedule uses `max(from, to)` rather than just `to`,
 * because the shuffle deliberately allows a leaf to appear before its own
 * category (the brief's own example order does exactly that) and a line
 * growing out of a still-invisible parent reads as a glitch, not as growth.
 */
const EDGE_LAG_MS = 70;

/** Deterministic PRNG seeded from a single 32-bit integer — same seed, same sequence, forever. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RevealSchedule {
  /** Node id -> ms after construction start at which its reveal animation begins. */
  nodeDelayMs: Map<string, number>;
  /** `${from}->${to}` -> ms after construction start at which its draw-on begins. */
  edgeDelayMs: Map<string, number>;
  /** When the LAST animation of the whole construction finishes — the moment physics may switch on. */
  totalMs: number;
}

export function buildRevealSchedule(positioned: PositionedGraph, seed: number): RevealSchedule {
  const random = mulberry32(seed);

  // The root is the seed of the growth and always lands first, at t=0 —
  // "only the center node exists" is the required initial state. Everything
  // else (categories AND leaves together, deliberately not grouped by kind)
  // is shuffled into one flat randomized order, so a leaf can surface
  // before its own category exactly as the brief's example order shows.
  const others = positioned.nodes.filter((node) => node.kind !== 'root');
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }

  const nodeDelayMs = new Map<string, number>();
  for (const node of positioned.nodes) {
    if (node.kind === 'root') nodeDelayMs.set(node.id, 0);
  }

  // Spread evenly across the window, then jitter each slot by up to half a
  // slot either way. An even spread alone reads as metronomic; pure random
  // delays clump and leave dead gaps. Even-plus-jitter gives a steady but
  // visibly irregular trickle.
  const slot = others.length > 1 ? NODE_WINDOW_MS / (others.length - 1) : 0;
  others.forEach((node, index) => {
    const base = slot * index;
    const jitter = (random() - 0.5) * slot;
    nodeDelayMs.set(node.id, Math.max(0, Math.min(NODE_WINDOW_MS, base + jitter)));
  });

  const edgeDelayMs = new Map<string, number>();
  for (const edge of positioned.edges) {
    const fromDelay = nodeDelayMs.get(edge.from) ?? 0;
    const toDelay = nodeDelayMs.get(edge.to) ?? 0;
    edgeDelayMs.set(`${edge.from}->${edge.to}`, Math.max(fromDelay, toDelay) + EDGE_LAG_MS);
  }

  let latestNodeEnd = 0;
  nodeDelayMs.forEach((delay) => {
    latestNodeEnd = Math.max(latestNodeEnd, delay + NODE_REVEAL_MS);
  });
  let latestEdgeEnd = 0;
  edgeDelayMs.forEach((delay) => {
    latestEdgeEnd = Math.max(latestEdgeEnd, delay + EDGE_REVEAL_MS);
  });

  return { nodeDelayMs, edgeDelayMs, totalMs: Math.max(latestNodeEnd, latestEdgeEnd) };
}
