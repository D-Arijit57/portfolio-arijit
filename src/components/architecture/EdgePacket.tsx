import React from 'react';
import type { EdgeMotionConfig, PacketShape } from './edgeCommunication';

/**
 * Architecture Canvas 2.0 — the two ways an edge's traffic renders,
 * both pure SVG/SMIL (no rAF, no per-frame React state): a trail of
 * discrete shapes traveling along the edge's own <path> via
 * <animateMotion>/<mpath> (EdgePacketTrail), or a continuous "current in a
 * wire" dash-flow meant to be rendered as a child of the path itself
 * (EdgeFlowAnimation) — kept as two small exports rather than one
 * component with a mode branch in its return type, since their render
 * *targets* differ (sibling shapes vs. a child of the path element),
 * not just their content.
 *
 * calcMode="linear" throughout: an eased loop decelerates to zero velocity
 * at every repeat boundary, which reads as a stutter on something meant to
 * be perpetual — ease-in-out is for this canvas's discrete, one-shot
 * transitions (hover-dim, panel slide-in), not this.
 */

function PacketShapeGlyph({ shape, size, color }: { shape: PacketShape; size: number; color: string }) {
  if (shape === 'circle') {
    return <circle r={size / 2} fill={color} />;
  }
  if (shape === 'diamond') {
    return <rect x={-size / 2} y={-size / 2} width={size} height={size} fill={color} transform="rotate(45)" />;
  }
  // sparkle: a small 4-point star, centered at the local origin so
  // <animateMotion> (which translates by local origin) centers it correctly.
  const s = size;
  const inner = size * 0.28;
  return (
    <path
      d={`M 0,${-s} L ${inner},${-inner} L ${s},0 L ${inner},${inner} L 0,${s} L ${-inner},${inner} L ${-s},0 L ${-inner},${-inner} Z`}
      fill={color}
    />
  );
}

/**
 * A staggered trail of shapes traveling the full length of `pathId`,
 * looping forever (or once, for a Trace Mode step burst). Rendered as
 * siblings of the edge's <path>, inside the same opacity-carrying wrapper
 * the edge itself uses — so a dimmed edge's packets fade right along with
 * its stroke, which is what "pauses" them without any literal SMIL/CSS
 * pause API.
 */
export function EdgePacketTrail({
  pathId,
  config,
  repeatOnce = false,
}: {
  pathId: string;
  config: Extract<EdgeMotionConfig, { mode: 'packets' }>;
  repeatOnce?: boolean;
}) {
  const count = repeatOnce ? 1 : config.packetCount;

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <PacketShapeGlyph shape={config.shape} size={config.size} color={config.color} />
          <animateMotion
            dur={`${config.durationS}s`}
            repeatCount={repeatOnce ? 1 : 'indefinite'}
            calcMode="linear"
            rotate={0}
            begin={repeatOnce ? '0s' : `${(i * config.durationS) / count}s`}
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </g>
      ))}
    </>
  );
}

/**
 * Continuous "current flowing through a wire" — meant to be rendered as a
 * *child* of the edge's own <path> (which must also carry a matching
 * `strokeDasharray={\`${dashLength} ${gapLength}\`}`). The dash pattern's
 * total length and this animation's `to` offset are computed together so
 * the loop has no visible seam at the repeat boundary.
 */
export function EdgeFlowAnimation({ config }: { config: Extract<EdgeMotionConfig, { mode: 'flow' }> }) {
  const patternLength = config.dashLength + config.gapLength;
  return (
    <animate
      attributeName="stroke-dashoffset"
      from={0}
      to={-patternLength}
      dur={`${config.durationS}s`}
      repeatCount="indefinite"
      calcMode="linear"
    />
  );
}
