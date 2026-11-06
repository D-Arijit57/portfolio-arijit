import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createDocumentationComponents } from './documentationComponents';
import { LatticeProblemTerminal } from './LatticeProblemTerminal';
import { LatticeSchemaTerminal } from './LatticeSchemaTerminal';
import { LatticeRequestTerminal } from './LatticeRequestTerminal';
import { RakshachakraConnectors } from './RakshachakraConnectors';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import type { DocumentationModel } from '../../documentation/types';

const SESSION_KEY = 'lattice-execution-chain';
const PROBLEM_READ_MS = 600;
const BRIGHTEN_MS = 250;

type Stage = 'problem' | 'wire1' | 'schema-waking' | 'schema' | 'wire2' | 'request-waking' | 'request';
const STAGE_ORDER: Stage[] = ['problem', 'wire1', 'schema-waking', 'schema', 'wire2', 'request-waking', 'request'];

/**
 * Lattice's execution chain — the same stage machine and layout as
 * `RakshachakraDocFlow` (problem.sh | schema.sh over a full-width
 * request.sh, two wires, each step released by a real completion signal),
 * with Lattice's own terminals. The wires are `RakshachakraConnectors`,
 * which only takes refs and visibility flags and has nothing
 * Rakshachakra-specific in it.
 */
export function LatticeDocFlow({ model, basePath }: { model: DocumentationModel; basePath: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const schemaRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<HTMLDivElement>(null);

  const skip = useRef(prefersReducedMotion() || hasAnimated(SESSION_KEY)).current;
  const [stage, setStage] = useState<Stage>(() => (skip ? 'request' : 'problem'));
  const stageAtLeast = useCallback((t: Stage) => STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(t), [stage]);

  useEffect(() => {
    if (!skip) markAnimated(SESSION_KEY);
  }, [skip]);

  useEffect(() => {
    if (skip) return undefined;
    const timer = window.setTimeout(() => setStage((s) => (s === 'problem' ? 'wire1' : s)), PROBLEM_READ_MS);
    return () => window.clearTimeout(timer);
  }, [skip]);

  useEffect(() => {
    if (skip || (stage !== 'schema-waking' && stage !== 'request-waking')) return undefined;
    const next: Stage = stage === 'schema-waking' ? 'schema' : 'request';
    const timer = window.setTimeout(() => setStage(next), BRIGHTEN_MS);
    return () => window.clearTimeout(timer);
  }, [stage, skip]);

  const handleWire1Drawn = useCallback(() => setStage((s) => (s === 'wire1' ? 'schema-waking' : s)), []);
  const handleWire2Drawn = useCallback(() => setStage((s) => (s === 'wire2' ? 'request-waking' : s)), []);
  const handleSchemaComplete = useCallback(() => setStage((s) => (s === 'schema' ? 'wire2' : s)), []);

  const components = useMemo(() => createDocumentationComponents(basePath, { exploreTerminal: {} }), [basePath]);
  const continueExploring = model.sections.find((s) => s.heading.toLowerCase() === 'continue exploring');

  return (
    <div ref={containerRef} className="relative flex flex-col">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <LatticeProblemTerminal
          problemRef={problemRef}
          visible
          constraintVisible={skip || stageAtLeast('wire1')}
          skip={skip}
        />
        <LatticeSchemaTerminal
          schemaRef={schemaRef}
          active={skip || stageAtLeast('schema')}
          skip={skip}
          onComplete={handleSchemaComplete}
        />
      </div>

      <LatticeRequestTerminal requestRef={requestRef} active={skip || stageAtLeast('request')} skip={skip} />

      <RakshachakraConnectors
        containerRef={containerRef}
        problemRef={problemRef}
        signalsRef={schemaRef}
        sessionRef={requestRef}
        wire1Visible={skip || stageAtLeast('wire1')}
        wire2Visible={skip || stageAtLeast('wire2')}
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
