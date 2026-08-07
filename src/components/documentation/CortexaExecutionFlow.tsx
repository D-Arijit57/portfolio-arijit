import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CortexaTerminalPanel } from './CortexaTerminalPanel';
import { CortexaProblemTerminal } from './CortexaProblemTerminal';
import { CortexaDecisionTerminal } from './CortexaDecisionTerminal';
import { CortexaConnectors } from './CortexaConnectors';
import { ExecutionReplayTerminal } from './ExecutionReplayTerminal';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import { DECISIONS, type DecisionId } from '../../content/cortexaNarrative';
import type { DocumentationFrontmatter } from '../../documentation/types';

const ACCENT = '#38BDF8';
const MUTED = '#9CA3AF';

const SESSION_KEY = 'cortexa-shell-sequence';

// Every value here is a handoff, not a pause for effect. problem.sh needs a
// beat to actually be read before it emits its constraint; each terminal
// then waits for its incoming wire to physically land (the connector's own
// onAnimationEnd, not a guessed timer) before it wakes; and a woken
// terminal brightens from dormant before it starts producing output.
const PROBLEM_READ_MS = 600;
const BRIGHTEN_MS = 250;
const DECISION_ROW_MS = 70;
const SCROLL_INDICATOR_MS = 500;

type Stage =
  | 'problem'
  | 'constraint-wire'
  | 'decisions-waking'
  | 'decisions'
  | 'execution-wire'
  | 'execution-waking'
  | 'execution'
  | 'done';

const STAGE_ORDER: Stage[] = [
  'problem',
  'constraint-wire',
  'decisions-waking',
  'decisions',
  'execution-wire',
  'execution-waking',
  'execution',
  'done',
];

/**
 * cortexa.md's three-terminal narrative, as one dependency chain rather
 * than three widgets that animate in order:
 *
 *   problem.sh  ──▶  cortexa.sh      (the constraint, across the top row)
 *                         │
 *                         ▼
 *                   run-cortexa      (the decisions, into the terminal below)
 *
 * The composition is restacked from the original side-by-side arrangement
 * for a concrete reason: with problem.sh and cortexa.sh stacked in one
 * column, the pair measured 728px against a ~463px editor viewport, so the
 * middle of the chain always fell below the fold and revealed itself where
 * nobody could watch. Side by side, the top row is ~330px and the whole
 * chain is legible in the first screen — which is what makes the sequencing
 * below worth having at all.
 *
 * Signal semantics, strictly: a terminal is dormant until its incoming wire
 * has *finished drawing*; the wire only starts once its upstream terminal
 * has genuinely completed; a woken terminal brightens before it produces
 * output. Nothing is chained on a guessed duration.
 *
 * run-cortexa additionally waits until it's scrolled into view — it's the
 * only terminal that starts below the fold, and being last in the chain it
 * can wait without blocking anything. If the reader scrolls past it
 * mid-replay, the remaining events finish at an accelerated rate rather
 * than pausing, so nobody ever scrolls back to a half-built terminal.
 *
 * `skip` (reduced motion, or already played this session) renders the whole
 * chain at its final state — fully readable and fully interactive with no
 * animation at all.
 */
export function CortexaExecutionFlow({
  frontmatter,
  fileName,
}: {
  frontmatter: DocumentationFrontmatter;
  fileName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const executionRef = useRef<HTMLDivElement>(null);

  const skip = useRef(prefersReducedMotion() || hasAnimated(SESSION_KEY)).current;
  const [stage, setStage] = useState<Stage>(() => (skip ? 'done' : 'problem'));
  const [problemVisible, setProblemVisible] = useState(skip);
  const [decisionsRevealed, setDecisionsRevealed] = useState(() => (skip ? DECISIONS.length : 0));
  const [scrollIndicatorVisible, setScrollIndicatorVisible] = useState(skip);
  const [activeDecision, setActiveDecision] = useState<DecisionId | null>(null);

  // run-cortexa is the only terminal that begins below the fold, so it's the
  // only one whose start is gated on being seen. `useInViewOnce` latches, so
  // scrolling away afterward never rewinds it.
  const { ref: executionInViewRef, inView: executionInView } = useInViewOnce<HTMLDivElement>(0.1);
  const [executionPassed, setExecutionPassed] = useState(false);

  const stageAtLeast = useCallback(
    (target: Stage) => STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(target),
    [stage],
  );

  useEffect(() => {
    if (!skip) markAnimated(SESSION_KEY);
  }, [skip]);

  // problem.sh fades in, is read, then emits its constraint — which is what
  // releases the first wire.
  useEffect(() => {
    if (skip) return undefined;
    setProblemVisible(true);
    const timer = window.setTimeout(() => setStage((s) => (s === 'problem' ? 'constraint-wire' : s)), PROBLEM_READ_MS);
    return () => window.clearTimeout(timer);
  }, [skip]);

  // Each "waking" stage is the 250ms brighten from dormant to active. Output
  // only begins once the terminal is fully lit.
  useEffect(() => {
    if (skip || stage !== 'decisions-waking') return undefined;
    const timer = window.setTimeout(() => setStage('decisions'), BRIGHTEN_MS);
    return () => window.clearTimeout(timer);
  }, [stage, skip]);

  useEffect(() => {
    if (skip || stage !== 'execution-waking') return undefined;
    const timer = window.setTimeout(() => setStage('execution'), BRIGHTEN_MS);
    return () => window.clearTimeout(timer);
  }, [stage, skip]);

  // Decision rows reveal one at a time; the last one releases the second
  // wire, so the replay genuinely follows the decisions it's evidence for.
  useEffect(() => {
    if (skip || stage !== 'decisions') return undefined;
    const timers = DECISIONS.map((_, index) =>
      window.setTimeout(() => {
        setDecisionsRevealed(index + 1);
        if (index === DECISIONS.length - 1) setStage('execution-wire');
      }, index * DECISION_ROW_MS),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [stage, skip]);

  // Has the reader scrolled the execution terminal back off-screen while it
  // was still building? Then let it finish fast rather than stall.
  useEffect(() => {
    if (skip || !executionInView) return undefined;
    const node = executionRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setExecutionPassed(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [skip, executionInView]);

  const handleConstraintDrawn = useCallback(
    () => setStage((s) => (s === 'constraint-wire' ? 'decisions-waking' : s)),
    [],
  );
  const handleDecisionsDrawn = useCallback(
    () => setStage((s) => (s === 'execution-wire' ? 'execution-waking' : s)),
    [],
  );
  const handleReplayComplete = useCallback(() => {
    if (skip) return;
    setStage('done');
    window.setTimeout(() => setScrollIndicatorVisible(true), SCROLL_INDICATOR_MS);
  }, [skip]);

  return (
    <div ref={containerRef} className="relative">
      {/* Top row — the two shells that produce the argument, side by side so
          the whole chain clears the fold. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <CortexaProblemTerminal
          problemRef={problemRef}
          visible={problemVisible}
          constraintVisible={skip || stageAtLeast('constraint-wire')}
          skip={skip}
        />
        <CortexaDecisionTerminal
          solutionRef={solutionRef}
          revealedCount={decisionsRevealed}
          skip={skip}
          dormant={!skip && !stageAtLeast('decisions-waking')}
          activeDecision={activeDecision}
          onHoverDecision={setActiveDecision}
        />
      </div>

      {/* The evidence, full width beneath — the replay's timestamped rows
          were the most width-starved content on the page. */}
      <div ref={executionInViewRef} className="mt-6">
        <CortexaTerminalPanel
          ref={executionRef}
          fileName="./run-cortexa"
          dormant={!skip && !stageAtLeast('execution-waking')}
          headerExtra={
            <span className="font-mono text-[11px]" style={{ color: MUTED }}>
              --replay session/2f9c1a
            </span>
          }
        >
          <ExecutionReplayTerminal
            start={stageAtLeast('execution') && (skip || executionInView)}
            skip={skip}
            accelerated={executionPassed}
            frontmatter={frontmatter}
            fileName={fileName}
            activeDecision={activeDecision}
            onHoverDecision={setActiveDecision}
            onReplayComplete={handleReplayComplete}
          />
        </CortexaTerminalPanel>
      </div>

      <CortexaConnectors
        containerRef={containerRef}
        problemRef={problemRef}
        solutionRef={solutionRef}
        executionRef={executionRef}
        constraintDrawn={skip || stageAtLeast('constraint-wire')}
        decisionsDrawn={skip || stageAtLeast('execution-wire')}
        linkActive={activeDecision !== null}
        onConstraintDrawn={handleConstraintDrawn}
        onDecisionsDrawn={handleDecisionsDrawn}
      />

      <div
        className="mt-16 flex flex-col items-center gap-3 text-center"
        style={{ opacity: scrollIndicatorVisible ? 1 : 0, transition: skip ? 'none' : 'opacity 350ms ease-out' }}
      >
        <p className="font-mono text-[13px]" style={{ color: MUTED }}>
          Want to inspect the architecture?
        </p>
        <p className="font-mono text-[13px] font-medium" style={{ color: ACCENT }}>
          Scroll Down
        </p>
        <ChevronDown size={16} className={scrollIndicatorVisible ? 'discovery-arrow-float' : ''} style={{ color: ACCENT }} />
      </div>
    </div>
  );
}
