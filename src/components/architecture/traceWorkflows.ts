import { useEffect, useState } from 'react';
import type { ArchitectureModel } from '../../architecture/types';
import { buildPathState, edgeKey, type PathState } from './dependencyPath';

/**
 * Architecture Canvas 2.0 — Trace Mode's named workflows. Canvas-local
 * *presentation* config (which real, already-existing nodes to visit in
 * what order), not new architectural data — every id below is one of
 * Cortexa's real 15 nodes, and every consecutive pair is a real edge
 * (verified against src/content/architecture/cortexa.ts's 16 edges; the
 * brief's own example trace, Client->Next.js->Convex->Interview
 * Scheduling->Recording Manager->Judge Pipeline, wasn't walkable — Convex's
 * four business-domain edges are parallel siblings, not a chain — these
 * two replace it).
 */
export const TRACE_WORKFLOWS: Record<string, string[]> = {
  'Interview Scheduling Request': ['client', 'scheduling_ui', 'next_js_app', 'convex', 'interview_scheduling'],
  'Coding Challenge & Judge Evaluation': [
    'client',
    'monaco_editor',
    'next_js_app',
    'convex',
    'coding_challenge',
    'judge_pipeline',
  ],
};

const STEP_DURATION_MS = 700;

const EMPTY_PATH_STATE: PathState = { activeNodeId: null, connectedNodeIds: new Set(), connectedEdgeKeys: new Set() };

function warnIfEdgeMissing(model: ArchitectureModel, from: string, to: string) {
  if (!import.meta.env.DEV) return;
  const exists = model.edges.some((e) => e.from === from && e.to === to);
  if (!exists) {
    // eslint-disable-next-line no-console
    console.warn(
      `[traceWorkflows] "${from} -> ${to}" is not a real edge in ${model.projectKey}'s architecture — highlighting the node without a packet burst.`,
    );
  }
}

export interface TraceStepperResult {
  pathState: PathState;
  currentStep: number;
  totalSteps: number;
  /** The edge just traversed to reach the current step, if it's a real edge — drives the one-shot packet burst, keyed on currentStep so it replays each step. */
  justTraversedEdgeKey: string | null;
}

/**
 * Owns the step timer — mirrors useFileRevealSequence.ts's "hook owns
 * timed/staged state, component just consumes it" shape. Highlighting
 * itself is buildPathState() from dependencyPath.ts, the same helper hover
 * highlighting uses — trace mode is that same mechanism, timer-driven
 * instead of mouse-driven. `enabled=false` (e.g. while the user is
 * hovering a node, which should take precedence) pauses the timer in
 * place rather than resetting it, so it resumes from where it left off.
 */
export function useTraceStepper(
  workflowNodeIds: string[],
  model: ArchitectureModel | undefined,
  enabled: boolean,
): TraceStepperResult {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    setCurrentStep(1);
  }, [workflowNodeIds]);

  useEffect(() => {
    if (!enabled || workflowNodeIds.length === 0) return;
    const interval = window.setInterval(() => {
      setCurrentStep((step) => (step >= workflowNodeIds.length ? 1 : step + 1));
    }, STEP_DURATION_MS);
    return () => window.clearInterval(interval);
  }, [enabled, workflowNodeIds]);

  const visitedIds = enabled && model ? workflowNodeIds.slice(0, currentStep) : [];

  useEffect(() => {
    if (!enabled || !model || visitedIds.length < 2) return;
    const from = visitedIds[visitedIds.length - 2];
    const to = visitedIds[visitedIds.length - 1];
    warnIfEdgeMissing(model, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, model, currentStep]);

  if (!enabled || !model || workflowNodeIds.length === 0) {
    return { pathState: EMPTY_PATH_STATE, currentStep, totalSteps: workflowNodeIds.length, justTraversedEdgeKey: null };
  }

  const pathState = buildPathState(visitedIds, model.edges, visitedIds[visitedIds.length - 1] ?? null);

  let justTraversedEdgeKey: string | null = null;
  if (visitedIds.length >= 2) {
    const from = visitedIds[visitedIds.length - 2];
    const to = visitedIds[visitedIds.length - 1];
    if (model.edges.some((e) => e.from === from && e.to === to)) {
      justTraversedEdgeKey = edgeKey(from, to);
    }
  }

  return { pathState, currentStep, totalSteps: workflowNodeIds.length, justTraversedEdgeKey };
}
