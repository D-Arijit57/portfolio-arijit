import { useMemo } from 'react';
import { hashStringToIndex } from '../../manifest/colorHash';

/**
 * The constellation's static backdrop: space gradient, a faint nebula
 * haze, and a plain (non-shiny, static-brightness) ambient star field
 * with a slight parallax drift tied to the interactive pan offset.
 * Deliberately NOT where the "living, blinking star" quality lives — that
 * belongs to the constellation itself (ConstellationStar / ConstellationEdge)
 * so it reads as the focal element, not diluted across the whole backdrop.
 */

const STAR_COUNT = 70;

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
      Array.from({ length: STAR_COUNT }, (_, i) => ({
        cx: `${jitter(`star:${i}:x`, 9973) * 100}%`,
        cy: `${jitter(`star:${i}:y`, 9967) * 100}%`,
        r: 0.5 + jitter(`star:${i}:r`, 991) * 0.7,
        opacity: 0.18 + jitter(`star:${i}:op`, 883) * 0.22,
      })),
    [],
  );

  return (
    <>
      <rect x={0} y={0} width="100%" height="100%" fill="url(#constellation-space-bg)" />

      {/* Faint nebula haze — two large, heavily-blurred, very
          low-opacity color blobs. Purely atmospheric depth, not a focal
          element: additive (screen) blend so it never muddies the black
          background, and a tiny parallax drift (a small fraction of the
          pan offset) reads as "further away" than the stars. */}
      <g
        aria-hidden="true"
        opacity={0.9}
        style={{ mixBlendMode: 'screen' }}
        transform={`translate(${viewportX * 0.015} ${viewportY * 0.015})`}
      >
        <ellipse cx="28%" cy="24%" rx={360} ry={240} fill="#2b3a7a" opacity={0.09} filter="url(#constellation-nebula-blur)" />
        <ellipse cx="76%" cy="72%" rx={420} ry={280} fill="#5a2f74" opacity={0.07} filter="url(#constellation-nebula-blur)" />
      </g>

      {/* Ambient star field — a slightly stronger parallax drift than the
          nebula, so it reads as nearer. Static brightness only (no glow,
          no twinkle); this layer only needs varying static brightness for
          depth. */}
      <g aria-hidden="true" transform={`translate(${viewportX * 0.04} ${viewportY * 0.04})`}>
        {stars.map((star, i) => (
          <circle key={i} cx={star.cx} cy={star.cy} r={star.r} fill="#ffffff" opacity={star.opacity} />
        ))}
      </g>
    </>
  );
}
