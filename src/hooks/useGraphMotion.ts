import { useMemo } from 'react';
import { hashStringToIndex } from '../manifest/colorHash';

/**
 * Deterministic ambient-motion timing for one graph node — Milestone 5's
 * "idle floating" and "breathing." Seeded entirely from the node's own id
 * (via `hashStringToIndex`, the same deterministic hashing the Layout
 * Engine and `constellationLayout.ts`'s own fallback jitter already use),
 * so every build produces the same timings and no two nodes ever move in
 * perfect sync — never `Math.random`.
 *
 * Deliberately produces TIMING VALUES only, not the animation itself: the
 * actual motion runs as a plain CSS `@keyframes` loop (declared once in
 * KnowledgeGraphScene's `<defs><style>`, consumed via inline custom
 * properties on each node) — the same "CSS drives ambient/infinite loops,
 * Motion drives discrete/interactive transitions" split
 * `ConstellationStar.tsx` already established in this codebase, for the
 * same reason: an infinite CSS animation costs nothing per frame in React
 * and never fights Motion's own transform handling for hover/drag.
 */

const FLOAT_DURATION_MIN_S = 10;
const FLOAT_DURATION_MAX_S = 20;
const FLOAT_DELAY_WINDOW_S = 12;
const FLOAT_AMPLITUDE_MIN_PX = 3;
const FLOAT_AMPLITUDE_MAX_PX = 6;

const BREATHE_DURATION_MIN_S = 9;
const BREATHE_DURATION_MAX_S = 15;
const BREATHE_DELAY_WINDOW_S = 9;
const BREATHE_SCALE_MIN = 1.02;
const BREATHE_SCALE_MAX = 1.03;

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

export interface GraphNodeMotionTiming {
  floatDurationS: number;
  floatDelayS: number;
  /** Three waypoints (not a single back-and-forth pair) so the drift path reads as gentle wandering rather than an obviously-looping sine wave. */
  floatWaypoints: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
  breatheDurationS: number;
  breatheDelayS: number;
  breathePeakScale: number;
}

export function useGraphMotionTiming(nodeId: string): GraphNodeMotionTiming {
  return useMemo(() => {
    const floatDurationS = FLOAT_DURATION_MIN_S + jitter(`float-dur:${nodeId}`, 4691) * (FLOAT_DURATION_MAX_S - FLOAT_DURATION_MIN_S);
    const floatDelayS = jitter(`float-delay:${nodeId}`, 4703) * FLOAT_DELAY_WINDOW_S;

    const waypoint = (index: number) => {
      const angle = jitter(`float-angle${index}:${nodeId}`, 4441 + index * 2) * Math.PI * 2;
      const amplitude = FLOAT_AMPLITUDE_MIN_PX + jitter(`float-amp${index}:${nodeId}`, 4457 + index * 2) * (FLOAT_AMPLITUDE_MAX_PX - FLOAT_AMPLITUDE_MIN_PX);
      return { x: Math.cos(angle) * amplitude, y: Math.sin(angle) * amplitude };
    };

    const breatheDurationS = BREATHE_DURATION_MIN_S + jitter(`breathe-dur:${nodeId}`, 4127) * (BREATHE_DURATION_MAX_S - BREATHE_DURATION_MIN_S);
    const breatheDelayS = jitter(`breathe-delay:${nodeId}`, 4159) * BREATHE_DELAY_WINDOW_S;
    const breathePeakScale = BREATHE_SCALE_MIN + jitter(`breathe-scale:${nodeId}`, 4211) * (BREATHE_SCALE_MAX - BREATHE_SCALE_MIN);

    return {
      floatDurationS,
      floatDelayS,
      floatWaypoints: [waypoint(0), waypoint(1), waypoint(2)],
      breatheDurationS,
      breatheDelayS,
      breathePeakScale,
    };
  }, [nodeId]);
}
