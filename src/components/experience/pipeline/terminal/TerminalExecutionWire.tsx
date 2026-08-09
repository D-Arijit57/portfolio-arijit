import React, { useLayoutEffect, useState } from 'react';
import { PROMPT_ACCENT } from './ExperienceTerminalPanel';
import { RULE } from '../tokens';

export type WireState = 'dormant' | 'drawing' | 'transferring' | 'idle';

interface Point {
  x: number;
  y: number;
}

/** Vertical S-curve — control points pushed out along y. Identical to
 * CortexaConnectors' own `verticalPath`: with the two terminals stacked
 * full-width it degenerates to a straight drop, which is correct, but the
 * curve form is kept so an off-centre layout would still route cleanly. */
function verticalPath(from: Point, to: Point): string {
  const midY = from.y + (to.y - from.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

/**
 * The execution channel between Terminal 1 and Terminal 2 — the American
 * Chase version of cortexa.md's connector language, not a new one.
 *
 * What is reused, deliberately and specifically: the measured-geometry
 * approach (both endpoints read off real `getBoundingClientRect`s relative
 * to a shared container, re-measured through a ResizeObserver, with the
 * rAF retry that works around host refs attaching during React's bottom-up
 * commit pass); `pathLength={100}` + `strokeDasharray="100"` so draw speed
 * is independent of the wire's real length; the `.execution-wire-draw`
 * one-shot draw; the `wire-pulse-travel` keyframe for the travelling
 * packet; the connection dot seated on each panel border; and — the part
 * that actually matters — the rule that the wire's own `animationend` is
 * what advances the chain, so nothing downstream is ever chained on a
 * guessed duration.
 *
 * Two paths, not one. The faint `track` is always present: the channel
 * between the two processes exists structurally before anything flows
 * through it, which is what lets the connector read as subdued-but-there
 * while Terminal 2 is dormant rather than appearing from nowhere. The
 * bright path draws over it when execution is handed off, and the pulse
 * rides over *that* — the drawn wire stays solid underneath, because it is
 * still asserting a dependency that exists.
 */
export function TerminalExecutionWire({
  containerRef,
  fromRef,
  toRef,
  state,
  onDrawComplete,
  onTransferComplete,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  fromRef: React.RefObject<HTMLDivElement | null>;
  toRef: React.RefObject<HTMLDivElement | null>;
  state: WireState;
  onDrawComplete?: () => void;
  onTransferComplete?: () => void;
}) {
  const [wire, setWire] = useState<{ d: string; from: Point; to: Point } | null>(null);

  useLayoutEffect(() => {
    let observer: ResizeObserver | undefined;
    let rafId: number | undefined;

    const recompute = () => {
      const container = containerRef.current;
      const from = fromRef.current?.getBoundingClientRect();
      const to = toRef.current?.getBoundingClientRect();
      if (!container || !from || !to) return;

      const rect = container.getBoundingClientRect();
      const rel = (x: number, y: number): Point => ({ x: x - rect.left, y: y - rect.top });

      // Terminal 1's bottom border down to Terminal 2's top border — the
      // dot sits *on* each border rather than inside the panel, so the
      // wire never overlaps either terminal's own content.
      const start = rel(from.left + from.width / 2, from.bottom);
      const end = rel(to.left + to.width / 2, to.top);

      setWire({ d: verticalPath(start, end), from: start, to: end });
    };

    const setup = () => {
      if (!containerRef.current) {
        rafId = requestAnimationFrame(setup);
        return;
      }
      recompute();
      observer = new ResizeObserver(recompute);
      observer.observe(containerRef.current);
      [fromRef.current, toRef.current].forEach((node) => node && observer!.observe(node));
      window.addEventListener('resize', recompute);
    };

    setup();

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [containerRef, fromRef, toRef]);

  if (!wire) return null;

  const live = state !== 'dormant';

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      {/* The channel itself — present before, during and after execution. */}
      <path d={wire.d} fill="none" stroke={RULE} strokeWidth={1} strokeOpacity={0.9} />

      {live && (
        <>
          <path
            d={wire.d}
            pathLength={100}
            fill="none"
            stroke={PROMPT_ACCENT}
            strokeWidth={1.5}
            strokeOpacity={state === 'idle' ? 0.45 : 0.8}
            strokeDasharray="100"
            className={state === 'drawing' ? 'execution-wire-draw' : undefined}
            style={{ transition: 'stroke-opacity 250ms ease-out' }}
            onAnimationEnd={state === 'drawing' ? onDrawComplete : undefined}
          />

          {/* The travelling packet. Mounted only while the handoff is in
              flight; its own animationend is what wakes Terminal 2, and
              unmounting it afterward is what guarantees nothing is left
              looping once the page has settled. */}
          {state === 'transferring' && (
            <path
              d={wire.d}
              pathLength={100}
              fill="none"
              stroke={PROMPT_ACCENT}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="8 92"
              className="execution-wire-transfer"
              onAnimationEnd={onTransferComplete}
            />
          )}
        </>
      )}

      {[wire.from, wire.to].map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={live ? 3 : 2.5}
          fill={live ? PROMPT_ACCENT : RULE}
          fillOpacity={live ? 1 : 0.9}
          style={{ transition: 'r 250ms ease-out, fill-opacity 250ms ease-out' }}
        />
      ))}
    </svg>
  );
}
