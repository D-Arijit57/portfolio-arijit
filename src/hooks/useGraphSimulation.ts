import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point, PositionedGraph, PositionedNode } from '../graph/layout/types';
import { createNoise1D } from '../graph/motion/valueNoise';
import { hashStringToIndex } from '../manifest/colorHash';

/**
 * The Knowledge Graph's physics layer — replaces the earlier CSS-keyframe
 * "idle float" and the Motion-driven per-node drag offset with one
 * continuous, always-running force simulation, imperatively driving the
 * DOM directly (no React re-render per frame — with ~44 nodes at 60fps,
 * routing every tick through React's reconciler would be wasteful; a
 * `transform`/`x1,y1,x2,y2` attribute write is not).
 *
 * The deterministic Layout Engine's own `{x, y}` becomes each node's
 * ANCHOR — its resting configuration, never mutated here. What this hook
 * owns is a live `pos`/`vel` per node that continuously spring-settles
 * toward that anchor, perturbed by:
 *
 *   - a slow, continuous, per-node value-noise force (never a sine/loop —
 *     see `valueNoise.ts` — so the system never exactly repeats and never
 *     comes to rest, matching "always trying to settle, never perfectly
 *     still")
 *   - a small pull from each STRUCTURAL neighbor's own current
 *     displacement-from-anchor, scaled by that neighbor's mass — this is
 *     what makes dragging a (heavy) category noticeably drag its (light)
 *     leaves along, while dragging a single light leaf barely nudges its
 *     heavy category: the asymmetry falls straight out of the mass ratio,
 *     nothing here special-cases "category" vs "leaf" behavior directly.
 *
 * Dragging isn't a separate code path bolted on top — a dragged node's
 * "anchor" for that one frame becomes the cursor's world-space target,
 * pulled toward with a stronger (but still spring, still integrated
 * through the same velocity) stiffness. That's what makes release carry
 * real momentum into the ambient spring-back instead of snapping.
 *
 * Renders always read `pos`, never `anchor` — GraphNode/GraphEdgeLine
 * hand this hook a ref to their own root SVG element (via
 * `registerNodeEl`/`registerEdgeEl`) and never touch position themselves.
 */

const MASS: Record<PositionedNode['kind'], number> = { root: 8, category: 3.2, leaf: 1 };
const SPRING_K = 5.5;
const DRAG_SPRING_K = 55;
const NEIGHBOR_K = 0.6;
const DAMPING_RATE = 2.6;
const NOISE_FORCE: Record<PositionedNode['kind'], number> = { root: 5.5, category: 10, leaf: 16 };
// Lattice-units of noise-time advanced per real second — small, so one
// full lattice step (a meaningfully different noise value) spans well
// over ten seconds: "very slowly... almost imperceptible."
const NOISE_TIME_SCALE = 0.06;
const MAX_DT = 1 / 30;
// Caps how much of a dragged/perturbed neighbor's displacement can
// propagate further — without this, an unusually large drag could fling
// distant nodes rather than just "slightly follow."
const MAX_NEIGHBOR_DISPLACEMENT = 140;

function unitJitter(seed: string): number {
  return hashStringToIndex(seed, 100_000) / 100_000;
}

// Below this per-frame movement (world units), skip the DOM write
// entirely — once a node is truly at rest (reduced motion, or a normal-
// motion node that's momentarily settled between noise nudges), there's
// no reason to keep re-issuing an attribute write with the same value
// every frame; SVG attribute writes aren't free even when the value is
// unchanged.
const WRITE_EPSILON = 0.02;

interface SimNode {
  id: string;
  kind: PositionedNode['kind'];
  anchor: Point;
  pos: Point;
  vel: Point;
  mass: number;
  noiseX: (t: number) => number;
  noiseY: (t: number) => number;
  noisePhase: number;
  el: SVGGElement | null;
  lastWritten: Point;
}

interface SimEdge {
  fromId: string;
  toId: string;
  el: SVGLineElement | null;
  lastWritten: { x1: number; y1: number; x2: number; y2: number };
}

interface DragState {
  nodeId: string;
  startClient: Point;
  offset: Point;
}

export interface UseGraphSimulationResult {
  registerNodeEl: (id: string) => (el: SVGGElement | null) => void;
  registerEdgeEl: (edgeKey: string) => (el: SVGLineElement | null) => void;
  beginDrag: (nodeId: string, clientPoint: Point) => void;
  updateDragPointer: (clientPoint: Point) => void;
  endDrag: () => void;
  draggedNodeId: string | null;
}

export function useGraphSimulation(
  positioned: PositionedGraph,
  viewportScale: number,
  reduceMotion: boolean,
): UseGraphSimulationResult {
  const nodesRef = useRef<Map<string, SimNode>>(new Map());
  const edgesRef = useRef<Map<string, SimEdge>>(new Map());
  const neighborsRef = useRef<Map<string, string[]>>(new Map());
  const nodeElCallbacksRef = useRef<Map<string, (el: SVGGElement | null) => void>>(new Map());
  const edgeElCallbacksRef = useRef<Map<string, (el: SVGLineElement | null) => void>>(new Map());
  const scaleRef = useRef(viewportScale);
  const reduceMotionRef = useRef(reduceMotion);
  const dragRef = useRef<DragState | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  useEffect(() => {
    scaleRef.current = viewportScale;
  }, [viewportScale]);
  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  // (Re)seed simulation state whenever the underlying graph changes (a
  // file-content edit). Anchors come straight from the Layout Engine;
  // pos/vel start exactly AT anchor so the very first frame matches the
  // deterministic layout with zero pop/settle-in.
  useEffect(() => {
    const nodes = new Map<string, SimNode>();
    positioned.nodes.forEach((node) => {
      nodes.set(node.id, {
        id: node.id,
        kind: node.kind,
        anchor: { x: node.x, y: node.y },
        pos: { x: node.x, y: node.y },
        vel: { x: 0, y: 0 },
        mass: MASS[node.kind],
        noiseX: createNoise1D(`sim-noise-x:${node.id}`),
        noiseY: createNoise1D(`sim-noise-y:${node.id}`),
        noisePhase: unitJitter(`sim-noise-phase:${node.id}`) * 40,
        el: null,
        // Infinity, not NaN — `Math.abs(x - NaN) > epsilon` is always
        // false (any comparison against NaN is), which would silently
        // skip the very first write forever. Infinity guarantees the
        // first frame's delta exceeds the epsilon unconditionally.
        lastWritten: { x: Infinity, y: Infinity },
      });
    });
    nodesRef.current = nodes;

    const neighbors = new Map<string, string[]>();
    for (const edge of positioned.edges) {
      if (!neighbors.has(edge.from)) neighbors.set(edge.from, []);
      if (!neighbors.has(edge.to)) neighbors.set(edge.to, []);
      neighbors.get(edge.from)!.push(edge.to);
      neighbors.get(edge.to)!.push(edge.from);
    }
    neighborsRef.current = neighbors;

    const edges = new Map<string, SimEdge>();
    for (const edge of positioned.edges) {
      edges.set(`${edge.from}->${edge.to}`, {
        fromId: edge.from,
        toId: edge.to,
        el: null,
        lastWritten: { x1: Infinity, y1: Infinity, x2: Infinity, y2: Infinity },
      });
    }
    edgesRef.current = edges;

    nodeElCallbacksRef.current = new Map();
    edgeElCallbacksRef.current = new Map();
  }, [positioned]);

  const registerNodeEl = useCallback((id: string) => {
    const cache = nodeElCallbacksRef.current;
    const existing = cache.get(id);
    if (existing) return existing;
    const callback = (el: SVGGElement | null) => {
      const node = nodesRef.current.get(id);
      if (node) node.el = el;
    };
    cache.set(id, callback);
    return callback;
  }, []);

  const registerEdgeEl = useCallback((edgeKey: string) => {
    const cache = edgeElCallbacksRef.current;
    const existing = cache.get(edgeKey);
    if (existing) return existing;
    const callback = (el: SVGLineElement | null) => {
      const edge = edgesRef.current.get(edgeKey);
      if (edge) edge.el = el;
    };
    cache.set(edgeKey, callback);
    return callback;
  }, []);

  const beginDrag = useCallback((nodeId: string, clientPoint: Point) => {
    dragRef.current = { nodeId, startClient: clientPoint, offset: { x: 0, y: 0 } };
    setDraggedNodeId(nodeId);
  }, []);

  const updateDragPointer = useCallback((clientPoint: Point) => {
    const drag = dragRef.current;
    if (!drag) return;
    const scale = scaleRef.current || 1;
    drag.offset = {
      x: (clientPoint.x - drag.startClient.x) / scale,
      y: (clientPoint.y - drag.startClient.y) / scale,
    };
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDraggedNodeId(null);
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastTime: number | null = null;
    let elapsed = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (lastTime === null) {
        lastTime = now;
        return;
      }
      const dt = Math.min((now - lastTime) / 1000, MAX_DT);
      lastTime = now;
      elapsed += dt;

      const nodes = nodesRef.current;
      const neighbors = neighborsRef.current;
      const drag = dragRef.current;
      const reduce = reduceMotionRef.current;

      // Pass 1: accelerations from THIS frame's starting positions, so
      // force calculation never depends on Map iteration order.
      const accel = new Map<string, Point>();
      nodes.forEach((n) => {
        let fx = 0;
        let fy = 0;
        const isDragged = drag !== null && drag.nodeId === n.id;

        if (isDragged) {
          const targetX = n.anchor.x + drag!.offset.x;
          const targetY = n.anchor.y + drag!.offset.y;
          fx += DRAG_SPRING_K * (targetX - n.pos.x);
          fy += DRAG_SPRING_K * (targetY - n.pos.y);
        } else {
          fx += SPRING_K * (n.anchor.x - n.pos.x);
          fy += SPRING_K * (n.anchor.y - n.pos.y);
          if (!reduce) {
            const t = elapsed * NOISE_TIME_SCALE + n.noisePhase;
            const amp = NOISE_FORCE[n.kind];
            fx += n.noiseX(t) * amp;
            fy += n.noiseY(t) * amp;
          }
        }

        // Averaged (not summed) over neighbor count — otherwise a
        // high-degree node (root's 6 categories, a category's many
        // leaves) would accumulate force proportional to its topology
        // degree alone, which both breaks the intended mass hierarchy
        // (measured live: root out-drifted leaves before this fix,
        // exactly backwards) and dilutes the "a category being dragged
        // pulls its children" signal into noise. Averaging fixes both:
        // a leaf has exactly one neighbor (its category), so it still
        // gets the FULL pull when that category is dragged; a category
        // with many leaf neighbors gets only the average pull of one
        // leaf being dragged, i.e. "barely affects its category."
        const neighborIds = neighbors.get(n.id);
        if (neighborIds && neighborIds.length > 0) {
          let nx = 0;
          let ny = 0;
          for (const neighborId of neighborIds) {
            const neighbor = nodes.get(neighborId);
            if (!neighbor) continue;
            let dx = neighbor.pos.x - neighbor.anchor.x;
            let dy = neighbor.pos.y - neighbor.anchor.y;
            const len = Math.hypot(dx, dy);
            if (len > MAX_NEIGHBOR_DISPLACEMENT) {
              const s = MAX_NEIGHBOR_DISPLACEMENT / len;
              dx *= s;
              dy *= s;
            }
            nx += neighbor.mass * dx;
            ny += neighbor.mass * dy;
          }
          fx += (NEIGHBOR_K * nx) / neighborIds.length;
          fy += (NEIGHBOR_K * ny) / neighborIds.length;
        }

        accel.set(n.id, { x: fx / n.mass, y: fy / n.mass });
      });

      // Pass 2: integrate (semi-implicit Euler) and write straight to the DOM.
      const dampingFactor = Math.exp(-DAMPING_RATE * dt);
      nodes.forEach((n) => {
        const a = accel.get(n.id)!;
        n.vel.x = (n.vel.x + a.x * dt) * dampingFactor;
        n.vel.y = (n.vel.y + a.y * dt) * dampingFactor;
        n.pos.x += n.vel.x * dt;
        n.pos.y += n.vel.y * dt;
        if (n.el && (Math.abs(n.pos.x - n.lastWritten.x) > WRITE_EPSILON || Math.abs(n.pos.y - n.lastWritten.y) > WRITE_EPSILON)) {
          n.el.setAttribute('transform', `translate(${n.pos.x.toFixed(2)}, ${n.pos.y.toFixed(2)})`);
          n.lastWritten.x = n.pos.x;
          n.lastWritten.y = n.pos.y;
        }
      });

      edgesRef.current.forEach((edge) => {
        if (!edge.el) return;
        const from = nodes.get(edge.fromId);
        const to = nodes.get(edge.toId);
        if (!from || !to) return;
        const lw = edge.lastWritten;
        if (
          Math.abs(from.pos.x - lw.x1) > WRITE_EPSILON ||
          Math.abs(from.pos.y - lw.y1) > WRITE_EPSILON ||
          Math.abs(to.pos.x - lw.x2) > WRITE_EPSILON ||
          Math.abs(to.pos.y - lw.y2) > WRITE_EPSILON
        ) {
          edge.el.setAttribute('x1', from.pos.x.toFixed(2));
          edge.el.setAttribute('y1', from.pos.y.toFixed(2));
          edge.el.setAttribute('x2', to.pos.x.toFixed(2));
          edge.el.setAttribute('y2', to.pos.y.toFixed(2));
          lw.x1 = from.pos.x;
          lw.y1 = from.pos.y;
          lw.x2 = to.pos.x;
          lw.y2 = to.pos.y;
        }
      });
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { registerNodeEl, registerEdgeEl, beginDrag, updateDragPointer, endDrag, draggedNodeId };
}
