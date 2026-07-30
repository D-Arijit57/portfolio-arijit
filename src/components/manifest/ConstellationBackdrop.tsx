import { useMemo } from 'react';
import { hashStringToIndex } from '../../manifest/colorHash';

/**
 * The constellation's static backdrop: space gradient, a layered nebula
 * haze, and an ambient star field with genuine per-star variation. This
 * is deliberately NOT where the constellation's own bright, saturated
 * "living star" quality lives (that belongs to ConstellationStar so it
 * reads as the focal element) — but a completely uniform, completely
 * static field reads as a repeating pattern rather than deep space, so a
 * small minority of background stars do softly glow or slowly twinkle,
 * at a fraction of the constellation's own brightness/timing variety.
 */

const STAR_COUNT = 90;
// Every background star is dim/static/sharp by default; only a minority
// opts into a softer glow (blurred, slightly bigger, brighter) or a slow
// twinkle (opacity drifts over several seconds) — "some stars should
// barely be visible, some should softly glow, some should twinkle."
const GLOW_STAR_RATIO = 0.22;
const TWINKLE_STAR_RATIO = 0.16;

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

interface NebulaCloud {
  cx: string;
  cy: string;
  rx: number;
  ry: number;
  color: string;
  opacity: number;
  filterId: string;
}

// Overlapping clouds at different color temperatures and blur radii —
// depth through variety, not through a single bigger blob. Deliberately
// understated: this should only register after a few seconds of looking,
// never as an obvious painted backdrop.
const NEBULA_CLOUDS: NebulaCloud[] = [
  { cx: '22%', cy: '20%', rx: 520, ry: 340, color: '#3d52a8', opacity: 0.17, filterId: 'constellation-nebula-blur' },
  { cx: '80%', cy: '76%', rx: 560, ry: 370, color: '#7d3f9e', opacity: 0.15, filterId: 'constellation-nebula-blur-wide' },
  { cx: '52%', cy: '92%', rx: 440, ry: 250, color: '#1f5f8b', opacity: 0.11, filterId: 'constellation-nebula-blur-tight' },
  { cx: '62%', cy: '10%', rx: 380, ry: 220, color: '#8a4a3a', opacity: 0.07, filterId: 'constellation-nebula-blur-wide' },
  { cx: '8%', cy: '68%', rx: 340, ry: 260, color: '#2f6d63', opacity: 0.09, filterId: 'constellation-nebula-blur-tight' },
];

export interface ConstellationBackdropProps {
  viewportX: number;
  viewportY: number;
}

export function ConstellationBackdrop({ viewportX, viewportY }: ConstellationBackdropProps) {
  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => {
        const kindRoll = jitter(`star:${i}:kind`, 1013);
        const kind: 'dim' | 'glow' | 'twinkle' =
          kindRoll < TWINKLE_STAR_RATIO ? 'twinkle' : kindRoll < TWINKLE_STAR_RATIO + GLOW_STAR_RATIO ? 'glow' : 'dim';
        const baseRadius =
          kind === 'glow'
            ? 1.0 + jitter(`star:${i}:r`, 991) * 0.9
            : kind === 'twinkle'
              ? 0.7 + jitter(`star:${i}:r`, 991) * 0.7
              : 0.35 + jitter(`star:${i}:r`, 991) * 0.6;
        const baseOpacity =
          kind === 'glow'
            ? 0.28 + jitter(`star:${i}:op`, 883) * 0.24
            : kind === 'twinkle'
              ? 0.2 + jitter(`star:${i}:op`, 883) * 0.2
              : 0.06 + jitter(`star:${i}:op`, 883) * 0.2;
        return {
          cx: `${jitter(`star:${i}:x`, 9973) * 100}%`,
          cy: `${jitter(`star:${i}:y`, 9967) * 100}%`,
          r: baseRadius,
          opacity: baseOpacity,
          kind,
          twinkleMinOpacity: baseOpacity * 0.35,
          twinkleMaxOpacity: Math.min(0.85, baseOpacity * 2.4),
          twinkleDur: 3.5 + jitter(`star:${i}:tdur`, 4127) * 5.5,
          twinkleBegin: jitter(`star:${i}:tbegin`, 4159) * 6,
        };
      }),
    [],
  );

  return (
    <>
      <rect x={0} y={0} width="100%" height="100%" fill="url(#constellation-space-bg)" />

      {/* Layered nebula haze — several overlapping, differently-blurred,
          differently-toned clouds rather than one blob, so depth reads
          gradually instead of all at once. Additive (screen) blend so it
          never muddies the black background; a tiny parallax drift (a
          small fraction of the pan offset) reads as "further away" than
          the stars. */}
      <g aria-hidden="true" opacity={0.9} style={{ mixBlendMode: 'screen' }} transform={`translate(${viewportX * 0.015} ${viewportY * 0.015})`}>
        {NEBULA_CLOUDS.map((cloud, i) => (
          <ellipse
            key={i}
            cx={cloud.cx}
            cy={cloud.cy}
            rx={cloud.rx}
            ry={cloud.ry}
            fill={cloud.color}
            opacity={cloud.opacity}
            filter={`url(#${cloud.filterId})`}
          />
        ))}
      </g>

      {/* Ambient star field — a slightly stronger parallax drift than the
          nebula, so it reads as nearer. Mostly static dim points (never
          uniform in size/brightness), a minority with a soft blurred
          glow, and a smaller minority that slowly twinkles — enough
          variety to read as deep space rather than a repeating pattern,
          without competing with the constellation's own stars. */}
      <g aria-hidden="true" transform={`translate(${viewportX * 0.04} ${viewportY * 0.04})`}>
        {stars.map((star, i) => (
          <circle
            key={i}
            cx={star.cx}
            cy={star.cy}
            r={star.r}
            fill="#ffffff"
            opacity={star.kind === 'twinkle' ? undefined : star.opacity}
            filter={star.kind === 'glow' ? 'url(#constellation-bg-star-glow)' : undefined}
          >
            {star.kind === 'twinkle' && (
              <animate
                attributeName="opacity"
                values={`${star.twinkleMinOpacity};${star.twinkleMaxOpacity};${star.twinkleMinOpacity}`}
                dur={`${star.twinkleDur}s`}
                begin={`${star.twinkleBegin}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
                keyTimes="0;0.5;1"
              />
            )}
          </circle>
        ))}
      </g>
    </>
  );
}
