import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Variants } from 'motion/react';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../lib/typingReveal';

// Sprint: Workspace-Wide File Opening Animation System. The universal
// successor to lib/typingReveal.ts's TYPING_REVEAL_FILE_IDS allowlist +
// useTypingReveal.ts's single clip-path wipe — this applies to every file
// type, not six hardcoded ids, and reveals discrete "units" (a markdown
// block, a code line, a diagram node) a renderer defines for itself, rather
// than uniformly clipping whatever the renderer produced. The old module
// stays untouched: ResumeWorkspace.tsx is still its only caller.

const HOLD_MS = 150;
const UNIT_ANIM_MS = 220;

const SMALL_UNIT_THRESHOLD = 8;
const MEDIUM_UNIT_THRESHOLD = 24;
const SMALL_BAND: [number, number] = [800, 1200];
const MEDIUM_BAND: [number, number] = [1200, 2000];
const LARGE_BAND: [number, number] = [2000, 3000];

const INTERRUPT_EVENTS: (keyof HTMLElementEventMap)[] = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function totalDurationForUnitCount(unitCount: number): number {
  if (unitCount <= 0) return 0;
  const band =
    unitCount <= SMALL_UNIT_THRESHOLD ? SMALL_BAND : unitCount <= MEDIUM_UNIT_THRESHOLD ? MEDIUM_BAND : LARGE_BAND;
  return randomBetween(band[0], band[1]);
}

export interface FileRevealSequenceOptions {
  fileId: string;
  /** How many discrete pieces this renderer will stagger in — a markdown
   * block count, a code line-group count, a node+edge count. Only needs to
   * be roughly right: the delay formula clamps against it, so an estimate
   * (e.g. markdown's blank-line proxy) can't push the last unit past the
   * duration band. */
  unitCount: number;
  /** Reuse an existing ref (e.g. ArchitectureCanvas's pan/zoom container)
   * instead of creating a second one for interruption listeners. */
  containerRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
}

export interface FileRevealSequenceResult {
  /** True once fully revealed — naturally (last unit finished) or because
   * the user interrupted, reduced motion is on, this file already played
   * this session, or the sequence is disabled. Renderers use this both to
   * show the trailing cursor and, via `initial={isComplete ? false : 'hidden'}`
   * plus `transition={isComplete ? { duration: 0 } : undefined}` on each
   * unit, to snap any still-hidden units instantly to their final state —
   * Motion re-evaluates `transition` on every render even though `initial`
   * is only read once at mount, so this one boolean covers both "never
   * animate" and "stop animating right now." */
  isComplete: boolean;
  /** Alias of isComplete, kept distinct for call-site clarity. */
  showCursor: boolean;
  getUnitDelaySeconds: (index: number) => number;
  unitVariants: Variants;
  /** For renderers (ArchitectureCanvas) that need the timing (delay/
   * duration/ease) but animate a target other than unitVariants' flat
   * opacity:1 — e.g. a node/edge settling at a hover-state-driven opacity
   * instead. `unitVariants` itself can't be reached into for this: its
   * `visible` entry is one arm of Motion's own `Variant` union, which isn't
   * staticly callable without an unsound cast. */
  getUnitTransition: (index: number) => { duration: number; delay: number; ease: 'easeOut' };
  containerRef: RefObject<HTMLElement | null>;
  /** Wire to the last unit's `onAnimationComplete`. */
  onLastUnitComplete: () => void;
  isLastUnit: (index: number) => boolean;
}

/**
 * The shared reveal engine every per-file-type renderer builds on. Owns
 * session-gating (via lib/typingReveal.ts's existing hasAnimated/
 * markAnimated/prefersReducedMotion), timing, and interruption — a renderer
 * only needs to say how many units it has and how each one should look at
 * rest vs. revealed (usually just `sequence.unitVariants` as-is).
 *
 * Units are never conditionally mounted/unmounted as "revealed" ticks
 * forward — everything renders immediately at `opacity:0,y:8` and Motion's
 * own transition.delay staggers them in, so there's exactly one layout pass
 * and every frame after that is compositor-only (opacity/transform). The
 * only state this hook tracks is the single `isComplete` boolean.
 */
export function useFileRevealSequence({
  fileId,
  unitCount,
  containerRef: externalRef,
  enabled = true,
}: FileRevealSequenceOptions): FileRevealSequenceResult {
  const internalRef = useRef<HTMLElement | null>(null);
  const containerRef = externalRef ?? internalRef;

  const shouldSkip = !enabled || unitCount <= 0 || hasAnimated(fileId) || prefersReducedMotion();

  // Keyed on fileId alone, like useTypingReveal.ts: a mid-session content
  // change on an already-open file (e.g. a re-parse after a save) must
  // never restart or retime an already-playing/already-played reveal.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totalMs = useMemo(() => totalDurationForUnitCount(unitCount), [fileId]);

  const [isComplete, setIsComplete] = useState(shouldSkip);

  const finish = useCallback(() => {
    setIsComplete((prev) => {
      if (prev) return prev;
      markAnimated(fileId);
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  // Re-check gating and (re)attach interruption listeners whenever the open
  // file changes. Native addEventListener (not React synthetic props) is
  // what guarantees `passive: true`; scoped to this file's own container so
  // interacting with one pane never force-completes the other pane's
  // independent reveal.
  useEffect(() => {
    if (shouldSkip) {
      setIsComplete(true);
      return undefined;
    }
    setIsComplete(false);

    const node = containerRef.current;
    if (!node) return undefined;

    INTERRUPT_EVENTS.forEach((evt) => node.addEventListener(evt, finish, { passive: true, once: true }));
    return () => {
      INTERRUPT_EVENTS.forEach((evt) => node.removeEventListener(evt, finish));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  const getUnitDelaySeconds = useCallback(
    (index: number) => {
      if (totalMs <= 0) return 0;
      const raw = HOLD_MS + index * ((totalMs - HOLD_MS) / Math.max(unitCount, 1));
      const clamped = Math.min(raw, Math.max(totalMs - UNIT_ANIM_MS, HOLD_MS));
      return clamped / 1000;
    },
    [totalMs, unitCount],
  );

  const getUnitTransition = useCallback(
    (index: number) => ({ duration: UNIT_ANIM_MS / 1000, delay: getUnitDelaySeconds(index), ease: 'easeOut' as const }),
    [getUnitDelaySeconds],
  );

  const unitVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0, y: 8 },
      visible: (index: number) => ({
        opacity: 1,
        y: 0,
        transition: getUnitTransition(index),
      }),
    }),
    [getUnitTransition],
  );

  const isLastUnit = useCallback((index: number) => index === unitCount - 1, [unitCount]);

  return {
    isComplete,
    showCursor: isComplete,
    getUnitDelaySeconds,
    unitVariants,
    getUnitTransition,
    containerRef,
    onLastUnitComplete: finish,
    isLastUnit,
  };
}
