import { useMemo } from 'react';
import { hashStringToIndex } from '../manifest/colorHash';

/**
 * Deterministic per-node "breathing" scale timing — the graph's idle
 * POSITION drift now lives entirely in `useGraphSimulation`'s continuous
 * physics loop (a real force simulation, not a CSS loop), so this hook's
 * only remaining job is the separate, purely cosmetic scale pulse. Seeded
 * from the node's own id (via `hashStringToIndex`, the same deterministic
 * hashing the Layout Engine and `constellationLayout.ts`'s own fallback
 * jitter already use), so every build produces the same timings and no
 * two nodes ever breathe in sync — never `Math.random`.
 *
 * Still a plain CSS `@keyframes` loop (declared once in
 * KnowledgeGraphScene's `<defs><style>`) — scale is a cosmetic, genuinely
 * periodic pulse (unlike position drift, which the physics sim
 * deliberately keeps non-periodic), so a cheap infinite CSS animation is
 * still the right tool for it.
 */

const BREATHE_DURATION_MIN_S = 8;
const BREATHE_DURATION_MAX_S = 14;
const BREATHE_DELAY_WINDOW_S = 9;
// Spec gives a single literal peak ("1.00 -> 1.03 -> 1.00"), not a range
// — every node breathes to the same peak scale; only its duration/delay
// (jittered below) vary, which is what "randomized phase, never
// synchronized" actually calls for.
const BREATHE_PEAK_SCALE = 1.03;

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

export interface GraphNodeMotionTiming {
  breatheDurationS: number;
  breatheDelayS: number;
  breathePeakScale: number;
}

export function useGraphMotionTiming(nodeId: string): GraphNodeMotionTiming {
  return useMemo(() => {
    const breatheDurationS = BREATHE_DURATION_MIN_S + jitter(`breathe-dur:${nodeId}`, 4127) * (BREATHE_DURATION_MAX_S - BREATHE_DURATION_MIN_S);
    const breatheDelayS = jitter(`breathe-delay:${nodeId}`, 4159) * BREATHE_DELAY_WINDOW_S;

    return {
      breatheDurationS,
      breatheDelayS,
      breathePeakScale: BREATHE_PEAK_SCALE,
    };
  }, [nodeId]);
}
