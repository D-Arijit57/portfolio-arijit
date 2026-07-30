import { motion } from 'motion/react';
import type { ConstellationPosition } from '../../manifest/constellationLayout';
import { hashStringToIndex } from '../../manifest/colorHash';
import type { ConstellationVisualState } from './constellationVisualState';

/**
 * A single connection — a straight, thinly-glowing line plus several
 * independently-timed traveling particles ("the network should feel
 * alive even when idle"). Each particle fades in as it leaves its source
 * and fades out as it approaches its target (an SMIL <animate> on
 * opacity sharing the exact dur/begin as the motion itself, not a
 * separate blink) rather than popping in/out abruptly, with an additive
 * (screen-blend) glow halo that locally brightens the line as it passes.
 */

const EDGE_OPACITY: Record<ConstellationVisualState, number> = { default: 0.5, active: 0.5, connected: 0.6, dimmed: 0.08 };
// 3 traveling particles per edge, each independently timed — never a
// single lonely dot per line.
const PARTICLES_PER_EDGE = [0, 1, 2];

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

export interface ConstellationEdgeProps {
  edgeKey: string;
  pathId: string;
  from: ConstellationPosition;
  to: ConstellationPosition;
  color: string;
  state: ConstellationVisualState;
  reduceMotion: boolean;
  delay: number;
  duration: number;
  isRevealed: boolean;
}

export function ConstellationEdge({ edgeKey, pathId, from, to, color, state, reduceMotion, delay, duration, isRevealed }: ConstellationEdgeProps) {
  const pathD = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  return (
    <g>
      {!reduceMotion && (
        <motion.path
          d={pathD}
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          filter="url(#constellation-edge-glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: EDGE_OPACITY[state] * 0.8 }}
          transition={{ duration, delay, ease: 'easeOut' }}
        />
      )}
      <motion.path
        id={pathId}
        d={pathD}
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: EDGE_OPACITY[state] }}
        transition={{ duration, delay, ease: 'easeOut' }}
      />

      {/* The one-shot "signal" particle that travels once while this
          edge is first being drawn during construction. */}
      {!reduceMotion && !isRevealed && (
        <g>
          <animateMotion dur={`${duration}s`} begin={`${delay}s`} fill="freeze" calcMode="linear">
            <mpath href={`#${pathId}`} />
          </animateMotion>
          <circle r={5} fill="#ffffff" opacity={0.45} filter="url(#constellation-edge-glow)" />
          <circle r={2.2} fill="#ffffff" opacity={0.95} />
        </g>
      )}

      {!reduceMotion &&
        PARTICLES_PER_EDGE.map((particleIndex) => {
          const pDur = 3 + jitter(`${edgeKey}:p${particleIndex}:dur`, 3301) * 2.2;
          const phase =
            (pDur / PARTICLES_PER_EDGE.length) * particleIndex + jitter(`${edgeKey}:p${particleIndex}:phase`, 3319) * pDur * 0.4;
          const begin = delay + duration + 0.15 + phase;
          return (
            <g key={particleIndex}>
              <animateMotion dur={`${pDur}s`} begin={`${begin}s`} repeatCount="indefinite" calcMode="linear">
                <mpath href={`#${pathId}`} />
              </animateMotion>
              <circle r={4.5} fill={color} style={{ mixBlendMode: 'screen' }} filter="url(#constellation-edge-glow)">
                <animate
                  attributeName="opacity"
                  values="0;0.32;0.32;0"
                  keyTimes="0;0.14;0.82;1"
                  dur={`${pDur}s`}
                  begin={`${begin}s`}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
              </circle>
              <circle r={1.7} fill="#ffffff" style={{ mixBlendMode: 'screen' }}>
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.14;0.82;1"
                  dur={`${pDur}s`}
                  begin={`${begin}s`}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
              </circle>
            </g>
          );
        })}
    </g>
  );
}
