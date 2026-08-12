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

/** Connection-port dot radius, and how far outside the ring it sits. */
const PORT_R = 2.1;
const PORT_OFFSET = 1.5;

export interface ConstellationEdgeProps {
  edgeKey: string;
  pathId: string;
  from: ConstellationPosition;
  to: ConstellationPosition;
  /** Ring radii of the two nodes — where this edge's ports are seated. */
  fromRadius: number;
  toRadius: number;
  color: string;
  state: ConstellationVisualState;
  reduceMotion: boolean;
  delay: number;
  duration: number;
  isRevealed: boolean;
}

export function ConstellationEdge({ edgeKey, pathId, from, to, fromRadius, toRadius, color, state, reduceMotion, delay, duration, isRevealed }: ConstellationEdgeProps) {
  const pathD = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  /**
   * Connection ports — the reference anatomy's item 6: the points where an edge
   * meets a node.
   *
   * Placed here rather than on the node because only the edge knows its own
   * direction; a node would have to be told about every edge incident to it to
   * work out where its ports belong. Seated just outside each ring so the dot
   * sits on the boundary rather than under the node's own interior, which is
   * what makes an edge read as *docking* rather than as a line passing beneath
   * a disc. The line itself still runs centre-to-centre and is simply covered
   * by the node, so nothing about the existing geometry or the particle paths
   * changes.
   */
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const ports = [
    { x: from.x + ux * (fromRadius + PORT_OFFSET), y: from.y + uy * (fromRadius + PORT_OFFSET) },
    { x: to.x - ux * (toRadius + PORT_OFFSET), y: to.y - uy * (toRadius + PORT_OFFSET) },
  ];

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

      {ports.map((port, index) => (
        <motion.circle
          key={`port-${index}`}
          cx={port.x}
          cy={port.y}
          r={PORT_R}
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: EDGE_OPACITY[state] * 1.6 }}
          transition={{ duration: 0.3, delay: delay + duration, ease: 'easeOut' }}
          style={{ mixBlendMode: 'screen' }}
        />
      ))}

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
