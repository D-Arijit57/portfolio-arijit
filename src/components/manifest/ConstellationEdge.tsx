import { motion } from 'motion/react';
import type { ConstellationPosition } from '../../manifest/constellationLayout';
import { hashStringToIndex } from '../../manifest/colorHash';
import type { ConstellationVisualState } from './constellationVisualState';

/**
 * A single connection — illuminated plasma suspended in space, not a
 * graph edge. Four stacked layers (widest/softest first, so the additive
 * screen blend lets each sharper layer read on top): an extremely subtle
 * atmospheric haze, a large soft bloom, a colored glow matching the
 * destination category, and a thin bright white core — each stroked with
 * a per-edge linear gradient (fully transparent at both endpoints,
 * opaque through the middle) so the line visually dissolves into
 * whichever star it's touching rather than terminating in a hard edge.
 * On top: several independently-timed traveling "comets" — a short
 * strokeDasharray/stroke-dashoffset segment, not a discrete dot — whose
 * own blur naturally tapers into a soft trailing glow as it moves.
 */

const EDGE_OPACITY: Record<ConstellationVisualState, number> = { default: 0.5, active: 0.5, connected: 0.6, dimmed: 0.08 };
// 3 traveling particles per edge, each independently timed — never a
// single lonely dot per line.
const PARTICLES_PER_EDGE = [0, 1, 2];

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

/** CSS custom-idents (keyframe/animation names) can't contain the `:`/`>`
 * characters an edge/path id is built from — everything else about these
 * ids (SVG `id`, `url(#...)`, `href="#..."`) already tolerates them fine. */
function cssSafeIdent(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
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
  const pathLength = Math.hypot(to.x - from.x, to.y - from.y);
  const safeId = cssSafeIdent(pathId);
  const colorFadeId = `${pathId}-fade`;
  const whiteFadeId = `${pathId}-fade-white`;
  const stateOpacity = EDGE_OPACITY[state];

  return (
    <g>
      {/* Per-edge fade gradients — fully transparent at both endpoints,
          opaque through the middle, in the edge's own local coordinate
          space (userSpaceOnUse + explicit x1/y1/x2/y2, not the object's
          bounding box) so it fades exactly along the line's own
          direction regardless of how shallow or steep it is. */}
      <defs>
        <linearGradient id={colorFadeId} gradientUnits="userSpaceOnUse" x1={from.x} y1={from.y} x2={to.x} y2={to.y}>
          <stop offset="0%" stopColor={color} stopOpacity={0} />
          <stop offset="16%" stopColor={color} stopOpacity={1} />
          <stop offset="84%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={whiteFadeId} gradientUnits="userSpaceOnUse" x1={from.x} y1={from.y} x2={to.x} y2={to.y}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="16%" stopColor="#ffffff" stopOpacity={1} />
          <stop offset="84%" stopColor="#ffffff" stopOpacity={1} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
      </defs>

      {!reduceMotion && (
        <>
          {/* Layer 4 — extremely subtle atmospheric haze. */}
          <motion.path
            d={pathD}
            stroke={`url(#${colorFadeId})`}
            strokeWidth={16}
            strokeLinecap="round"
            filter="url(#constellation-edge-haze)"
            style={{ mixBlendMode: 'screen' }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: stateOpacity * 0.32 }}
            transition={{ duration, delay, ease: 'easeOut' }}
          />
          {/* Layer 3 — large soft bloom. */}
          <motion.path
            d={pathD}
            stroke={`url(#${colorFadeId})`}
            strokeWidth={8}
            strokeLinecap="round"
            filter="url(#constellation-edge-bloom)"
            style={{ mixBlendMode: 'screen' }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: stateOpacity * 0.58 }}
            transition={{ duration, delay, ease: 'easeOut' }}
          />
          {/* Layer 2 — colored glow matching the destination category. */}
          <motion.path
            d={pathD}
            stroke={`url(#${colorFadeId})`}
            strokeWidth={3.2}
            strokeLinecap="round"
            filter="url(#constellation-edge-glow)"
            style={{ mixBlendMode: 'screen' }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: stateOpacity * 1.0 }}
            transition={{ duration, delay, ease: 'easeOut' }}
          />
        </>
      )}
      {/* Layer 1 — thin bright white center line. */}
      <motion.path
        id={pathId}
        d={pathD}
        stroke={reduceMotion ? color : `url(#${whiteFadeId})`}
        strokeWidth={1.1}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: reduceMotion ? stateOpacity : stateOpacity * 0.9 }}
        transition={{ duration, delay, ease: 'easeOut' }}
      />

      {/* The one-shot "signal" particle that travels once while this
          edge is first being drawn during construction. */}
      {!reduceMotion && !isRevealed && (
        <g>
          <animateMotion dur={`${duration}s`} begin={`${delay}s`} fill="freeze" calcMode="linear">
            <mpath href={`#${pathId}`} />
          </animateMotion>
          <circle r={5} fill="#ffffff" opacity={0.45} filter="url(#constellation-particle-glow)" />
          <circle r={2.2} fill="#ffffff" opacity={0.95} />
        </g>
      )}

      {!reduceMotion &&
        pathLength > 0 &&
        PARTICLES_PER_EDGE.map((particleIndex) => {
          const pDur = 3 + jitter(`${edgeKey}:p${particleIndex}:dur`, 3301) * 2.2;
          const phase =
            (pDur / PARTICLES_PER_EDGE.length) * particleIndex + jitter(`${edgeKey}:p${particleIndex}:phase`, 3319) * pDur * 0.4;
          const begin = delay + duration + 0.15 + phase;
          // A short traveling dash, not a discrete dot — the dash *is*
          // the comet's own recent-motion trail, and the Gaussian blur
          // on its glow layer naturally tapers both ends into softness
          // rather than needing a second, independent fade animation.
          const tailLength = Math.min(22, pathLength * 0.16);
          const keyframeName = `constellation-particle-travel-${safeId}-${particleIndex}`;
          return (
            <g key={particleIndex}>
              <style>
                {`@keyframes ${keyframeName} {
                    0% { stroke-dashoffset: ${pathLength + tailLength}; opacity: 0; }
                    10% { opacity: 0.55; }
                    82% { opacity: 0.55; }
                    100% { stroke-dashoffset: ${-tailLength}; opacity: 0; }
                  }`}
              </style>
              <path
                d={pathD}
                stroke={color}
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeDasharray={`${tailLength} ${Math.max(pathLength, 1)}`}
                filter="url(#constellation-particle-glow)"
                style={{
                  mixBlendMode: 'screen',
                  animation: `${keyframeName} ${pDur}s linear infinite`,
                  animationDelay: `${begin}s`,
                }}
              />
              <path
                d={pathD}
                stroke="#ffffff"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeDasharray={`${tailLength * 0.4} ${Math.max(pathLength, 1)}`}
                style={{
                  mixBlendMode: 'screen',
                  animation: `${keyframeName} ${pDur}s linear infinite`,
                  animationDelay: `${begin}s`,
                }}
              />
            </g>
          );
        })}
    </g>
  );
}
