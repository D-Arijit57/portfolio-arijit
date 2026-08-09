import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createDocumentationComponents } from './documentationComponents';
import { RakshachakraProblemTerminal } from './RakshachakraProblemTerminal';
import { RakshachakraSignalsTerminal, RAKSHACHAKRA_SIGNALS_COUNT } from './RakshachakraSignalsTerminal';
import { RakshachakraPipelineTerminal } from './RakshachakraPipelineTerminal';
import { RakshachakraConnectors } from './RakshachakraConnectors';
import { RakshachakraArchitectureSection } from './RakshachakraArchitectureSection';
import { resolveLinkTarget } from '../../documentation/resolveLinkTarget';
import { getFileById } from '../../content/fileSystem';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import type { DocumentationModel } from '../../documentation/types';

const SESSION_KEY = 'rakshachakra-execution-chain';

/** problem.sh needs a beat to be read before it emits its constraint —
 * Cortexa's own PROBLEM_READ_MS, reused rather than re-picked. */
const PROBLEM_READ_MS = 600;
/** The dormant → active brighten, run before a woken terminal produces
 * output — Cortexa's own BRIGHTEN_MS. */
const BRIGHTEN_MS = 250;
/** Cortexa's own DECISION_ROW_MS — how far apart each row of the top-right
 * terminal reveals. */
const SIGNAL_ROW_MS = 70;

type Stage = 'problem' | 'wire1' | 'signals-waking' | 'signals' | 'wire2' | 'pipeline-waking' | 'pipeline';

const STAGE_ORDER: Stage[] = ['problem', 'wire1', 'signals-waking', 'signals', 'wire2', 'pipeline-waking', 'pipeline'];

/**
 * Rakshachakra's own execution flow — Option D (user-approved 2026-08-10):
 * a 2-up top row (`problem.sh` | `signals.sh`) wired into a full-width
 * `./pipeline.sh`, then Architecture and Explore below. Mirrors
 * `CortexaExecutionFlow`'s stage-machine *shape* exactly (one `Stage` enum,
 * `stageAtLeast`, each step released by a real completion signal — a wire's
 * own `onAnimationEnd`, a terminal's last row finishing — never a timer
 * running in parallel with something else), not its content: no decision
 * log, no session replay, because that data doesn't exist for this project
 * (Phase 1 audit).
 *
 * Signal semantics, same rule as Cortexa's: `problem.sh` fades in and is
 * read (`PROBLEM_READ_MS`) → emits its constraint, which releases wire 1 →
 * wire 1 draws → `signals.sh` brightens (`BRIGHTEN_MS`) → its rows reveal
 * one at a time, the last one releasing wire 2 → wire 2 draws →
 * `pipeline.sh` brightens → its own internal 4-stage cascade begins **once
 * it's also been scrolled into view** (`RakshachakraPipelineTerminal`'s own
 * self-managed gate).
 *
 * Architecture and Explore are deliberately **not** part of this chain —
 * each is independently `useInViewOnce`-gated on its own scroll visibility
 * (`RakshachakraArchitectureSection` self-manages this; `ProjectExploreTerminal`
 * does too). Phase 2 verification proved that chaining a section a reader
 * can scroll straight to onto an upstream animation's completion leaves a
 * blank box for exactly that reader.
 */
export function RakshachakraDocFlow({ model, basePath }: { model: DocumentationModel; basePath: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const signalsRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);

  const skip = useRef(prefersReducedMotion() || hasAnimated(SESSION_KEY)).current;
  const [stage, setStage] = useState<Stage>(() => (skip ? 'pipeline' : 'problem'));
  const [problemVisible, setProblemVisible] = useState(skip);
  const [signalsRevealed, setSignalsRevealed] = useState(() => (skip ? RAKSHACHAKRA_SIGNALS_COUNT : 0));

  const stageAtLeast = useCallback((target: Stage) => STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(target), [stage]);

  useEffect(() => {
    if (!skip) markAnimated(SESSION_KEY);
  }, [skip]);

  // problem.sh fades in, is read, then emits its constraint — the only
  // timer in the whole chain that isn't released by a real completion
  // signal, same exception Cortexa's own chain makes for the same reason
  // (nothing produces the "I've been read" signal but a clock).
  useEffect(() => {
    if (skip) return undefined;
    setProblemVisible(true);
    const timer = window.setTimeout(() => setStage((s) => (s === 'problem' ? 'wire1' : s)), PROBLEM_READ_MS);
    return () => window.clearTimeout(timer);
  }, [skip]);

  useEffect(() => {
    if (skip || stage !== 'signals-waking') return undefined;
    const timer = window.setTimeout(() => setStage('signals'), BRIGHTEN_MS);
    return () => window.clearTimeout(timer);
  }, [stage, skip]);

  useEffect(() => {
    if (skip || stage !== 'pipeline-waking') return undefined;
    const timer = window.setTimeout(() => setStage('pipeline'), BRIGHTEN_MS);
    return () => window.clearTimeout(timer);
  }, [stage, skip]);

  // Signal rows reveal one at a time; the last one releases wire 2.
  useEffect(() => {
    if (skip || stage !== 'signals') return undefined;
    const timers = Array.from({ length: RAKSHACHAKRA_SIGNALS_COUNT }, (_, index) =>
      window.setTimeout(() => {
        setSignalsRevealed(index + 1);
        if (index === RAKSHACHAKRA_SIGNALS_COUNT - 1) setStage('wire2');
      }, index * SIGNAL_ROW_MS),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [stage, skip]);

  const handleWire1Drawn = useCallback(() => setStage((s) => (s === 'wire1' ? 'signals-waking' : s)), []);
  const handleWire2Drawn = useCallback(() => setStage((s) => (s === 'wire2' ? 'pipeline-waking' : s)), []);

  const wire1Visible = skip || stageAtLeast('wire1');
  const wire2Visible = skip || stageAtLeast('wire2');
  const pipelineActive = skip || stageAtLeast('pipeline');

  // Continue Exploring rendered through the same shared markdown pipeline
  // every doc uses, with `exploreTerminal` set so its detected link-card
  // list becomes `ProjectExploreTerminal`'s typed `$ tree .` instead of
  // `LinkFileList`'s row list — no hand-parsing of the real "Continue
  // Exploring" markdown, same mechanism Phase 2 already proved out.
  const components = useMemo(() => createDocumentationComponents(basePath, { exploreTerminal: {} }), [basePath]);
  const continueExploring = model.sections.find((section) => section.heading.toLowerCase() === 'continue exploring');

  // architecture.mmd is never presented as a document in this narrative —
  // only used, exactly like Continue Exploring's own link, as the handle
  // ArchitectureCanvas resolves through. Same resolveLinkTarget every
  // "Continue Exploring" target already goes through, not a second lookup.
  const architectureTarget = resolveLinkTarget('architecture.mmd', basePath);
  const architectureFile = architectureTarget.kind === 'internal' ? getFileById(architectureTarget.fileId) : undefined;

  return (
    <div ref={containerRef} className="relative flex flex-col">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <RakshachakraProblemTerminal
          problemRef={problemRef}
          visible={problemVisible}
          constraintVisible={skip || stageAtLeast('wire1')}
          skip={skip}
        />
        <RakshachakraSignalsTerminal
          signalsRef={signalsRef}
          revealedCount={signalsRevealed}
          skip={skip}
          dormant={!skip && !stageAtLeast('signals-waking')}
        />
      </div>

      <RakshachakraPipelineTerminal pipelineRef={pipelineRef} active={pipelineActive} skip={skip} />

      <RakshachakraConnectors
        containerRef={containerRef}
        problemRef={problemRef}
        signalsRef={signalsRef}
        pipelineRef={pipelineRef}
        wire1Visible={wire1Visible}
        wire2Visible={wire2Visible}
        onWire1Drawn={handleWire1Drawn}
        onWire2Drawn={handleWire2Drawn}
      />

      {architectureFile && <RakshachakraArchitectureSection file={architectureFile} />}

      {continueExploring && (
        <Markdown remarkPlugins={[remarkGfm]} components={components}>
          {continueExploring.bodyMarkdown}
        </Markdown>
      )}
    </div>
  );
}
