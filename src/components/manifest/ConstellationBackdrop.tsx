import { useMemo } from 'react';
import { hashStringToIndex } from '../../manifest/colorHash';

/**
 * The constellation's static backdrop: a near-black space fill and an
 * ambient star field. Deliberately NOT atmospheric — no nebula, no large
 * blurred color washes. The engineering grid lives in ConstellationScene
 * (rendered inside the same pan/zoom transform as the content, so it
 * scales/pans with the scene); this layer only owns what sits behind
 * that grid. This is also NOT where the constellation's own bright,
 * saturated "living star" quality lives (that belongs to
 * ConstellationStar so it reads as the focal element) — but a
 * completely uniform, completely static field still reads as a
 * repeating pattern, so a minority of background stars are slightly
 * bigger/brighter or slowly twinkle (opacity only, never blurred).
 */

const STAR_COUNT = 90;
const BRIGHT_STAR_RATIO = 0.16;
const TWINKLE_STAR_RATIO = 0.14;

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

export interface ConstellationBackdropProps {
  viewportX: number;
  viewportY: number;
}

export function ConstellationBackdrop({ viewportX, viewportY }: ConstellationBackdropProps) {
  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => {
        const kindRoll = jitter(`star:${i}:kind`, 1013);
        const kind: 'dim' | 'bright' | 'twinkle' =
          kindRoll < TWINKLE_STAR_RATIO ? 'twinkle' : kindRoll < TWINKLE_STAR_RATIO + BRIGHT_STAR_RATIO ? 'bright' : 'dim';
        const baseRadius = kind === 'bright' ? 1.0 + jitter(`star:${i}:r`, 991) * 0.5 : 0.4 + jitter(`star:${i}:r`, 991) * 0.5;
        const baseOpacity =
          kind === 'bright'
            ? 0.45 + jitter(`star:${i}:op`, 883) * 0.3
            : kind === 'twinkle'
              ? 0.22 + jitter(`star:${i}:op`, 883) * 0.18
              : 0.08 + jitter(`star:${i}:op`, 883) * 0.16;
        return {
          cx: `${jitter(`star:${i}:x`, 9973) * 100}%`,
          cy: `${jitter(`star:${i}:y`, 9967) * 100}%`,
          r: baseRadius,
          opacity: baseOpacity,
          kind,
          twinkleMinOpacity: baseOpacity * 0.4,
          twinkleMaxOpacity: Math.min(0.85, baseOpacity * 2.2),
          twinkleDur: 3.5 + jitter(`star:${i}:tdur`, 4127) * 5.5,
          twinkleBegin: jitter(`star:${i}:tbegin`, 4159) * 6,
        };
      }),
    [],
  );

  return (
    <>
      <rect x={0} y={0} width="100%" height="100%" fill="url(#constellation-space-bg)" />

      {/* Ambient star field — sharp, unblurred points. Mostly dim/static,
          a minority brighter, a smaller minority slowly twinkling
          (opacity animation only, never a blur) — enough variety to read
          as depth without any haze. A slight parallax drift (a fraction
          of the pan offset) reads as "further away" than the
          constellation itself. */}
      <g aria-hidden="true" transform={`translate(${viewportX * 0.04} ${viewportY * 0.04})`}>
        {stars.map((star, i) => (
          <circle key={i} cx={star.cx} cy={star.cy} r={star.r} fill="#ffffff" opacity={star.kind === 'twinkle' ? undefined : star.opacity}>
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
