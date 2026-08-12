import React, { useLayoutEffect, useState } from 'react';

/** ~15s of frames — long enough to outlast the pipeline's own reveal, which is
 * what the stage anchors are waiting on. Bounded, and self-terminating the
 * moment every anchor a wire needs is in place. */
const MAX_ANCHOR_FRAMES = 900;

/**
 * Resting and emphasised stroke opacity.
 *
 * `EvidenceConnector`'s own values, and for the same reason: every resting
 * wire is drawn at once, so the set has to read as context rather than as six
 * competing signals. At 0.22 the lines describe the shape of the relationship
 * without any one of them asking to be followed; lifting the emphasised line
 * to 0.9 pulls it clear without changing its weight or colour, so the change
 * reads as *this line getting brighter* rather than a different line
 * appearing.
 */
const IDLE_OPACITY = 0.38;
const ACTIVE_OPACITY = 0.95;
/** Non-emphasised wires drop to this while something else is emphasised. */
const MUTED_OPACITY = 0.1;

export interface ConnectorEdge {
  id: string;
  /** Anchor key for the source end. */
  from: string;
  /** Anchor key for the target end. */
  to: string;
  color: string;
  /** Drawn at rest, or only while one of its endpoints is emphasised. */
  restingVisible: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Wire {
  id: string;
  color: string;
  d: string;
  from: Point;
  to: Point;
  resting: boolean;
}

/** Corner radius where a run turns into the channel and back out again. */
const CORNER_RADIUS = 7;

/**
 * Out of the source, down (or up) a vertical lane, and into the target —
 * right angles with rounded corners, not a bezier.
 *
 * The S-curve `CortexaConnectors` and `EvidenceConnector` use is right for
 * those surfaces, where a wire crosses a wide gap between two panels. Here six
 * wires share one narrow channel between the artifact column and the pipeline,
 * and a curve spanning 300px vertically inside a 50px channel degenerates into
 * a near-vertical squiggle that reads as noise. An orthogonal run stays legible
 * at any aspect ratio, and — because every wire leaving one artifact shares a
 * lane — the three that fan out of a single panel draw as one trunk with three
 * branches rather than three overlapping diagonals.
 */
function orthogonalPath(from: Point, to: Point, laneX: number): string {
  const dy = to.y - from.y;
  if (Math.abs(dy) < 1) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  const sign = dy > 0 ? 1 : -1;
  const r = Math.max(
    0,
    Math.min(CORNER_RADIUS, Math.abs(dy) / 2, Math.abs(laneX - from.x), Math.abs(to.x - laneX)),
  );

  return [
    `M ${from.x} ${from.y}`,
    `L ${laneX - r} ${from.y}`,
    `Q ${laneX} ${from.y} ${laneX} ${from.y + sign * r}`,
    `L ${laneX} ${to.y - sign * r}`,
    `Q ${laneX} ${to.y} ${laneX + r} ${to.y}`,
    `L ${to.x} ${to.y}`,
  ].join(' ');
}

/** Vertical S-curve — the fallback for a layout that has reflowed the target
 * beneath the source instead of beside it. */
function verticalPath(from: Point, to: Point): string {
  const midY = from.y + (to.y - from.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

/**
 * Semantic connectors between artifacts and pipeline stages.
 *
 * Generalized from `resume/evidence/EvidenceConnector.tsx` — which stays
 * exactly as it is, still serving hire_me.md — with three changes and no
 * others: wires arrive as a prop instead of an imported constant, endpoints
 * resolve through a caller-supplied `getAnchor(id)` rather than a bespoke
 * two-endpoint getter, and each wire picks its own path shape by comparing
 * endpoint deltas, so a grid that reflows the pipeline from beside the
 * artifacts to beneath them gets vertical drops without any breakpoint
 * bookkeeping here.
 *
 * Everything that made the original robust carries over unchanged: geometry is
 * measured with `getBoundingClientRect()` against a shared container, recomputed
 * in a layout effect, re-measured through a `ResizeObserver` and a passive
 * scroll listener, retried across frames while anchors are still attaching, and
 * clipped per wire so an endpoint scrolled out of view drops only its own line
 * rather than breaking the set.
 *
 * The rule that matters most for interaction is also inherited: `emphasisId`
 * is deliberately absent from the geometry effect's dependencies. Hovering
 * changes which path is opaque — a CSS transition on an already-computed `d` —
 * and never triggers a measurement.
 *
 * The whole layer is decorative reinforcement: `aria-hidden`, non-interactive,
 * and every relationship it draws is also stated in text elsewhere on the page.
 */
export function ArtifactConnectors({
  containerRef,
  scrollRef,
  edges,
  getAnchor,
  boundaryId,
  emphasisIds,
  enabled,
}: {
  /** The element wires are positioned against — must be `position: relative`. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** The scrolling ancestor, for per-wire clipping. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  edges: ConnectorEdge[];
  getAnchor: (id: string) => HTMLElement | null;
  /**
   * Anchor id of the panel the targets live inside. When present, a wire ends
   * on that panel's left border at the target's own vertical centre rather
   * than at the target element itself — so the line never crosses into the
   * panel and overlaps the content it is pointing at. The same border-to-border
   * convention `TerminalExecutionWire` already follows.
   */
  boundaryId?: string;
  /** Anchor ids currently emphasised — usually one artifact and its stages. */
  emphasisIds: Set<string>;
  /** False below the width where the curves have room to read. */
  enabled: boolean;
}) {
  const [wires, setWires] = useState<Wire[]>([]);

  useLayoutEffect(() => {
    if (!enabled) {
      setWires([]);
      return undefined;
    }

    let rafId: number | undefined;
    let attempts = 0;

    const compute = () => {
      const container = containerRef.current;
      const scroller = scrollRef.current;
      if (!container || !scroller) {
        if (attempts++ < MAX_ANCHOR_FRAMES) rafId = requestAnimationFrame(compute);
        return;
      }

      const resolved = edges.map((edge) => ({
        edge,
        from: getAnchor(edge.from),
        to: getAnchor(edge.to),
      }));

      // Host refs attach during React's bottom-up commit pass, and the stage
      // anchors additionally only exist once the pipeline has mounted its
      // rows. Retry across frames rather than giving up the first time one is
      // missing.
      if (resolved.some((entry) => !entry.from || !entry.to)) {
        if (attempts++ < MAX_ANCHOR_FRAMES) rafId = requestAnimationFrame(compute);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const viewport = scroller.getBoundingClientRect();
      const rel = (x: number, y: number): Point => ({
        x: x - containerRect.left,
        y: y - containerRect.top,
      });

      const boundary = boundaryId ? getAnchor(boundaryId)?.getBoundingClientRect() : undefined;

      // One vertical lane per source artifact, ordered by first appearance so
      // the assignment is stable across re-measures. Lanes are spread evenly
      // across the channel between the artifact column and the target panel.
      const laneOwners: string[] = [];
      for (const { edge } of resolved) {
        if (!laneOwners.includes(edge.from)) laneOwners.push(edge.from);
      }

      const next: Wire[] = [];
      for (const { edge, from, to } of resolved) {
        const fromRect = from!.getBoundingClientRect();
        const toRect = to!.getBoundingClientRect();
        const fromY = fromRect.top + fromRect.height / 2;
        const toY = toRect.top + toRect.height / 2;

        // Per-wire clipping: one endpoint scrolled out of the editor drops
        // only its own line, leaving the rest of the set intact.
        if (fromY < viewport.top || fromY > viewport.bottom) continue;
        if (toY < viewport.top || toY > viewport.bottom) continue;

        // The x the wire actually terminates at: the target panel's border
        // when one was given, otherwise the target element's own left edge.
        const endX = boundary ? boundary.left : toRect.left;

        // Beside, or beneath? Purely a question of whether the target sits to
        // the right of the source, since an orthogonal route handles any
        // vertical span once it has a channel to run in. An earlier version
        // weighed the horizontal gap against the vertical one and sent the
        // longest wire down the S-curve fallback, which drew it diagonally
        // across the artifact in between.
        const sideways = endX > fromRect.right + 8;

        if (!sideways) {
          const start = rel(fromRect.left + fromRect.width / 2, fromRect.bottom);
          const end = rel(toRect.left + toRect.width / 2, toRect.top);
          next.push({
            id: edge.id,
            color: edge.color,
            d: verticalPath(start, end),
            from: start,
            to: end,
            resting: edge.restingVisible,
          });
          continue;
        }

        const start = rel(fromRect.right, fromY);
        const end = rel(endX, toY);

        const laneIndex = laneOwners.indexOf(edge.from);
        const channel = end.x - start.x;
        const laneX = start.x + (channel * (laneIndex + 1)) / (laneOwners.length + 1);

        next.push({
          id: edge.id,
          color: edge.color,
          d: orthogonalPath(start, end, laneX),
          from: start,
          to: end,
          resting: edge.restingVisible,
        });
      }
      setWires(next);
    };

    compute();

    // A resize of the container covers the grid reflowing and the editor pane
    // being resized; the scroll listener covers the canvas moving under a
    // fixed set of anchors.
    const observer = new ResizeObserver(compute);
    if (containerRef.current) observer.observe(containerRef.current);
    if (scrollRef.current) observer.observe(scrollRef.current);

    const scroller = scrollRef.current;
    scroller?.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute, { passive: true });

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      observer.disconnect();
      scroller?.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
    // `emphasisIds` is deliberately absent: which line is bright is a paint
    // concern, not a geometry one, so hovering must not trigger a re-measure.
  }, [enabled, edges, getAnchor, boundaryId, containerRef, scrollRef]);

  if (wires.length === 0) return null;

  const emphasising = emphasisIds.size > 0;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ overflow: 'visible' }}
    >
      {wires.map((wire) => {
        const active = emphasising && emphasisIds.has(wire.id);
        // A hover-only wire is invisible until its own relationship is the one
        // being emphasised, so the resting page stays calm and the hidden set
        // never has to be reasoned about as "faint lines you can't quite see".
        if (!wire.resting && !active) return null;

        const opacity = active ? ACTIVE_OPACITY : emphasising ? MUTED_OPACITY : IDLE_OPACITY;

        return (
          <g key={wire.id} className="artifact-connector">
            <path
              d={wire.d}
              fill="none"
              stroke={wire.color}
              strokeWidth={active ? 1.5 : 1}
              strokeOpacity={opacity}
            />
            {[wire.from, wire.to].map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={active ? 2.75 : 2}
                fill={wire.color}
                fillOpacity={opacity}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
