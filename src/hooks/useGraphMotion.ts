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

// Widened well past the original 8-14s. A narrow band means dozens of
// nodes share near-identical periods and visibly re-synchronize every
// minute or so, which reads as a loop; spreading periods over more than
// a 2x range keeps them incommensurable for long enough that they never
// visibly line up.
const BREATHE_DURATION_MIN_S = 7;
const BREATHE_DURATION_MAX_S = 21;
const BREATHE_DELAY_WINDOW_S = 14;
// Each node also breathes to its OWN slightly different peak. A single
// shared peak makes the amplitude itself the giveaway — every node
// swelling by the identical amount is the sort of uniformity nothing
// organic has.
const BREATHE_PEAK_MIN = 1.016;
const BREATHE_PEAK_MAX = 1.034;

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

    const breathePeakScale = BREATHE_PEAK_MIN + jitter(`breathe-peak:${nodeId}`, 4211) * (BREATHE_PEAK_MAX - BREATHE_PEAK_MIN);

    return {
      breatheDurationS,
      breatheDelayS,
      breathePeakScale,
    };
  }, [nodeId]);
}
