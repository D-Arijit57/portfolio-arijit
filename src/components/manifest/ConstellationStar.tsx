import { memo } from 'react';
import { motion } from 'motion/react';
import { Component } from 'lucide-react';
import type { ConstellationNode, ConstellationTier } from '../../manifest/constellationGraph';
import type { ConstellationPosition } from '../../manifest/constellationLayout';
import { TIER_RADIUS } from '../../manifest/constellationLayout';
import { hashStringToIndex } from '../../manifest/colorHash';
import { resolveTechLogo } from '../../documentation/techLogos';
import type { FileRevealSequenceResult } from '../../hooks/useFileRevealSequence';
import type { ConstellationVisualState } from './constellationVisualState';

/**
 * A single constellation star — astrophotography-style layering, back to
 * front: a wide atmospheric halo, a brighter mid bloom that breathes
 * independently per star, a white-hot corona immediately around the
 * core, the technology chip itself, a directional specular highlight, a
 * pulsing outline ring, and a small blinking twinkle glint. All additive
 * (`mix-blend-mode: screen`) so overlapping glow brightens instead of
 * flattening into a muddy blend, sampling a per-category
 * `<radialGradient>` (defined once in ConstellationScene's `<defs>`)
 * rather than a flat fill behind a blur — a bright near-white core fading
 * outward into the category's own color, not a filled UI circle with a
 * shadow. Interaction is lighting-driven, not scale-driven: hovering
 * brightens the glow layers and the ring rather than growing the star.
 */

const NODE_OPACITY: Record<ConstellationVisualState, number> = { default: 1, active: 1, connected: 1, dimmed: 0.15 };
const RING_OPACITY: Record<ConstellationVisualState, number> = { default: 0.9, active: 1, connected: 0.97, dimmed: 0.45 };
const RING_WIDTH: Record<ConstellationVisualState, number> = { default: 2.4, active: 3.5, connected: 2.9, dimmed: 2 };
// Overall multiplier on the glow stack (halo + bloom + corona) per
// interaction state — this, not a scale transform, is what "hovering
// feels magical" means here.
const GLOW_BOOST: Record<ConstellationVisualState, number> = { default: 1, active: 1.7, connected: 1.3, dimmed: 0.3 };
const STATE_TRANSITION = { duration: 0.2, ease: 'easeInOut' as const };
// Tier-driven visual hierarchy — "the user should immediately understand
// what powers the project": primary (the center) reads clearly larger and
// brighter than secondary (each category's own anchor), which in turn
// reads larger than supporting technologies.
const RING_EXTRA: Record<ConstellationTier, number> = { primary: 18, secondary: 12, supporting: 8 };
const ICON_SIZE: Record<ConstellationTier, number> = { primary: 22, secondary: 16, supporting: 12 };
const TITLE_FONT: Record<ConstellationTier, number> = { primary: 13, secondary: 11.5, supporting: 10 };
const HEARTBEAT_MIN_S = 3.5;
const HEARTBEAT_MAX_S = 6;
const HEARTBEAT_DELAY_WINDOW_S = 6;
const FLOAT_MIN_S = 5;
const FLOAT_MAX_S = 4;

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

export interface ConstellationStarProps {
  node: ConstellationNode;
  position: ConstellationPosition;
  isRoot: boolean;
  state: ConstellationVisualState;
  reduceMotion: boolean;
  revealSequence: FileRevealSequenceResult;
  unitIndex: number;
  isLastRevealUnit: boolean;
  onHoverChange: (hovering: boolean) => void;
  onSelect: () => void;
}

function ConstellationStarImpl({
  node,
  position,
  isRoot,
  state,
  reduceMotion,
  revealSequence,
  unitIndex,
  isLastRevealUnit,
  onHoverChange,
  onSelect,
}: ConstellationStarProps) {
  const radius = TIER_RADIUS[node.tier];
  const ringExtra = RING_EXTRA[node.tier];
  const iconSize = ICON_SIZE[node.tier];
  const logo = resolveTechLogo(node.technology);
  const glowGradientId = `constellation-star-glow-${node.color.slice(1)}`;
  const glowBoost = GLOW_BOOST[state];

  const nodeDelay = revealSequence.isComplete ? 0 : revealSequence.getUnitTransition(unitIndex).delay;
  const nodeDuration = revealSequence.isComplete ? 0.2 : revealSequence.getUnitTransition(unitIndex).duration;
  const titleDelay = nodeDelay + nodeDuration + 0.05;
  const subtitleDelay = titleDelay + 0.2;
  const titleTransition = revealSequence.isComplete
    ? STATE_TRANSITION
    : { duration: 0.35, delay: titleDelay, ease: 'easeOut' as const };
  const subtitleTransition = revealSequence.isComplete
    ? STATE_TRANSITION
    : { duration: 0.3, delay: subtitleDelay, ease: 'easeOut' as const };

  const heartbeatDelayS = jitter(`${node.id}:hb-delay`, 4703) * HEARTBEAT_DELAY_WINDOW_S;
  const heartbeatDurationS = HEARTBEAT_MIN_S + jitter(`${node.id}:hb-dur`, 4691) * (HEARTBEAT_MAX_S - HEARTBEAT_MIN_S);
  const breatheDelayS = jitter(`${node.id}:breathe-delay`, 4441) * 5;
  const breatheDurationS = 4.5 + jitter(`${node.id}:breathe-dur`, 4457) * 3;
  const twinkleDelayS = jitter(`${node.id}:twinkle-delay`, 4127) * 4;
  const twinkleDurationS = 2.2 + jitter(`${node.id}:twinkle-dur`, 4159) * 2.4;
  // Microscopic (1-2px) idle drift — "never static" without ever reading
  // as motion sickness or as if the layout itself were unstable.
  const floatDelayS = jitter(`${node.id}:float-delay`, 4211) * 6;
  const floatDurationS = FLOAT_MIN_S + jitter(`${node.id}:float-dur`, 4229) * FLOAT_MAX_S;
  const floatDx = (jitter(`${node.id}:float-dx`, 4241) - 0.5) * 3;
  const floatDy = (jitter(`${node.id}:float-dy`, 4243) - 0.5) * 3;

  return (
    <motion.g
      transform={`translate(${position.x}, ${position.y})`}
      initial={{ opacity: 0 }}
      animate={{ opacity: NODE_OPACITY[state] }}
      transition={{ duration: nodeDuration, delay: nodeDelay, ease: 'easeOut' }}
      onAnimationComplete={isLastRevealUnit ? revealSequence.onLastUnitComplete : undefined}
    >
      <g
        style={
          reduceMotion
            ? undefined
            : {
                animation: `constellation-float ${floatDurationS}s ease-in-out infinite`,
                animationDelay: `${floatDelayS}s`,
                // @ts-expect-error -- custom properties consumed by the constellation-float keyframe
                '--float-dx': `${floatDx}px`,
                '--float-dy': `${floatDy}px`,
              }
        }
      >
        <motion.g
          initial={reduceMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={
            !revealSequence.isComplete
              ? { type: 'spring' as const, bounce: 0.22, duration: 0.5, delay: nodeDelay }
              : { type: 'spring' as const, stiffness: 320, damping: 18 }
          }
        >
          {!reduceMotion && (
            <g style={{ opacity: glowBoost, transition: 'opacity 0.25s ease-out' }}>
              {/* Short-range halo — a tight, contained accent, not a
                  spreading atmosphere. Every radius/blur in this stack
                  is deliberately small: the glow should read as
                  emanating from a sharp object, never as fog. */}
              <circle
                r={radius * 2.0}
                fill={`url(#${glowGradientId})`}
                opacity={0.16}
                filter="url(#constellation-halo-blur)"
                style={{ mixBlendMode: 'screen' }}
              />
              {/* Controlled bloom, breathes independently per node so the
                  stack pulses in brightness without ever growing hazy. */}
              <circle
                r={radius * 1.5}
                fill={`url(#${glowGradientId})`}
                filter="url(#constellation-bloom-blur)"
                style={{
                  mixBlendMode: 'screen',
                  animation: `constellation-glow-breathe ${breatheDurationS}s ease-in-out infinite`,
                  animationDelay: `${breatheDelayS}s`,
                }}
              />
              {/* Soft colored corona, immediately around the core. */}
              <circle
                r={radius * 1.22}
                fill={`url(#${glowGradientId})`}
                opacity={0.55}
                filter="url(#constellation-corona-blur)"
                style={{ mixBlendMode: 'screen' }}
              />
              {/* Always-on, tight glow directly behind the outline ring
                  — a controlled accent so the ring reads as a lit edge,
                  not a flat stroke. The heartbeat ring below layers an
                  occasional brighter pulse on top. */}
              <circle
                r={radius + ringExtra * 0.35}
                fill="none"
                stroke={node.color}
                strokeWidth={isRoot ? 3.5 : 2}
                opacity={0.5}
                filter="url(#constellation-node-glow)"
                style={{ mixBlendMode: 'screen' }}
              />
              <circle
                r={radius + ringExtra}
                fill="none"
                stroke={node.color}
                strokeWidth={isRoot ? 3 : 1.5}
                opacity={0}
                filter="url(#constellation-node-glow)"
                style={{
                  animation: `constellation-heartbeat ${heartbeatDurationS}s ease-in-out infinite`,
                  animationDelay: `${heartbeatDelayS}s`,
                }}
              />
            </g>
          )}
          {/* Layer 1 — the chip's own body: the bright white core. Samples
              the same white-hot-core -> category-color gradient the rest
              of the glow stack uses, instead of a flat near-black fill —
              this is what makes the disc itself read as a light source.
              A translucent dark scrim on top keeps the icon legible
              against it without hiding the gradient entirely. */}
          <circle r={radius} fill={`url(#${glowGradientId})`} />
          <circle r={radius} fill="#04060a" opacity={0.26} />
          {!reduceMotion && (
            // Bright core highlight — a directional specular glint
            // suggesting the star has a hot core catching light, distinct
            // from the small blinking twinkle glint below.
            <circle cx={-radius * 0.3} cy={-radius * 0.34} r={radius * 0.4} fill="#ffffff" opacity={0.32} style={{ mixBlendMode: 'screen' }} />
          )}
          <circle r={radius} fill="none" stroke={node.color} strokeOpacity={RING_OPACITY[state]} strokeWidth={RING_WIDTH[state] + (isRoot ? 1 : 0)} />
          {!reduceMotion && (
            <circle
              cx={-radius * 0.32}
              cy={-radius * 0.36}
              r={Math.max(1.2, radius * 0.1)}
              fill="#ffffff"
              opacity={0}
              style={{
                animation: `constellation-twinkle ${twinkleDurationS}s ease-in-out infinite`,
                animationDelay: `${twinkleDelayS}s`,
              }}
            />
          )}
          {isRoot && !reduceMotion && (
            <>
              <SparkleGlyph x={radius * 0.82} y={-radius * 0.88} size={7} color="#ffffff" />
              <SparkleGlyph x={-radius * 1.02} y={radius * 0.5} size={4.5} color={node.color} />
            </>
          )}
          <foreignObject x={-radius} y={-radius} width={radius * 2} height={radius * 2}>
            <button
              type="button"
              data-constellation-node={node.id}
              className="flex h-full w-full items-center justify-center focus:outline-none"
              onMouseEnter={() => onHoverChange(true)}
              onMouseLeave={() => onHoverChange(false)}
              onFocus={() => onHoverChange(true)}
              onBlur={() => onHoverChange(false)}
              onClick={onSelect}
            >
              {logo ? (
                <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill={logo.color} aria-hidden="true">
                  <path d={logo.path} />
                </svg>
              ) : (
                <Component size={iconSize * 0.8} color={node.color} />
              )}
            </button>
          </foreignObject>
        </motion.g>

        {/* Crisp, high-contrast labels — a tight drop shadow for legibility
            against whatever sits behind them, never a blurred glow. */}
        <motion.text
          y={radius + 17}
          textAnchor="middle"
          fontSize={TITLE_FONT[node.tier]}
          fontWeight={600}
          fill="#ffffff"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: NODE_OPACITY[state] }}
          transition={titleTransition}
        >
          {node.technology}
        </motion.text>
        <motion.text
          y={radius + 31}
          textAnchor="middle"
          fontSize={9.5}
          fill="#a8adb5"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: NODE_OPACITY[state] * 0.9 }}
          transition={subtitleTransition}
        >
          {node.role}
        </motion.text>
      </g>
    </motion.g>
  );
}

/** A small 4-point sparkle accent — decorative flourish on the root node only, echoing the "igniting star" flavor from the reference. */
function SparkleGlyph({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const inner = size * 0.32;
  const d = `M 0,${-size} L ${inner},${-inner} L ${size},0 L ${inner},${inner} L 0,${size} L ${-inner},${inner} L ${-size},0 L ${-inner},${-inner} Z`;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path d={d} fill={color} opacity={0.85} />
    </g>
  );
}

export const ConstellationStar = memo(ConstellationStarImpl);
