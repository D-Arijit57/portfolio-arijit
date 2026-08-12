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
 * A single constellation node, built to the reference anatomy: an icon core,
 * a thin category-coloured inner ring, a soft outer glow, a label and a
 * subtitle.
 *
 * The structural change from the previous version — and the reason the old
 * nodes read as dull — is that the disc is no longer *filled* with the
 * category gradient. A bright gradient behind a translucent dark scrim left
 * the icon competing with its own background, so the icon had to stay small
 * and the ring had nowhere to sit but flush against a busy edge. Here the
 * interior is near-black and quiet, the ring is the node's defining line, the
 * glow lives *outside* that ring, and the icon is large enough to be the thing
 * you actually read. Roughly the reference's proportions: icon ≈ 0.62 of the
 * ring's diameter, glow reaching ~1.6× the ring.
 *
 * Everything remains additive (`mix-blend-mode: screen`) so overlapping glow
 * brightens rather than muddying, and still samples the per-category
 * `<radialGradient>` defined once in ConstellationScene's `<defs>`.
 *
 * Interaction is lighting-driven rather than layout-driven: hovering
 * intensifies the glow and the ring, selection adds a second outer ring, and
 * an unrelated node desaturates. Nothing jumps position.
 */

const NODE_OPACITY: Record<ConstellationVisualState, number> = { default: 1, active: 1, connected: 1, dimmed: 0.18 };
/** The ring is the node's identity, so it stays legible even at rest. */
const RING_OPACITY: Record<ConstellationVisualState, number> = { default: 0.85, active: 1, connected: 1, dimmed: 0.3 };
const RING_WIDTH: Record<ConstellationVisualState, number> = { default: 1.75, active: 2.75, connected: 2.15, dimmed: 1.4 };
/** Multiplier on the glow stack — this, not a scale transform, is what hover
 * and selection actually change. */
const GLOW_BOOST: Record<ConstellationVisualState, number> = { default: 1, active: 1.85, connected: 1.4, dimmed: 0.25 };
/** The reference's 200–300ms ease-out. */
const STATE_TRANSITION = { duration: 0.24, ease: 'easeOut' as const };

/** How far outside the ring the heartbeat pulse expands. Uniform, like the
 * radius it is measured from. */
const RING_EXTRA: Record<ConstellationTier, number> = { primary: 12, secondary: 12, supporting: 12 };
/**
 * Icon core, as a fraction of the ring's radius.
 *
 * The reference's size guide puts a 32–38px icon inside a 48–56px ring — about
 * 0.62 of the ring's diameter, i.e. 1.24 of its radius. The previous values
 * (22 / 16 / 12 against radii of 46 / 30 / 21) were closer to 0.3, which is
 * what made the icon read as a small mark floating on a disc rather than as
 * the node's core.
 */
const ICON_RATIO = 1.24;
/** Uniform, for the same reason the radius is: three label sizes under three
 * identically-sized rings reads as inconsistency rather than as hierarchy. */
const TITLE_FONT: Record<ConstellationTier, number> = { primary: 11.5, secondary: 11.5, supporting: 11.5 };
const HEARTBEAT_MIN_S = 3.5;
const HEARTBEAT_MAX_S = 6;
const HEARTBEAT_DELAY_WINDOW_S = 6;
const FLOAT_MIN_S = 5;
const FLOAT_MAX_S = 4;
/** The reference's "subtle breathing (scale 1.00 → 1.06 → 1.00)". */
const BREATHE_SCALE = 1.06;
const BREATHE_MIN_S = 4.5;
const BREATHE_MAX_S = 7;

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
  const iconSize = radius * ICON_RATIO;
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
  const scaleBreatheDurationS = BREATHE_MIN_S + jitter(`${node.id}:sb-dur`, 4001) * (BREATHE_MAX_S - BREATHE_MIN_S);
  const scaleBreatheDelayS = jitter(`${node.id}:sb-delay`, 4013) * 4;
  // Microscopic (1-2px) idle drift — "never static" without ever reading
  // as motion sickness or as if the layout itself were unstable.
  const floatDelayS = jitter(`${node.id}:float-delay`, 4211) * 6;
  const floatDurationS = FLOAT_MIN_S + jitter(`${node.id}:float-dur`, 4229) * FLOAT_MAX_S;
  const floatDx = (jitter(`${node.id}:float-dx`, 4241) - 0.5) * 3;
  const floatDy = (jitter(`${node.id}:float-dy`, 4243) - 0.5) * 3;

  const iconColor = logo?.color ?? node.color;

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
          {/* The breathing sits on its own group so it can loop forever
              without fighting the reveal spring above it, which animates the
              same property once and then stops. Driven by Motion rather than a
              CSS keyframe because a CSS `scale` on an SVG group resolves its
              origin against the view-box, not the group — every node would
              breathe toward the canvas centre instead of its own. */}
          <motion.g
            animate={reduceMotion ? undefined : { scale: [1, BREATHE_SCALE, 1] }}
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: scaleBreatheDurationS,
                    delay: scaleBreatheDelayS,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
            }
          >
            {!reduceMotion && (
              <g style={{ opacity: glowBoost, transition: 'opacity 0.24s ease-out' }}>
                {/* Wide atmospheric halo — depth and presence, well outside
                    the ring so it never washes out the icon. */}
                <circle
                  r={radius * 2.6}
                  fill={`url(#${glowGradientId})`}
                  opacity={0.17}
                  filter="url(#constellation-halo-blur)"
                  style={{ mixBlendMode: 'screen' }}
                />
                {/* The outer glow proper: a thick blurred stroke sitting *on*
                    the ring, so the light appears to come off the ring itself
                    rather than from a disc behind it. Its intensity oscillates
                    gently, per the reference's animation notes. */}
                <circle
                  r={radius}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={radius * 0.5}
                  opacity={0.34}
                  filter="url(#constellation-node-glow)"
                  style={{
                    mixBlendMode: 'screen',
                    animation: `constellation-glow-breathe ${breatheDurationS}s ease-in-out infinite`,
                    animationDelay: `${breatheDelayS}s`,
                  }}
                />
                {/* The slow expanding pulse that reads as a live signal. */}
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

            {/* Interior. Deliberately near-black and quiet: it exists to give
                the icon a clean field to sit on, not to be a light source. A
                faint screen-blended tint keeps it from reading as a hole
                punched in the starfield. */}
            <circle r={radius} fill="#05070d" opacity={0.88} />
            <circle
              r={radius}
              fill={`url(#${glowGradientId})`}
              opacity={0.14}
              style={{ mixBlendMode: 'screen' }}
            />

            {/* Inner ring — the category indicator, and the node's defining line. */}
            <circle
              r={radius}
              fill="none"
              stroke={node.color}
              strokeOpacity={RING_OPACITY[state]}
              strokeWidth={RING_WIDTH[state] + (isRoot ? 1 : 0)}
              style={{ transition: 'stroke-opacity 0.24s ease-out, stroke-width 0.24s ease-out' }}
            />

            {/* Selection ring — the reference's Active/Selected state carries a
                second, near-white ring outside the coloured one. Rendered only
                when selected, so the resting node keeps exactly one ring. */}
            {state === 'active' && (
              <circle
                r={radius + 5}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0.55}
                strokeWidth={1}
              />
            )}

            {isRoot && !reduceMotion && (
              <>
                <SparkleGlyph x={radius * 0.82} y={-radius * 0.88} size={7} color="#ffffff" />
                <SparkleGlyph x={-radius * 1.02} y={radius * 0.5} size={4.5} color={node.color} />
              </>
            )}

            {/* Icon core. The button fills the whole ring so the entire node is
                the hit target, not just the glyph. */}
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
                  <svg
                    viewBox="0 0 24 24"
                    width={iconSize}
                    height={iconSize}
                    fill={iconColor}
                    aria-hidden="true"
                    style={{
                      // A touch of the icon's own colour as light, which is what
                      // "large, crisp, high contrast" needs against a dark field.
                      filter: reduceMotion ? undefined : `drop-shadow(0 0 ${radius * 0.14}px ${iconColor}aa)`,
                    }}
                  >
                    <path d={logo.path} />
                  </svg>
                ) : (
                  <Component size={iconSize * 0.86} color={node.color} />
                )}
              </button>
            </foreignObject>
          </motion.g>
        </motion.g>

        <motion.text
          y={radius + 17}
          textAnchor="middle"
          fontSize={TITLE_FONT[node.tier]}
          fontWeight={600}
          fill="#f0f0f0"
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
          fill="#8a8f98"
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
