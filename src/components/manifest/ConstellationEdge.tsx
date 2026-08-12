import { motion } from 'motion/react';
import type { ConstellationPosition } from '../../manifest/constellationLayout';
import { hashStringToIndex } from '../../manifest/colorHash';
import type { ConstellationVisualState } from './constellationVisualState';

/**
 * A single connection, built to the reference structure: a sharp core line, a
 * soft atmospheric glow beneath it, a colour that fades out as it approaches
 * its destination, connection ports where it docks, and particles that travel
 * the path to show data flowing.
 *
 * Lines are straight. The reference draws them as cubic beziers and that was
 * built and then reverted on request: in this composition the authored node
 * positions already form recognisable constellation figures, and bowing every
 * edge softened those figures into something closer to a flow diagram. The
 * straight chord is the shape the layout is designed around.
 *
 * Two things did carry over from that pass, and each is load-bearing rather
 * than decorative:
 *
 *   **Fade toward the destination.** The stroke samples a per-edge gradient
 *   laid along its own axis, full strength at the source and dropping off near
 *   the target. An edge announces where it comes *from* and arrives quietly,
 *   which is what stops a dense graph from looking like every node is shouting
 *   at once.
 *
 *   **Weight by importance.** Core width tracks the target's tier. Every node
 *   is now one size, so this is where the primary/secondary/supporting
 *   hierarchy is actually expressed.
 *
 * The particle brightness envelope follows the reference's loop: spawn, travel,
 * brighten as it nears the destination, fade out having arrived, reset. Its
 * path is an `mpath` reference to the core line, so it inherits the curve for
 * free and can never drift off it.
 */

const EDGE_OPACITY: Record<ConstellationVisualState, number> = { default: 0.62, active: 0.95, connected: 0.8, dimmed: 0.12 };
/** Core stroke multiplier per state — hover thickens as well as brightens. */
const WIDTH_BOOST: Record<ConstellationVisualState, number> = { default: 1, active: 1.5, connected: 1.2, dimmed: 0.7 };

export type ConstellationEdgeImportance = 'high' | 'medium' | 'low';
/** The reference's thickness variants: 1.5 / 1 / 0.5px cores. */
const CORE_WIDTH: Record<ConstellationEdgeImportance, number> = { high: 1.5, medium: 1, low: 0.6 };
/** Soft glow width, tracking the core — "4–8px blur, subtle atmospheric glow". */
const GLOW_WIDTH: Record<ConstellationEdgeImportance, number> = { high: 6, medium: 4.5, low: 3 };

/** A dimmed edge desaturates rather than merely dropping opacity, so an
 * unrelated branch reads as switched off instead of just far away. */
const DIMMED_COLOR = '#6b7280';

/** Connection-port dot radius, and how far outside the ring it sits. */
const PORT_R = 2.1;
const PORT_OFFSET = 1.5;

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
  /** Ring radii of the two nodes — where this edge's ports are seated. */
  fromRadius: number;
  toRadius: number;
  /** Inherited from the source node, per the reference. */
  color: string;
  /** Drives core thickness and glow width. */
  importance: ConstellationEdgeImportance;
  state: ConstellationVisualState;
  reduceMotion: boolean;
  delay: number;
  duration: number;
  isRevealed: boolean;
}

export function ConstellationEdge({
  edgeKey,
  pathId,
  from,
  to,
  fromRadius,
  toRadius,
  color,
  importance,
  state,
  reduceMotion,
  delay,
  duration,
  isRevealed,
}: ConstellationEdgeProps) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const pathD = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  /** Ports sit on each ring, along the line's own direction. */
  const ports = [
    { x: from.x + ux * (fromRadius + PORT_OFFSET), y: from.y + uy * (fromRadius + PORT_OFFSET) },
    { x: to.x - ux * (toRadius + PORT_OFFSET), y: to.y - uy * (toRadius + PORT_OFFSET) },
  ];

  const strokeColor = state === 'dimmed' ? DIMMED_COLOR : color;
  const gradientId = `constellation-edge-fade-${edgeKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const coreWidth = CORE_WIDTH[importance] * WIDTH_BOOST[state];
  const glowWidth = GLOW_WIDTH[importance] * WIDTH_BOOST[state];

  return (
    <g>
      {/* Fade-out gradient, laid along this edge's own axis in user space so it
          tracks the geometry rather than the viewport. */}
      <linearGradient
        id={gradientId}
        gradientUnits="userSpaceOnUse"
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
      >
        {/* The falloff bottoms out at 0.45 rather than near-zero. At 0.22 the
            destination end read as a broken line instead of a quiet arrival —
            the reference fades the approach, it does not erase it. */}
        <stop offset="0%" stopColor={strokeColor} stopOpacity={1} />
        <stop offset="55%" stopColor={strokeColor} stopOpacity={0.92} />
        <stop offset="100%" stopColor={strokeColor} stopOpacity={0.45} />
      </linearGradient>

      {!reduceMotion && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={glowWidth}
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
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={coreWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: EDGE_OPACITY[state] }}
        transition={{ duration, delay, ease: 'easeOut' }}
      />

      {ports.map((p, index) => (
        <motion.circle
          key={`port-${index}`}
          cx={p.x}
          cy={p.y}
          r={PORT_R}
          fill={strokeColor}
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
        state !== 'dimmed' &&
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
              {/* The reference's loop: spawn dim, travel, brighten as the
                  destination approaches, then fade out having arrived. The old
                  envelope peaked immediately and decayed at the end, which read
                  as a dot being emitted rather than as one being delivered. */}
              <circle r={4.5} fill={color} style={{ mixBlendMode: 'screen' }} filter="url(#constellation-edge-glow)">
                <animate
                  attributeName="opacity"
                  values="0;0.18;0.42;0"
                  keyTimes="0;0.25;0.8;1"
                  dur={`${pDur}s`}
                  begin={`${begin}s`}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
              </circle>
              <circle r={1.7} fill="#ffffff" style={{ mixBlendMode: 'screen' }}>
                <animate
                  attributeName="opacity"
                  values="0;0.55;1;0"
                  keyTimes="0;0.25;0.82;1"
                  dur={`${pDur}s`}
                  begin={`${begin}s`}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
                <animate
                  attributeName="r"
                  values="1.2;1.7;2.4;1.2"
                  keyTimes="0;0.25;0.82;1"
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
