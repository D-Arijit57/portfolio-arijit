import { motion } from 'motion/react';
import type { ConstellationPosition } from '../../manifest/constellationLayout';
import { hashStringToIndex } from '../../manifest/colorHash';
import type { ConstellationVisualState } from './constellationVisualState';

/**
 * A single connection — an illuminated fiber-optic line, not a fading
 * gradient. Three stacked layers, each a *solid* color end to end (no
 * per-edge fade gradient, no tapering toward the endpoints): a soft
 * outer bloom, a colored glow matching the destination category, and a
 * thin bright white center line on top. The line stays constantly
 * visible and constant-width along its full length — only the
 * hover/select dimming states (EDGE_OPACITY) change its overall
 * brightness, never its geometry. On top: several independently-timed
 * traveling "packets" — a short, sharp strokeDasharray/stroke-dashoffset
 * segment with a tight glow and a brief trailing streak, not a blurry
 * floating dot.
 */

const EDGE_OPACITY: Record<ConstellationVisualState, number> = { default: 0.75, active: 0.8, connected: 0.9, dimmed: 0.14 };
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
  const stateOpacity = EDGE_OPACITY[state];

  return (
    <g>
      {!reduceMotion && (
        <>
          {/* Layer 3 — soft outer bloom, solid color, full length. */}
          <motion.path
            d={pathD}
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            filter="url(#constellation-edge-bloom)"
            style={{ mixBlendMode: 'screen' }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: stateOpacity * 0.4 }}
            transition={{ duration, delay, ease: 'easeOut' }}
          />
          {/* Layer 2 — colored glow matching the destination category. */}
          <motion.path
            d={pathD}
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
            filter="url(#constellation-edge-glow)"
            style={{ mixBlendMode: 'screen' }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: stateOpacity }}
            transition={{ duration, delay, ease: 'easeOut' }}
          />
        </>
      )}
      {/* Layer 1 — thin bright white center line, solid, unblurred,
          constant thickness end to end. */}
      <motion.path
        id={pathId}
        d={pathD}
        stroke="#ffffff"
        strokeWidth={1.2}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: stateOpacity }}
        transition={{ duration, delay, ease: 'easeOut' }}
      />

      {/* The one-shot "signal" particle that travels once while this
          edge is first being drawn during construction. */}
      {!reduceMotion && !isRevealed && (
        <g>
          <animateMotion dur={`${duration}s`} begin={`${delay}s`} fill="freeze" calcMode="linear">
            <mpath href={`#${pathId}`} />
          </animateMotion>
          <circle r={3.5} fill="#ffffff" opacity={0.5} filter="url(#constellation-particle-glow)" />
          <circle r={1.6} fill="#ffffff" opacity={0.95} />
        </g>
      )}

      {!reduceMotion &&
        pathLength > 0 &&
        PARTICLES_PER_EDGE.map((particleIndex) => {
          const pDur = 2.4 + jitter(`${edgeKey}:p${particleIndex}:dur`, 3301) * 1.6;
          const phase =
            (pDur / PARTICLES_PER_EDGE.length) * particleIndex + jitter(`${edgeKey}:p${particleIndex}:phase`, 3319) * pDur * 0.4;
          const begin = delay + duration + 0.15 + phase;
          // A short traveling dash — a data packet, not a floating dot.
          // Its trailing streak is just its own recent path history,
          // which is why it needs no separate fade animation.
          const tailLength = Math.min(14, pathLength * 0.1);
          const keyframeName = `constellation-particle-travel-${safeId}-${particleIndex}`;
          return (
            <g key={particleIndex}>
              <style>
                {`@keyframes ${keyframeName} {
                    0% { stroke-dashoffset: ${pathLength + tailLength}; opacity: 0; }
                    10% { opacity: 0.95; }
                    85% { opacity: 0.95; }
                    100% { stroke-dashoffset: ${-tailLength}; opacity: 0; }
                  }`}
              </style>
              <path
                d={pathD}
                stroke={color}
                strokeWidth={2.4}
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
                strokeWidth={1.1}
                strokeLinecap="round"
                strokeDasharray={`${tailLength * 0.35} ${Math.max(pathLength, 1)}`}
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
