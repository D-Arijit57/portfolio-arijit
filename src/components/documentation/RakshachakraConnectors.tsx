import React, { useLayoutEffect, useState } from 'react';
import { ACCENT } from './ProjectTerminalPanel';

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
  problemToSignals?: Wire;
  signalsToPipeline?: Wire;
}

/** Horizontal S-curve — the side-by-side hop from problem.sh to
 * signals.sh, identical shape to CortexaConnectors' own `horizontalPath`. */
function horizontalPath(from: Point, to: Point): string {
  const midX = from.x + (to.x - from.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

/** Vertical S-curve — the drop from signals.sh into the full-width
 * pipeline below, identical shape to CortexaConnectors' own `verticalPath`. */
function verticalPath(from: Point, to: Point): string {
  const midY = from.y + (to.y - from.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

/**
 * The two wires carrying Rakshachakra's own top-row narrative:
 * problem.sh → signals.sh (horizontal, top row), signals.sh → pipeline.sh
 * (vertical, into the full-width terminal below).
 *
 * A **sibling** of `CortexaConnectors.tsx`, not a refactor of it: that
 * component's props (`constraintDrawn`/`decisionsDrawn`/`linkActive`/
 * `pending`) are Cortexa-semantic — `linkActive` in particular exists only
 * because Cortexa has a hover-driven decision↔evidence link, which this
 * page has no data to support, and `pending` exists only for
 * `run-cortexa`'s specific framing-gate stall. Reuses the *technique*
 * (measured `getBoundingClientRect()` geometry, `ResizeObserver`, the rAF
 * retry for refs that attach during React's own bottom-up commit pass,
 * `pathLength={100}` + `.execution-wire-draw` for a length-independent
 * one-shot draw) without importing Cortexa's file, so Cortexa stays
 * provably unchanged. Accepted duplication — extract only if a third page
 * needs wires.
 *
 * Unlike `run-cortexa`, `./pipeline.sh` doesn't grow after it's wired in
 * (see `RakshachakraPipelineTerminal`'s own comment — the layout is fixed
 * from mount, stages only change opacity), so there's no need for
 * `CortexaConnectors`' fixed anchor-offset-into-content trick: this wire
 * simply connects `signals.sh`'s bottom border to `pipeline.sh`'s top
 * border, the same "border to border" convention
 * `TerminalExecutionWire.tsx` (americanchase.yaml) already uses.
 */
export function RakshachakraConnectors({
  containerRef,
  problemRef,
  signalsRef,
  pipelineRef,
  wire1Visible,
  wire2Visible,
  onWire1Drawn,
  onWire2Drawn,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  problemRef: React.RefObject<HTMLDivElement | null>;
  signalsRef: React.RefObject<HTMLDivElement | null>;
  pipelineRef: React.RefObject<HTMLDivElement | null>;
  /** The upstream terminal has genuinely finished — draw this wire. */
  wire1Visible: boolean;
  wire2Visible: boolean;
  onWire1Drawn?: () => void;
  onWire2Drawn?: () => void;
}) {
  const [geometry, setGeometry] = useState<ConnectorGeometry>({});

  useLayoutEffect(() => {
    let observer: ResizeObserver | undefined;
    let rafId: number | undefined;

    const recompute = () => {
      const container = containerRef.current;
      const problem = problemRef.current?.getBoundingClientRect();
      const signals = signalsRef.current?.getBoundingClientRect();
      const pipeline = pipelineRef.current?.getBoundingClientRect();
      if (!container || !problem || !signals || !pipeline) return;

      const containerRect = container.getBoundingClientRect();
      const rel = (x: number, y: number): Point => ({ x: x - containerRect.left, y: y - containerRect.top });

      // Top row, left → right: problem.sh's right edge to signals.sh's left.
      const problemRight = rel(problem.right, problem.top + problem.height / 2);
      const signalsLeft = rel(signals.left, signals.top + signals.height / 2);

      // Top row → full-width terminal below: signals.sh's bottom-centre
      // down to pipeline.sh's top-centre (border to border — see comment
      // above for why this doesn't need a fixed content offset).
      const signalsBottom = rel(signals.left + signals.width / 2, signals.bottom);
      const pipelineTop = rel(pipeline.left + pipeline.width / 2, pipeline.top);

      setGeometry({
        problemToSignals: { d: horizontalPath(problemRight, signalsLeft), from: problemRight, to: signalsLeft },
        signalsToPipeline: { d: verticalPath(signalsBottom, pipelineTop), from: signalsBottom, to: pipelineTop },
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
      [problemRef.current, signalsRef.current, pipelineRef.current].forEach((node) => node && observer!.observe(node));
      window.addEventListener('resize', recompute);
    };

    setup();

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [containerRef, problemRef, signalsRef, pipelineRef]);

  const renderWire = (wire: Wire | undefined, visible: boolean, onDrawComplete: (() => void) | undefined) => {
    if (!wire || !visible) return null;
    return (
      <g>
        <path
          d={wire.d}
          pathLength={100}
          fill="none"
          stroke={ACCENT}
          strokeWidth={1.5}
          strokeOpacity={0.7}
          strokeDasharray="100"
          className="execution-wire-draw"
          onAnimationEnd={onDrawComplete}
        />
        {[wire.from, wire.to].map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={2.75} fill={ACCENT} fillOpacity={0.9} />
        ))}
      </g>
    );
  };

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      {renderWire(geometry.problemToSignals, wire1Visible, onWire1Drawn)}
      {renderWire(geometry.signalsToPipeline, wire2Visible, onWire2Drawn)}
    </svg>
  );
}
