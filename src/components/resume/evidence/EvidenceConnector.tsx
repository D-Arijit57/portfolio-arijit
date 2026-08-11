import React, { useLayoutEffect, useState } from 'react';
import { CLAIMS } from './claims';

/** ~15s of frames — comfortably longer than the left pane's typing playback,
 * which is what the anchors are waiting on. */
const MAX_ANCHOR_FRAMES = 900;

/**
 * Resting and active stroke opacity.
 *
 * Every claim's line is drawn at all times, so the set has to read as context
 * rather than as five competing signals: at 0.2 the inactive lines describe the
 * shape of the relationship — five claims, each landing somewhere specific —
 * without any one of them asking to be followed. Raising the active line to
 * 0.9 is then enough to pull it clear of the others without changing its
 * weight or colour, which is what keeps the transition readable as *the same
 * line getting brighter* rather than a different line appearing.
 */
const IDLE_OPACITY = 0.2;
const ACTIVE_OPACITY = 0.9;

interface Point {
  x: number;
  y: number;
}

interface Wire {
  id: string;
  color: string;
  d: string;
}

/** Horizontal S-curve, control points pushed along x — the same shape and the
 * same helper CortexaConnectors uses for its side-by-side hop, so the two
 * connector systems in this app draw the same kind of line. */
function horizontalPath(from: Point, to: Point): string {
  const midX = from.x + (to.x - from.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

/**
 * The connectors between hire_me.md's claims (left pane) and their evidence
 * groups' rail dots (right pane) — all five, drawn at once, with the active
 * one brightened.
 *
 * Modelled on `documentation/CortexaConnectors.tsx` — measure endpoints with
 * `getBoundingClientRect()`, express them relative to a shared container,
 * recompute in `useLayoutEffect`, observe for resize. One difference drives
 * everything else here: cortexa.md's panels live in a single scroll container,
 * while these two panes scroll independently and are separated by a draggable
 * divider. So this also listens to both panes' `scroll` events (passive), and
 * drops any individual line whose endpoint has scrolled out of its own pane —
 * a connector whose end has left the visible area would otherwise appear to
 * attach to nothing.
 *
 * There is deliberately no animation loop and no polling. Geometry is measured
 * only on the events that can actually move an endpoint: either pane scrolling,
 * and any resize (which covers both the window and the divider drag, since
 * dragging resizes the panes the observer is watching). Hovering a claim does
 * not re-measure anything at all — it only changes which path is opaque, which
 * is a CSS transition on an already-computed `d`.
 */
export function EvidenceConnector({
  containerRef,
  leftPaneRef,
  rightPaneRef,
  getAnchors,
  activeClaimId,
  enabled,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  leftPaneRef: React.RefObject<HTMLDivElement | null>;
  rightPaneRef: React.RefObject<HTMLDivElement | null>;
  /** Resolves a claim's two endpoints. Getters rather than elements because
   * anchors attach during commit — and, on this surface, only once the terminal
   * playback has printed the bullet they sit on. See the rAF retry below. */
  getAnchors: (claimId: string) => { from: HTMLElement | null; to: HTMLElement | null };
  activeClaimId: string;
  /** False below the width where the curves have room to read (see ResumeWorkspace). */
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
      const leftPane = leftPaneRef.current;
      const rightPane = rightPaneRef.current;
      if (!container || !leftPane || !rightPane) {
        if (attempts++ < MAX_ANCHOR_FRAMES) rafId = requestAnimationFrame(compute);
        return;
      }

      const resolved = CLAIMS.map((claim) => ({ claim, ...getAnchors(claim.id) }));

      // Host refs attach during React's bottom-up commit, and this surface has
      // a second delay on top of that: the left pane's claim buttons only exist
      // once the terminal playback has printed their bullets. Retry across
      // frames — bounded, and self-terminating the moment every anchor is in
      // place — rather than giving up the first time one is missing.
      if (resolved.some((r) => !r.from || !r.to)) {
        if (attempts++ < MAX_ANCHOR_FRAMES) rafId = requestAnimationFrame(compute);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const leftRect = leftPane.getBoundingClientRect();
      const rightRect = rightPane.getBoundingClientRect();
      const rel = (x: number, y: number): Point => ({
        x: x - containerRect.left,
        y: y - containerRect.top,
      });

      const next: Wire[] = [];
      for (const { claim, from, to } of resolved) {
        const fromRect = from!.getBoundingClientRect();
        const toRect = to!.getBoundingClientRect();
        const fromY = fromRect.top + fromRect.height / 2;
        const toY = toRect.top + toRect.height / 2;

        // Per-line clipping: one claim scrolling out of view drops only its own
        // wire, leaving the rest of the set intact.
        if (fromY < leftRect.top || fromY > leftRect.bottom) continue;
        if (toY < rightRect.top || toY > rightRect.bottom) continue;

        next.push({
          id: claim.id,
          color: claim.color,
          d: horizontalPath(rel(fromRect.right, fromY), rel(toRect.left, toY)),
        });
      }
      setWires(next);
    };

    compute();

    // A resize of either pane covers the divider drag too — dragging the
    // ResizeHandle is what changes those widths, so no separate drag hook is
    // needed to keep the lines attached while the visitor is dragging.
    const observer = new ResizeObserver(compute);
    if (containerRef.current) observer.observe(containerRef.current);
    if (leftPaneRef.current) observer.observe(leftPaneRef.current);
    if (rightPaneRef.current) observer.observe(rightPaneRef.current);

    const left = leftPaneRef.current;
    const right = rightPaneRef.current;
    left?.addEventListener('scroll', compute, { passive: true });
    right?.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute, { passive: true });

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      observer.disconnect();
      left?.removeEventListener('scroll', compute);
      right?.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
    // `activeClaimId` is deliberately absent: which line is bright is a paint
    // concern, not a geometry one, so hovering must not trigger a re-measure.
  }, [enabled, getAnchors, containerRef, leftPaneRef, rightPaneRef]);

  if (wires.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      style={{ overflow: 'visible' }}
    >
      {wires.map((wire) => {
        const isActive = wire.id === activeClaimId;
        return (
          <path
            key={wire.id}
            d={wire.d}
            fill="none"
            stroke={wire.color}
            strokeWidth={1}
            strokeOpacity={isActive ? ACTIVE_OPACITY : IDLE_OPACITY}
            // Active last in paint order would need a re-sort; instead the
            // opacity gap does the work, so the DOM order can stay stable and
            // React never reorders these nodes.
            className="evidence-connector-line"
          />
        );
      })}
    </svg>
  );
}
