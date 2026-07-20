import { useEffect, useRef, useState } from 'react';
import { TYPING_REVEAL_FILE_IDS, hasAnimated, markAnimated, prefersReducedMotion } from '../lib/typingReveal';

interface TypingRevealState {
  /** true only while the reveal is actively playing; false = render normally. */
  isRevealing: boolean;
  /** 0-100, percentage of the pane's content height currently visible. */
  progress: number;
}

const MIN_DURATION_MS = 400;
const MAX_DURATION_MS = 800;
const MIN_STEPS = 6;
const MAX_STEPS = 9;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function doneState(): TypingRevealState {
  return { isRevealing: false, progress: 100 };
}

/**
 * Drives the "small bursts, occasional pauses" reveal cadence for a handful
 * of showcase files (TYPING_REVEAL_FILE_IDS). This never touches content or
 * syntax highlighting — it only produces a progress percentage a wrapper
 * component uses to clip already-rendered output, so the whole effect costs
 * a handful of setState calls total (MIN_STEPS-MAX_STEPS), never per
 * character. Plays once per fileId per session; see lib/typingReveal.ts for
 * the replay-prevention bookkeeping.
 *
 * Resilient to React 18 StrictMode's dev-only mount→cleanup→mount: nothing
 * observable (no global Set mutation, no timers left running) happens until
 * the *first* scheduled step actually fires, so a throwaway first
 * invocation that gets torn down before that leaves zero trace — the
 * surviving invocation runs exactly as if it were the only one.
 */
export function useTypingReveal(fileId: string, contentLength: number): TypingRevealState {
  const [state, setState] = useState<TypingRevealState>(() => {
    if (!TYPING_REVEAL_FILE_IDS.has(fileId) || hasAnimated(fileId) || prefersReducedMotion()) {
      return doneState();
    }
    return { isRevealing: true, progress: 0 };
  });

  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (!TYPING_REVEAL_FILE_IDS.has(fileId)) {
      setState(doneState());
      return;
    }

    if (hasAnimated(fileId) || prefersReducedMotion()) {
      setState(doneState());
      return;
    }

    setState({ isRevealing: true, progress: 0 });

    const duration = Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, MIN_DURATION_MS + contentLength / 8));
    const stepCount = Math.round(randomBetween(MIN_STEPS, MAX_STEPS));

    let elapsed = 0;
    let cumulative = 0;

    for (let i = 0; i < stepCount; i++) {
      const isLast = i === stepCount - 1;
      // Uneven chunk sizes + uneven delays = bursts and pauses, not a
      // metronome — the whole point of "not an unrealistic typewriter."
      const chunk = isLast ? 100 - cumulative : randomBetween(8, 22);
      cumulative = isLast ? 100 : Math.min(100, cumulative + chunk);
      const stepDelay = randomBetween((duration / stepCount) * 0.5, (duration / stepCount) * 1.5);
      elapsed += stepDelay;

      const progressAtStep = cumulative;
      const isFirst = i === 0;
      const timeout = window.setTimeout(() => {
        // Deferred to the first *real* fired step rather than done up front,
        // so a StrictMode dry-run that never reaches here never marks
        // anything (see cleanup below).
        if (isFirst) markAnimated(fileId);
        setState({ isRevealing: !isLast, progress: progressAtStep });
      }, elapsed);
      timeoutsRef.current.push(timeout);
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // Deliberately keyed on fileId alone — a content-length change on an
    // already-open file (e.g. after a save) must never re-trigger the
    // reveal; contentLength here only ever affects duration at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  return state;
}
