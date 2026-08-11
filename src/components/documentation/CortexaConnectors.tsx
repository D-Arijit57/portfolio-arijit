import React, { useLayoutEffect, useState } from 'react';

// Kept at cortexa.md's original wire colour, not the app-wide `#569cd6`
// prompt-blue every other blue text on this page reverted to — this
// component's own drop-shadow glow below is a hardcoded `rgba(56,189,248,…)`
// (the decimal form of `#38BDF8`), so the wire's stroke has to stay that
// same blue or the glow reads as a mismatched colour around the line.
const ACCENT = '#38BDF8';

// Where the wire meets run-cortexa: a fixed distance below that panel's top
// edge, never a proportion of its height. The execution terminal grows
// downward as replay lines print, and anchoring proportionally would drag
// this endpoint ~150px down with it. The connector represents a logical
// dependency, not a physical attachment to content height — so it stays
// perfectly still while the terminal builds beneath it.
const EXECUTION_ANCHOR_OFFSET = 26;

interface Point {
  x: number;
  y: number;
}

interface Wire {
  d: string;
  from: Point;
  to: Point;
}

interface ConnectorGeometry {
  problemToSolution?: Wire;
  solutionToExecution?: Wire;
}

/** Horizontal S-curve — control points pushed out along x, for the
 * side-by-side hop from problem.sh to cortexa.sh. */
function horizontalPath(from: Point, to: Point): string {
  const midX = from.x + (to.x - from.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

/** Vertical S-curve — control points pushed out along y, for the drop from
 * cortexa.sh down into the full-width execution terminal. */
function verticalPath(from: Point, to: Point): string {
  const midY = from.y + (to.y - from.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

/**
 * The two wires carrying cortexa.md's narrative: problem.sh → cortexa.sh
 * (the constraint, now a horizontal hop across the top row) and
 * cortexa.sh → run-cortexa (the decisions, now a vertical drop into the
 * full-width execution terminal below).
 *
 * Signal traces, not flowchart arrows. Each wire terminates in a small
 * connection dot seated on the panel border it meets. Direction isn't lost
 * by dropping arrowheads: the layout encodes it (left → right, then top →
 * bottom) and the draw animation traces source → target on first view.
 *
 * Timing is the point. A wire only draws once its upstream terminal has
 * genuinely finished, and `onDrawComplete` fires when the stroke lands —
 * which is what wakes the downstream terminal. Nothing downstream brightens
 * before its signal has physically arrived. Glow is reserved for the draw
 * itself and for an active hover link, so it always reports something.
 *
 * `pending` is the one looping motion on the page, and it earns the
 * exception the same way: it reports a real state rather than running for
 * atmosphere. It means *this signal has been delivered and the terminal it
 * feeds has not produced output yet* — true only while run-cortexa sits
 * woken but unframed, and it stops the instant the replay begins. It
 * travels source → target, which is downward, which is where the reader
 * needs to go to see the output it's promising. See CortexaExecutionFlow's
 * STALL_MS for why it doesn't start the moment that state is entered.
 */
export function CortexaConnectors({
  containerRef,
  problemRef,
  solutionRef,
  executionRef,
  constraintDrawn,
  decisionsDrawn,
  linkActive,
  pending,
  onConstraintDrawn,
  onDecisionsDrawn,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  problemRef: React.RefObject<HTMLDivElement | null>;
  solutionRef: React.RefObject<HTMLDivElement | null>;
  executionRef: React.RefObject<HTMLDivElement | null>;
  constraintDrawn: boolean;
  decisionsDrawn: boolean;
  linkActive: boolean;
  /** Decisions delivered, replay not yet started — see the note above. */
  pending: boolean;
  onConstraintDrawn?: () => void;
  onDecisionsDrawn?: () => void;
}) {
  const [geometry, setGeometry] = useState<ConnectorGeometry>({});

  useLayoutEffect(() => {
    let observer: ResizeObserver | undefined;
    let rafId: number | undefined;

    const recompute = () => {
      const container = containerRef.current;
      const problem = problemRef.current?.getBoundingClientRect();
      const solution = solutionRef.current?.getBoundingClientRect();
      const execution = executionRef.current?.getBoundingClientRect();
      if (!container || !problem || !solution || !execution) return;

      const containerRect = container.getBoundingClientRect();
      const rel = (x: number, y: number): Point => ({ x: x - containerRect.left, y: y - containerRect.top });

      // Top row, left → right: problem.sh's right edge to cortexa.sh's left.
      const problemRight = rel(problem.right, problem.top + problem.height / 2);
      const solutionLeft = rel(solution.left, solution.top + solution.height / 2);

      // Top row → full-width terminal below: cortexa.sh's bottom edge down
      // to a fixed point just inside run-cortexa's top edge.
      const solutionBottom = rel(solution.left + solution.width / 2, solution.bottom);
      const executionArrival = rel(solution.left + solution.width / 2, execution.top + EXECUTION_ANCHOR_OFFSET);

      setGeometry({
        problemToSolution: {
          d: horizontalPath(problemRight, solutionLeft),
          from: problemRight,
          to: solutionLeft,
        },
        solutionToExecution: {
          d: verticalPath(solutionBottom, executionArrival),
          from: solutionBottom,
          to: executionArrival,
        },
      });
    };

    // Host-element refs attach during React's bottom-up commit-layout pass,
    // so a descendant's layout effect can run before an ancestor's ref is
    // set. Retry across frames rather than bailing for good.
    const setup = () => {
      if (!containerRef.current) {
        rafId = requestAnimationFrame(setup);
        return;
      }
      recompute();
      observer = new ResizeObserver(recompute);
      observer.observe(containerRef.current);
      [problemRef.current, solutionRef.current, executionRef.current].forEach((node) => node && observer!.observe(node));
      window.addEventListener('resize', recompute);
    };

    setup();

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [containerRef, problemRef, solutionRef, executionRef]);

  const renderWire = (
    wire: Wire | undefined,
    visible: boolean,
    lit: boolean,
    pulsing: boolean,
    onDrawComplete: (() => void) | undefined,
  ) => {
    if (!wire || !visible) return null;
    return (
      <g
        style={{
          filter: lit ? 'drop-shadow(0 0 5px rgba(56,189,248,0.55))' : undefined,
          transition: 'filter 150ms ease-out',
        }}
      >
        <path
          d={wire.d}
          pathLength={100}
          fill="none"
          stroke={ACCENT}
          strokeWidth={lit ? 2.25 : 1.5}
          strokeOpacity={lit ? 0.95 : 0.5}
          strokeDasharray="100"
          className="execution-wire-draw"
          style={{ transition: 'stroke-width 150ms ease-out, stroke-opacity 150ms ease-out' }}
          onAnimationEnd={onDrawComplete}
        />
        {/* The travelling pulse rides *over* the drawn wire rather than
            replacing it — the wire itself must stay solid, because it's
            still asserting a dependency that exists. A short dash on a
            pathLength=100 track (one 8-unit pulse per 100-unit period)
            reads as a packet moving down the trace; animating the whole
            dasharray would read as the wire redrawing itself, which would
            claim the decisions were being re-delivered. Deliberately quiet:
            no glow, half opacity, slower than the draw. */}
        {pulsing && (
          <path
            d={wire.d}
            pathLength={100}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2}
            strokeOpacity={0.5}
            strokeLinecap="round"
            strokeDasharray="8 92"
            className="execution-wire-pulse"
          />
        )}
        {[wire.from, wire.to].map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={lit ? 3.25 : 2.75}
            fill={ACCENT}
            fillOpacity={lit ? 1 : 0.75}
            style={{ transition: 'r 150ms ease-out, fill-opacity 150ms ease-out' }}
          />
        ))}
      </g>
    );
  };

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      {renderWire(geometry.problemToSolution, constraintDrawn, false, false, onConstraintDrawn)}
      {renderWire(geometry.solutionToExecution, decisionsDrawn, linkActive, pending, onDecisionsDrawn)}
    </svg>
  );
}
