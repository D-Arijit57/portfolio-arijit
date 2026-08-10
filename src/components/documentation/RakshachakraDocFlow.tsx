import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createDocumentationComponents } from './documentationComponents';
import { RakshachakraProblemTerminal } from './RakshachakraProblemTerminal';
import { RakshachakraSignalsTerminal } from './RakshachakraSignalsTerminal';
import { RakshachakraSessionTerminal } from './RakshachakraSessionTerminal';
import { RakshachakraConnectors } from './RakshachakraConnectors';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import type { DocumentationModel } from '../../documentation/types';

const SESSION_KEY = 'rakshachakra-execution-chain';

/** problem.sh needs a beat to be read before it emits its constraint —
 * Cortexa's own PROBLEM_READ_MS, reused rather than re-picked. */
const PROBLEM_READ_MS = 600;
/** The dormant → active brighten, run before a woken terminal produces
 * output — Cortexa's own BRIGHTEN_MS. */
const BRIGHTEN_MS = 250;

type Stage = 'problem' | 'wire1' | 'signals-waking' | 'signals' | 'wire2' | 'session-waking' | 'session';

const STAGE_ORDER: Stage[] = ['problem', 'wire1', 'signals-waking', 'signals', 'wire2', 'session-waking', 'session'];

/**
 * Rakshachakra's own execution flow — Connector Correction revision
 * (user-directed 2026-08-10, corrected): the top row is `problem.sh |
 * signals.sh`, wired left → right, into a full-width `./session.sh` below.
 * `problem.sh` is not a dead end — a real, measured, animated connector
 * carries its emitted constraint across into `signals.sh`, and `signals.sh`'s
 * own completed reveal carries a second wire down into `session.sh`. Three
 * terminals, two wires, one linear dependency chain: `problem.sh` →
 * `signals.sh` → `session.sh`.
 *
 * Mirrors `CortexaExecutionFlow`'s stage-machine *shape* exactly (one
 * `Stage` enum, `stageAtLeast`, each step released by a real completion
 * signal — a wire's own `onAnimationEnd`, a terminal's last row finishing —
 * never a timer running in parallel with something else): `problem.sh` fades
 * in and is read (`PROBLEM_READ_MS`) → emits its constraint, which releases
 * wire 1 → wire 1 draws → `signals.sh` brightens (`BRIGHTEN_MS`) → its own
 * internal reveal begins once it's also been scrolled into view
 * (`RakshachakraSignalsTerminal`'s own self-managed gate) → its last row
 * finishing releases wire 2 → wire 2 draws → `./session.sh` brightens → its
 * own internal reveal begins the same way.
 *
 * Architecture Canvas does not appear on this page at all — `architecture.mmd`
 * is reachable only through `$ tree .` below, alongside the Technology
 * Manifest and GitHub Repository (`ProjectExploreTerminal`, independently
 * `useInViewOnce`-gated on its own scroll visibility, same as every other
 * project doc's explore terminal).
 */
export function RakshachakraDocFlow({ model, basePath }: { model: DocumentationModel; basePath: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const signalsRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<HTMLDivElement>(null);

  const skip = useRef(prefersReducedMotion() || hasAnimated(SESSION_KEY)).current;
  const [stage, setStage] = useState<Stage>(() => (skip ? 'session' : 'problem'));
  const [problemVisible, setProblemVisible] = useState(skip);

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
    if (skip || stage !== 'session-waking') return undefined;
    const timer = window.setTimeout(() => setStage('session'), BRIGHTEN_MS);
    return () => window.clearTimeout(timer);
  }, [stage, skip]);

  const handleWire1Drawn = useCallback(() => setStage((s) => (s === 'wire1' ? 'signals-waking' : s)), []);
  const handleWire2Drawn = useCallback(() => setStage((s) => (s === 'wire2' ? 'session-waking' : s)), []);
  const handleSignalsComplete = useCallback(() => setStage((s) => (s === 'signals' ? 'wire2' : s)), []);

  const wire1Visible = skip || stageAtLeast('wire1');
  const wire2Visible = skip || stageAtLeast('wire2');
  const signalsActive = skip || stageAtLeast('signals');
  const sessionActive = skip || stageAtLeast('session');

  // Continue Exploring rendered through the same shared markdown pipeline
  // every doc uses, with `exploreTerminal` set so its detected link-card
  // list becomes `ProjectExploreTerminal`'s typed `$ tree .` instead of
  // `LinkFileList`'s row list — no hand-parsing of the real "Continue
  // Exploring" markdown, same mechanism Phase 2 already proved out.
  const components = useMemo(() => createDocumentationComponents(basePath, { exploreTerminal: {} }), [basePath]);
  const continueExploring = model.sections.find((section) => section.heading.toLowerCase() === 'continue exploring');

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
          active={signalsActive}
          skip={skip}
          onComplete={handleSignalsComplete}
        />
      </div>

      <RakshachakraSessionTerminal sessionRef={sessionRef} active={sessionActive} skip={skip} />

      <RakshachakraConnectors
        containerRef={containerRef}
        problemRef={problemRef}
        signalsRef={signalsRef}
        sessionRef={sessionRef}
        wire1Visible={wire1Visible}
        wire2Visible={wire2Visible}
        onWire1Drawn={handleWire1Drawn}
        onWire2Drawn={handleWire2Drawn}
      />

      {continueExploring && (
        <Markdown remarkPlugins={[remarkGfm]} components={components}>
          {continueExploring.bodyMarkdown}
        </Markdown>
      )}
    </div>
  );
}
