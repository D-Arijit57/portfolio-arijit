import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ProjectTerminalPanel, ACCENT, MUTED, TEXT } from './ProjectTerminalPanel';

const DIM = '#6B7280';

/** Overlaps with the pulse's own 220ms travel so the unlock reads as one
 * continuous process, not four separate reveals — the same reasoning
 * americanchase.yaml's own Terminal 2 dwell/pulse pair uses. */
const STAGE_DWELL_MS = 220;
const PULSE_DURATION_S = 0.22;
const WIDE_BREAKPOINT_PX = 640;

interface Stage {
  id: string;
  number: string;
  label: string;
  detail: string;
  /** `#`-prefixed lines, the same treatment `cortexaNarrative.ts`'s
   * `TRADEOFF_NOTE` gets inside `cortexa.sh` — an accepted tradeoff
   * attached to the stage it qualifies, never its own panel. */
  comment?: string[];
  /** A single dim, non-`#` annotation — secondary capability context that
   * would be noise as its own stage. */
  note?: string;
}

/**
 * Every line here is traced to `content/architecture/rakshachakra.ts`.
 * Paraphrased for caption length (the model's own prose is written as
 * "Business domain governing X", not as a display caption) but asserts
 * nothing the model doesn't — the same relationship `cortexaNarrative.ts`'s
 * hand-authored `DECISIONS`/`PROBLEM_BLOCKS` have to their own source facts.
 * `sensor_capture → feature_extraction` isn't a graph edge (there's a
 * `flutter_app`/`firebase_firestore` hop between them); the pipeline order
 * instead follows `feature_extraction.description`'s own wording:
 * "transformation of raw sensor/interaction events" — read as the intended
 * behavior, not as an invented dependency edge.
 */
const STAGES: Stage[] = [
  {
    id: 'signals',
    number: '01',
    label: 'signals',
    // sensor_capture.description
    detail: 'touch, motion, and device-state signals captured continuously',
  },
  {
    id: 'extraction',
    number: '02',
    label: 'extraction',
    // feature_extraction.description
    detail: 'raw events transformed into 25+ behavioral features',
  },
  {
    id: 'risk',
    number: '03',
    label: 'risk',
    // risk_scoring.description; "enrolled baseline" = profile_initialization
    detail: 'features scored against the enrolled baseline to produce a live risk score',
    // risk_scoring.tradeoffs, verbatim, wrapped — nothing added or removed
    comment: [
      "tradeoff: exact model architecture and scoring",
      "thresholds aren't specified in the current source",
      "material — represented as a domain boundary rather",
      "than an implementation, to avoid inventing a",
      "mechanism that hasn't been confirmed.",
    ],
    // model_retraining.description
    note: 'model retrained periodically as usage evolves',
  },
  {
    id: 'response',
    number: '04',
    label: 'response',
    // adaptive_response.description; biometric = security_center.responsibilities
    detail: 'allow, step-up, or lock — chosen for the current risk score (step-up includes biometric)',
  },
];

function PipelineStageBox({ stage, dormant, active }: { stage: Stage; dormant: boolean; active: boolean }) {
  return (
    <div className="min-w-0 flex-1" style={{ opacity: dormant ? 0.32 : 1, transition: 'opacity 250ms ease-out' }}>
      <div className="truncate">
        <span style={{ color: active ? ACCENT : MUTED }}>[{stage.number}]</span>{' '}
        <span style={{ color: active ? '#FFFFFF' : TEXT }}>{stage.label}</span>
        {active && (
          <span className="typing-reveal-cursor ml-1.5 inline-block h-[11px] w-[6px] align-baseline" style={{ backgroundColor: TEXT }} />
        )}
      </div>
      <div className="mt-1.5 pr-3 text-[12px] leading-[1.5]" style={{ color: MUTED }}>
        {stage.detail}
      </div>
      {stage.comment && (
        <div className="mt-2 text-[11px] leading-[1.4]" style={{ color: DIM }}>
          {stage.comment.map((line) => (
            <p key={line}>
              <span>#</span> {line}
            </p>
          ))}
        </div>
      )}
      {stage.note && (
        <p className="mt-2 text-[11px] leading-[1.4]" style={{ color: DIM }}>
          {stage.note}
        </p>
      )}
    </div>
  );
}

/** The travelling packet between two stages — a Motion-driven dot rather
 * than a CSS keyframe (index.css's own `.pipeline-pulse-x` is scoped to
 * americanchase.yaml's palette via a hardcoded colour; Motion keeps this
 * self-contained and matches how every other Cortexa-grammar file already
 * animates, via `motion/react`, not new global keyframes). */
function PipelineConnector({
  horizontal,
  lit,
  pulsing,
  onPulseEnd,
}: {
  horizontal: boolean;
  lit: boolean;
  pulsing: boolean;
  onPulseEnd: () => void;
}) {
  const trackColor = lit ? ACCENT : 'rgba(255,255,255,.08)';
  const dot = (
    <motion.span
      className="absolute h-[5px] w-[5px] rounded-full"
      style={{ backgroundColor: ACCENT, boxShadow: `0 0 4px ${ACCENT}` }}
      initial={horizontal ? { left: '0%', top: '50%', y: '-50%', opacity: 0 } : { top: '0%', left: '50%', x: '-50%', opacity: 0 }}
      animate={
        horizontal
          ? { left: '100%', top: '50%', y: '-50%', opacity: [0, 1, 1, 0] }
          : { top: '100%', left: '50%', x: '-50%', opacity: [0, 1, 1, 0] }
      }
      transition={{ duration: PULSE_DURATION_S, ease: 'easeOut', times: [0, 0.15, 0.85, 1] }}
      onAnimationComplete={onPulseEnd}
    />
  );

  if (horizontal) {
    return (
      <div className="relative flex min-w-[20px] shrink-0 grow items-center px-1" aria-hidden="true">
        <div className="h-px w-full" style={{ backgroundColor: trackColor, opacity: lit ? 0.6 : 1, transition: 'background-color 200ms ease-out' }} />
        {pulsing && dot}
      </div>
    );
  }

  return (
    <div className="relative flex h-6 items-center justify-center" aria-hidden="true">
      <div className="h-full w-px" style={{ backgroundColor: trackColor, opacity: lit ? 0.6 : 1, transition: 'background-color 200ms ease-out' }} />
      {pulsing && dot}
    </div>
  );
}

/**
 * ./pipeline.sh — the primary technical story, replacing what would
 * otherwise have been a separate `./core-features.sh` list. Three of
 * Rakshachakra's six real Core Features (extraction/risk/response) already
 * are these three stages; representing them again as a card list would be
 * exactly the "told the same story twice" failure the Phase 1 audit found.
 *
 * Structurally the americanchase.yaml Terminal 2 pattern (stage-by-stage
 * unlock, a pulse released only by the previous stage's own
 * `onAnimationComplete`, never a parallel timer) recolored to this page's
 * Cortexa palette — that pattern already *is* "Cortexa's dependency model"
 * applied to a horizontal stage row, so this reuses the technique rather
 * than re-deriving it.
 *
 * `active`/`running` mirror the same dual gate `ExperienceTerminalTwo` and
 * `RakshachakraArchitectureSection` both use: `active` is the wire having
 * physically landed (panel brightens, shows a waiting cursor); `running` is
 * the reader having scrolled this terminal into view. The cascade needs
 * both. Architecture and Explore, downstream, are deliberately **not**
 * chained to this terminal's own completion — Phase 2 verification proved
 * that chaining a reachable section to an upstream animation leaves a blank
 * box for a reader who scrolls straight to it.
 *
 * `skip` comes from the parent rather than being computed here — matching
 * `CortexaExecutionFlow`'s own pattern exactly: ONE `skip` is decided once
 * at the top of the whole chain and threaded into every terminal in it
 * (`CortexaProblemTerminal`/`CortexaDecisionTerminal`/`ExecutionReplayTerminal`
 * all take `skip` as a prop, none compute their own). A first draft of this
 * component computed its own independent `hasAnimated` check instead, which
 * would let this terminal and `RakshachakraProblemTerminal` desync (e.g. a
 * session-storage clear mid-visit skipping one but not the other) — fixed
 * before wiring the orchestrator.
 *
 * The scroll-visibility gate is self-managed (a plain `IntersectionObserver`
 * on `pipelineRef.current` itself, the same ref the orchestrator's
 * connectors already use to measure this panel) rather than taken as a
 * `running` prop from the parent — avoids the parent needing to merge two
 * refs onto one DOM node, and matches `RakshachakraArchitectureSection`'s
 * own self-contained gate exactly.
 */
export function RakshachakraPipelineTerminal({
  pipelineRef,
  active,
  skip,
}: {
  pipelineRef: React.RefObject<HTMLDivElement | null>;
  active: boolean;
  skip: boolean;
}) {
  const instant = skip;

  const [unlocked, setUnlocked] = useState(instant ? STAGES.length : 0);
  const [pulsing, setPulsing] = useState<number | null>(null);
  const [horizontal, setHorizontal] = useState(true);
  const [inView, setInView] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const complete = unlocked >= STAGES.length;
  const running = instant || inView;

  // Latches once visible — a reader who scrolls away afterward shouldn't
  // rewind an already-started cascade. Not gated on `active` first: the
  // panel can be observed for visibility regardless of whether the wire has
  // landed yet, same as `RakshachakraArchitectureSection`'s own observer.
  useEffect(() => {
    if (instant || inView) return undefined;
    const node = pipelineRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [instant, inView, pipelineRef]);

  // First stage runs once the wire has landed and the reader can see it.
  useEffect(() => {
    if (instant || !running || unlocked > 0) return;
    setUnlocked(1);
  }, [instant, running, unlocked]);

  // A stage finishes → send its packet to the next. The packet's own
  // animationend is what unlocks the far side (handlePulseEnd below).
  useEffect(() => {
    if (instant || !active || unlocked === 0 || complete || pulsing !== null) return undefined;
    const timer = window.setTimeout(() => setPulsing(unlocked - 1), STAGE_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [instant, active, unlocked, complete, pulsing]);

  const handlePulseEnd = () => {
    setPulsing(null);
    setUnlocked((count) => Math.min(count + 1, STAGES.length));
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width === 0) return;
      setHorizontal(width >= WIDE_BREAKPOINT_PX);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={pipelineRef} className="mt-6">
      <ProjectTerminalPanel fileName="./pipeline.sh" dormant={!active}>
        <div ref={containerRef}>
          {!active ? (
            <span className="typing-reveal-cursor inline-block h-[13px] w-[7px]" style={{ backgroundColor: TEXT }} />
          ) : (
            <div className={horizontal ? 'flex w-full items-start' : 'flex w-full flex-col'}>
              {STAGES.map((stage, i) => (
                <React.Fragment key={stage.id}>
                  <PipelineStageBox stage={stage} dormant={i >= unlocked} active={!complete && i === unlocked - 1} />
                  {i < STAGES.length - 1 && (
                    <PipelineConnector
                      horizontal={horizontal}
                      lit={i < unlocked - 1}
                      pulsing={pulsing === i}
                      onPulseEnd={handlePulseEnd}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </ProjectTerminalPanel>
    </div>
  );
}
