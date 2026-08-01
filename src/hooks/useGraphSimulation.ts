import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point, PositionedGraph, PositionedNode } from '../graph/layout/types';
import { createNoise1D } from '../graph/motion/valueNoise';
import { hashStringToIndex } from '../manifest/colorHash';

/**
 * The Knowledge Graph's physics layer.
 *
 * ── The correction this file exists to embody ────────────────────────
 * Through Milestone 9 this simulation gave every node an always-on spring
 * toward its own frozen Layout Engine coordinate, and gated the real
 * network forces (link + many-body repulsion) behind an alpha that cooled
 * to exactly zero at rest. At rest, therefore, link and repulsion were
 * multiplied by zero and the graph was not a network at all — it was 44
 * independent particles, each leashed to a remembered coordinate, coupled
 * to nothing. Dragging deformed almost nothing, and releasing snapped
 * every node back to its exact stored `(x, y)`: "chewing gum attached to
 * invisible nails."
 *
 * That was architectural, not a tuning failure — no constant could fix it,
 * because raising the link force only made it fight a spring that always
 * won. The correction, approved before implementation, demotes the Layout
 * Engine's output from PERMANENT PER-NODE ATTRACTOR to INITIAL CONDITION
 * PLUS REST-LENGTH SOURCE:
 *
 *   - The anchor spring is gone. `anchor` now seeds `pos` at t=0 and
 *     nothing more. `radialLayout.ts` is NOT modified — it still decides
 *     where the graph starts and still produces the `bounds` the camera
 *     fits against.
 *   - Link force and many-body repulsion run CONTINUOUSLY. This is the
 *     load-bearing part: each edge's `restLength` is that edge's own
 *     length in the frozen layout, so the equilibrium the springs seek IS
 *     the layout's own spacing — encoded as RELATIVE DISTANCES rather than
 *     ABSOLUTE COORDINATES. The shape is preserved; the positional memory
 *     is not, which is exactly what lets the graph deform like a web and
 *     stay deformed.
 *   - Centering is d3's `forceCenter`, not `forceX`/`forceY`: it measures
 *     the centroid and TRANSLATES the whole system toward the layout
 *     center. Translation-only, so it can hold the graph in frame without
 *     ever distorting or collapsing it inward.
 *   - Alpha modulates INTENSITY and never gates to zero. Since it scales
 *     link and repulsion together, the equilibrium point is invariant to
 *     it — alpha changes only how fast the graph relaxes, so a drag's
 *     reheat makes it lively and idle keeps it calm without freezing.
 *
 * The known, accepted consequence: resting positions are no longer
 * pixel-identical to `radialLayout`'s output. The graph relaxes into a
 * force equilibrium near it, expanding modestly (which Phase 7's "increase
 * the equilibrium spacing, do not simply scale" requirement actually
 * wants). Exact-coordinate fidelity and organic deformation are mutually
 * exclusive; this file chooses deformation.
 *
 * ── Units ────────────────────────────────────────────────────────────
 * `vel` is in world units PER TICK, where a tick is one 60fps frame —
 * d3-force's own convention, kept so the force expressions below can be
 * read directly against d3/Obsidian source. Real elapsed time enters only
 * as `ticks` (how many 60fps ticks this frame represents, clamped), so
 * behaviour stays identical across refresh rates without changing the
 * force math itself.
 *
 * Renders always read `pos`, never `anchor` — GraphNode/GraphEdgeLine hand
 * this hook a ref to their own root SVG element (via `registerNodeEl`/
 * `registerEdgeEl`) and never touch position themselves.
 */

/** Stands in for d3's node degree in the link force's bias term — our hierarchy already tracks structural importance the way degree would. Used for NOTHING else: like d3-force, there is no mass term in repulsion or integration. */
const MASS: Record<PositionedNode['kind'], number> = { root: 8, category: 3.2, leaf: 1 };

const TICKS_PER_SECOND = 60;
/** Clamp on how much simulation a single frame may advance — a backgrounded tab resuming must not integrate a multi-second jump in one step. */
const MAX_TICKS_PER_FRAME = 2;

/** Per-tick velocity multiplier (d3's `velocityDecay` is 0.6; slightly higher here lets energy travel a little further through the network before dying, which is what makes a release feel absorbed rather than swallowed). */
const VELOCITY_DECAY = 0.75;

// --- Link force (Hooke's law along real edges, Gauss-Seidel relaxation) ---
const LINK_STRENGTH = 0.5;
/** Degenerate-case guard for exactly-coincident anticipated positions — a tiny fixed nudge, never `Math.random()`. */
const JIGGLE = 1e-6;

// --- Many-body repulsion (every pair, not just neighbours) ---
// O(n^2) over ~44 nodes is ~950 pairs/frame — trivially cheap, so the
// spec's Barnes-Hut quadtree (which exists to solve a 1,500+ node problem
// this graph does not have) is deliberately not ported.
const REPEL_STRENGTH = 200;
const REPEL_DISTANCE_MIN = 24;
const REPEL_DISTANCE_MIN_SQ = REPEL_DISTANCE_MIN * REPEL_DISTANCE_MIN;
/**
 * d3's `distanceMax`, and load-bearing here rather than an optimization.
 * Unbounded repulsion is a GLOBAL force: every one of the ~44 nodes pushes
 * every other regardless of distance, and those far-field terms sum into a
 * pressure that slowly rearranges the whole graph — measured at 362 world
 * units of node movement and still creeping after 12s, which would have
 * dismantled the Layout Engine's approved arrangement rather than merely
 * loosening it. Capping the interaction range keeps repulsion doing the
 * job this sprint actually wants from it (local breathing room between
 * neighbouring nodes and adjacent clusters, and shouldering things aside
 * during a drag) while leaving the graph's large-scale structure to the
 * link network. Chosen just above the layout's own inter-category spacing
 * so adjacent clusters still press on each other, and well below the
 * graph's full width so opposite sides do not.
 */
const REPEL_DISTANCE_MAX = 340;
const REPEL_DISTANCE_MAX_SQ = REPEL_DISTANCE_MAX * REPEL_DISTANCE_MAX;

// --- Centering (d3 forceCenter: translation only, never distortion) ---
const CENTER_STRENGTH = 0.04;

// --- Alpha: intensity, never an on/off gate (see the header) ---
/**
 * Raised from an initial 0.055 on measured evidence. A leaf is held by a
 * single link, which fixes its distance from its category but not its
 * angle around it — that angle is a soft mode, restrained only by
 * repulsion from its siblings, and at a low alpha it unwinds so slowly
 * that the graph was still visibly rearranging itself half a minute after
 * opening. Alpha scales link and repulsion together, so raising it does
 * not move WHERE the network settles, only how briskly it gets there:
 * the graph now reaches equilibrium within a few seconds and is genuinely
 * at rest afterwards, instead of creeping indefinitely.
 */
const ALPHA_TARGET_IDLE = 0.09;
const ALPHA_TARGET_DRAGGING = 0.5;
const ALPHA_COOLING_RATE_PER_S = 2.2;
/**
 * Alpha is seeded this high the instant construction hands over. The
 * network starts from the Layout Engine's coordinates, which are close to
 * but not exactly its own equilibrium, so it always has some relaxing to
 * do; at the idle alpha alone that takes about ten seconds of visible
 * creep, and the post-construction camera fit would frame a composition
 * still quietly expanding underneath it. Starting hot lets the graph ease
 * out into its natural spacing in roughly two seconds — which reads as the
 * last beat of the construction, the graph settling into itself, rather
 * than as a separate animation.
 */
const ALPHA_SETTLE_BOOST = 0.35;

// --- Ambient life (never alpha-gated — the graph must never look dead) ---
// Sized so a node wanders single-digit world units over ten seconds:
// perceptible only once you have been watching a while, which is the
// explicit brief ("the user should only notice movement after watching for
// several seconds"). Measured live rather than guessed — the first pass
// here was over twice this and read as a slow churn.
const NOISE_ACCEL: Record<PositionedNode['kind'], number> = { root: 0.00009, category: 0.00022, leaf: 0.00045 };
const NOISE_TIME_SCALE = 0.06;

/**
 * Fraction of the pinned node's own hand-velocity it keeps when released.
 * Milestone 9 zeroed this outright (an exact reading of Obsidian's hard
 * pin); this sprint explicitly reverses that — "do NOT instantly zero all
 * momentum, a small amount of release velocity should remain, neighbours
 * should absorb it." Below 1 so a fast flick hands off energy without
 * launching the node.
 */
const RELEASE_MOMENTUM = 0.6;

const MAX_DT = MAX_TICKS_PER_FRAME / TICKS_PER_SECOND;

function unitJitter(seed: string): number {
  return hashStringToIndex(seed, 100_000) / 100_000;
}

/** Below this per-frame movement (world units), skip the DOM write entirely — SVG attribute writes aren't free even when the value is unchanged. */
const WRITE_EPSILON = 0.02;

interface SimNode {
  id: string;
  kind: PositionedNode['kind'];
  /** The Layout Engine's coordinate. Seeds `pos` at t=0 and is never used as a force target again — see this file's header. */
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
  /** The two endpoints' own distance apart in the frozen layout — the link spring's natural length, so the equilibrium the network relaxes into reproduces the approved layout's SPACING without storing its coordinates. */
  restLength: number;
  el: SVGLineElement | null;
  lastWritten: { x1: number; y1: number; x2: number; y2: number };
}

interface DragState {
  nodeId: string;
  startClient: Point;
  /** The dragged node's live position when the grab began — the pin target is this plus the pointer's world-space travel. Snapshotted rather than read from `anchor`, since a node's resting position is no longer its anchor. */
  startPos: Point;
  /**
   * World-to-screen scale for the WHOLE transform chain, measured off the
   * dragged element itself at grab time. It is not `viewport.scale`: the
   * scene's `<svg>` carries a `viewBox` that is itself scaled to fit the
   * container, so the true factor is that fit scale multiplied by the pan/
   * zoom group's scale. Dividing pointer travel by `viewport.scale` alone
   * (as every earlier milestone did) understated world movement by the
   * missing factor — measured at 0.417 actual versus 0.851 assumed, which
   * is why a "hard pin" visibly trailed the cursor by about half the
   * distance dragged. Captured once per gesture rather than per frame
   * because the camera cannot zoom mid-drag.
   */
  scale: number;
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
  /** False while the construction animation is still growing the graph — nodes hold their layout positions and no forces run, so physics and construction never fight for the same coordinates. */
  active: boolean,
): UseGraphSimulationResult {
  const nodesRef = useRef<Map<string, SimNode>>(new Map());
  const nodeListRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<Map<string, SimEdge>>(new Map());
  const nodeElCallbacksRef = useRef<Map<string, (el: SVGGElement | null) => void>>(new Map());
  const edgeElCallbacksRef = useRef<Map<string, (el: SVGLineElement | null) => void>>(new Map());
  const scaleRef = useRef(viewportScale);
  const reduceMotionRef = useRef(reduceMotion);
  const activeRef = useRef(active);
  const dragRef = useRef<DragState | null>(null);
  const alphaRef = useRef(ALPHA_TARGET_IDLE);
  const alphaTargetRef = useRef(ALPHA_TARGET_IDLE);
  const centerRef = useRef<Point>(positioned.center);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  useEffect(() => {
    scaleRef.current = viewportScale;
  }, [viewportScale]);
  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);
  useEffect(() => {
    // Handing over from construction reheats the network so it can reach
    // its equilibrium promptly instead of creeping there — see
    // `ALPHA_SETTLE_BOOST`. The target stays idle, so this is a single
    // exponential cool-down with no state machine behind it.
    if (active && !activeRef.current) alphaRef.current = ALPHA_SETTLE_BOOST;
    activeRef.current = active;
  }, [active]);

  // (Re)seed simulation state whenever the underlying graph changes.
  // `pos` starts exactly AT the layout coordinate so the very first paint
  // matches the deterministic layout with zero pop; from there the network
  // relaxes into its own equilibrium.
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
        // false, which would silently skip the very first write forever.
        lastWritten: { x: Infinity, y: Infinity },
      });
    });
    nodesRef.current = nodes;
    const nodeList = Array.from(nodes.values());
    nodeListRef.current = nodeList;
    alphaRef.current = ALPHA_TARGET_IDLE;
    alphaTargetRef.current = ALPHA_TARGET_IDLE;

    // The centering force holds the graph's CENTROID, and the target is
    // the centroid the Layout Engine itself produced — deliberately not
    // `positioned.center`. The two are different points (the layout's
    // categories carry uneven numbers of leaves, so the mass of the graph
    // does not sit on its geometric center), and aiming at
    // `positioned.center` made centering translate the entire graph on
    // startup to reconcile that difference — a systematic shift of the
    // whole approved composition, dressed up as drift correction.
    // Targeting the layout's own centroid makes the force a true no-op at
    // rest: it does nothing until the graph actually wanders.
    if (nodeList.length > 0) {
      let sx = 0;
      let sy = 0;
      for (const n of nodeList) {
        sx += n.anchor.x;
        sy += n.anchor.y;
      }
      centerRef.current = { x: sx / nodeList.length, y: sy / nodeList.length };
    } else {
      centerRef.current = positioned.center;
    }

    const edges = new Map<string, SimEdge>();
    for (const edge of positioned.edges) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      const restLength = from && to ? Math.hypot(to.anchor.x - from.anchor.x, to.anchor.y - from.anchor.y) : 0;
      edges.set(`${edge.from}->${edge.to}`, {
        fromId: edge.from,
        toId: edge.to,
        restLength,
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
    const node = nodesRef.current.get(nodeId);
    // Measure the real world-to-screen factor off the element itself
    // rather than trusting `viewportScale` — see `DragState.scale`.
    let scale = scaleRef.current || 1;
    const ctm = node?.el?.getScreenCTM();
    if (ctm) {
      const measured = Math.hypot(ctm.a, ctm.b);
      if (measured > 1e-6) scale = measured;
    }
    dragRef.current = {
      nodeId,
      startClient: clientPoint,
      startPos: node ? { x: node.pos.x, y: node.pos.y } : { x: 0, y: 0 },
      scale,
      offset: { x: 0, y: 0 },
    };
    alphaTargetRef.current = ALPHA_TARGET_DRAGGING;
    setDraggedNodeId(nodeId);
  }, []);

  const updateDragPointer = useCallback((clientPoint: Point) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.offset = {
      x: (clientPoint.x - drag.startClient.x) / drag.scale,
      y: (clientPoint.y - drag.startClient.y) / drag.scale,
    };
  }, []);

  // Releasing does NOT touch velocity: the tick loop has been keeping the
  // pinned node's velocity equal to a damped copy of its hand-velocity all
  // along (see the pin branch), so whatever momentum the gesture had is
  // already sitting there for the network to absorb the moment the pin
  // lifts. Nothing has to be handed across the boundary.
  const endDrag = useCallback(() => {
    dragRef.current = null;
    alphaTargetRef.current = ALPHA_TARGET_IDLE;
    setDraggedNodeId(null);
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastTime: number | null = null;
    let elapsed = 0;

    const writeNode = (n: SimNode) => {
      if (n.el && (Math.abs(n.pos.x - n.lastWritten.x) > WRITE_EPSILON || Math.abs(n.pos.y - n.lastWritten.y) > WRITE_EPSILON)) {
        n.el.setAttribute('transform', `translate(${n.pos.x.toFixed(2)}, ${n.pos.y.toFixed(2)})`);
        n.lastWritten.x = n.pos.x;
        n.lastWritten.y = n.pos.y;
      }
    };

    const writeEdges = (nodes: Map<string, SimNode>) => {
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

    /** Hold every node at its layout coordinate with zero energy — used by both reduced motion and the pre-construction freeze. */
    const holdAtAnchors = (nodes: Map<string, SimNode>, drag: DragState | null) => {
      nodes.forEach((n) => {
        const isDragged = drag !== null && drag.nodeId === n.id;
        n.vel.x = 0;
        n.vel.y = 0;
        n.pos.x = isDragged ? drag!.startPos.x + drag!.offset.x : n.anchor.x;
        n.pos.y = isDragged ? drag!.startPos.y + drag!.offset.y : n.anchor.y;
        writeNode(n);
      });
      writeEdges(nodes);
    };

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
      const drag = dragRef.current;

      // Reduced motion: "disable idle movement, settling, breathing,
      // inertia — while preserving usability." A full early-exit, not a
      // parameter tweak: dragging stays an exact zero-lag hard pin,
      // everything else sits at its layout coordinate with no velocity, so
      // there is no elastic continuation to suppress in the first place.
      if (reduceMotionRef.current) {
        holdAtAnchors(nodes, drag);
        return;
      }

      // Construction phase: the reveal animation owns the screen and the
      // graph must grow into exactly the composition the camera fit was
      // computed against. Physics starts the instant the last node lands.
      if (!activeRef.current) {
        holdAtAnchors(nodes, drag);
        return;
      }

      const ticks = Math.min(dt * TICKS_PER_SECOND, MAX_TICKS_PER_FRAME);

      // Alpha never reaches zero — at the idle floor the network is still
      // genuinely solving itself, just slowly. Because alpha scales link
      // and repulsion equally, where the graph settles does not depend on
      // it; only how briskly it gets there does.
      const alphaTarget = alphaTargetRef.current;
      const alpha = alphaTarget + (alphaRef.current - alphaTarget) * Math.exp(-ALPHA_COOLING_RATE_PER_S * dt);
      alphaRef.current = alpha;

      const nodeList = nodeListRef.current;

      // Pass 1a: link force. Deltas are measured between ANTICIPATED
      // positions (`pos + vel`, Gauss-Seidel relaxation) for stability,
      // and split between the endpoints by a mass bias so the heavier end
      // of an edge yields less. Not divided by mass afterwards — the bias
      // IS the responsiveness term, exactly as in d3-force.
      const rates = new Map<string, Point>();
      const getRate = (id: string) => {
        let r = rates.get(id);
        if (!r) {
          r = { x: 0, y: 0 };
          rates.set(id, r);
        }
        return r;
      };

      edgesRef.current.forEach((edge) => {
        const s = nodes.get(edge.fromId);
        const t = nodes.get(edge.toId);
        if (!s || !t) return;
        let dx = t.pos.x + t.vel.x - (s.pos.x + s.vel.x);
        let dy = t.pos.y + t.vel.y - (s.pos.y + s.vel.y);
        if (dx === 0) dx = JIGGLE;
        if (dy === 0) dy = JIGGLE;
        const l = Math.hypot(dx, dy);
        const k = ((l - edge.restLength) / l) * alpha * LINK_STRENGTH;
        dx *= k;
        dy *= k;
        const bias = s.mass / (s.mass + t.mass);
        const tRate = getRate(t.id);
        tRate.x -= dx * bias;
        tRate.y -= dy * bias;
        const sRate = getRate(s.id);
        sRate.x += dx * (1 - bias);
        sRate.y += dy * (1 - bias);
      });

      // Pass 1b: many-body repulsion across every pair, including nodes in
      // different clusters that share no edge. This is what gives the
      // graph its breathing room and what makes a dragged cluster shoulder
      // its neighbours aside instead of passing through them.
      for (let i = 0; i < nodeList.length; i++) {
        const a = nodeList[i];
        for (let j = i + 1; j < nodeList.length; j++) {
          const b = nodeList[j];
          const dx = b.pos.x - a.pos.x;
          const dy = b.pos.y - a.pos.y;
          let l = dx * dx + dy * dy;
          // Beyond the cutoff the pair simply doesn't interact. The force
          // there is already vanishingly small (it falls as 1/r^2), so
          // dropping it introduces no visible discontinuity — it only
          // removes the far-field sum that was reshaping the graph.
          if (l > REPEL_DISTANCE_MAX_SQ) continue;
          // The spec's geometric-mean softening rather than a hard floor —
          // keeps the force continuous through the close-range clamp.
          if (l < REPEL_DISTANCE_MIN_SQ) l = Math.sqrt(REPEL_DISTANCE_MIN_SQ * l);
          const w = (-REPEL_STRENGTH * alpha) / l;
          const aRate = getRate(a.id);
          aRate.x += dx * w;
          aRate.y += dy * w;
          const bRate = getRate(b.id);
          bRate.x -= dx * w;
          bRate.y -= dy * w;
        }
      }

      // Pass 2: integrate. Pinned nodes skip all forces — an exact hard
      // pin, position driven straight from the cursor with zero lag and
      // zero smoothing — but their velocity is kept in sync with the
      // hand's own motion so that releasing hands real momentum to the
      // network. That velocity also feeds the link force's anticipated
      // positions above, so neighbours lean toward where the drag is
      // heading rather than only where it has already been.
      nodes.forEach((n) => {
        if (drag !== null && drag.nodeId === n.id) {
          const targetX = drag.startPos.x + drag.offset.x;
          const targetY = drag.startPos.y + drag.offset.y;
          n.vel.x = ((targetX - n.pos.x) / ticks) * RELEASE_MOMENTUM;
          n.vel.y = ((targetY - n.pos.y) / ticks) * RELEASE_MOMENTUM;
          n.pos.x = targetX;
          n.pos.y = targetY;
          writeNode(n);
          return;
        }

        const rate = rates.get(n.id);
        if (rate) {
          n.vel.x += rate.x * ticks;
          n.vel.y += rate.y * ticks;
        }

        // Ambient life. Never alpha-gated and never periodic: each node
        // has its own two value-noise generators and its own phase, so
        // nothing in the graph shares a cycle with anything else.
        const t = elapsed * NOISE_TIME_SCALE + n.noisePhase;
        const noise = NOISE_ACCEL[n.kind];
        n.vel.x += n.noiseX(t) * noise * ticks;
        n.vel.y += n.noiseY(t) * noise * ticks;

        const decay = Math.pow(VELOCITY_DECAY, ticks);
        n.vel.x *= decay;
        n.vel.y *= decay;
        n.pos.x += n.vel.x * ticks;
        n.pos.y += n.vel.y * ticks;
        writeNode(n);
      });

      // Pass 3: centering — d3's `forceCenter`. Measures the centroid and
      // translates every node equally toward the layout's own center. A
      // rigid translation, so it can keep the graph in frame without
      // pulling it inward or distorting the shape the network solved for.
      // The pinned node is exempt: it belongs to the cursor, not to us.
      let cx = 0;
      let cy = 0;
      for (const n of nodeList) {
        cx += n.pos.x;
        cy += n.pos.y;
      }
      cx /= nodeList.length;
      cy /= nodeList.length;
      const shiftX = (centerRef.current.x - cx) * CENTER_STRENGTH * ticks;
      const shiftY = (centerRef.current.y - cy) * CENTER_STRENGTH * ticks;
      if (shiftX !== 0 || shiftY !== 0) {
        nodes.forEach((n) => {
          if (drag !== null && drag.nodeId === n.id) return;
          n.pos.x += shiftX;
          n.pos.y += shiftY;
          writeNode(n);
        });
      }

      writeEdges(nodes);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { registerNodeEl, registerEdgeEl, beginDrag, updateDragPointer, endDrag, draggedNodeId };
}
