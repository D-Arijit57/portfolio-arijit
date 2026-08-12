import backdropUrl from '../../assets/constellation-background.webp';

/**
 * The constellation's static backdrop — a single deep-space image behind the
 * interactive constellation.
 *
 * Previously this drew the backdrop procedurally: a radial space gradient, three
 * heavily-blurred nebula ellipses on a screen blend, and a 70-star ambient field
 * seeded from `hashStringToIndex`. All of that is replaced by the supplied
 * artwork, which already carries its own gradient, haze and star field — keeping
 * the generated layers on top would have doubled the stars and lit the image
 * through a second nebula.
 *
 * Deliberately still NOT where the "living, blinking star" quality lives: that
 * belongs to the constellation itself (ConstellationStar / ConstellationEdge) so
 * it reads as the focal element rather than being diluted across the backdrop.
 *
 * The parallax drift is kept, and is the reason for the oversize. The image is
 * drawn 110% of the viewport and offset −5% on both axes, so translating it by a
 * small fraction of the pan offset can never expose an edge. `slice` makes it
 * cover rather than letterbox at any aspect ratio.
 *
 * Stored as WebP at quality 95 (1536×1024, ~59 kB). The source artwork was a
 * 1.5 MB PNG — by far the largest asset in the project — and PNG is the wrong
 * container for this content: a field of single-pixel stars over a gradient is
 * exactly what lossless entropy coding handles worst. Quality 95 rather than a
 * more typical 80 is deliberate: the stars *are* the fine high-frequency detail
 * lossy encoders discard first, so the saving is taken from the format change
 * rather than from the quality slider.
 */

/** How much larger than the viewport the image is drawn, so the parallax
 * translate always has slack to move into. */
const OVERSCAN = 10;

/** Fraction of the pan offset the backdrop drifts by. The constellation moves at
 * 1.0, so a small value here is what reads as "much further away". */
const PARALLAX = 0.02;

export interface ConstellationBackdropProps {
  viewportX: number;
  viewportY: number;
}

export function ConstellationBackdrop({ viewportX, viewportY }: ConstellationBackdropProps) {
  return (
    <image
      aria-hidden="true"
      href={backdropUrl}
      x={`${-OVERSCAN / 2}%`}
      y={`${-OVERSCAN / 2}%`}
      width={`${100 + OVERSCAN}%`}
      height={`${100 + OVERSCAN}%`}
      preserveAspectRatio="xMidYMid slice"
      transform={`translate(${viewportX * PARALLAX} ${viewportY * PARALLAX})`}
    />
  );
}
