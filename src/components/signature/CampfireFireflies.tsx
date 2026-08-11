import React from 'react';
import type { SceneRect } from './CampfireScene';

/**
 * Warm muted gold — `MUTED_PALETTE`'s tan (src/manifest/colorHash.ts), reused
 * rather than introducing a firefly-specific hex. Deliberately desaturated:
 * a saturated yellow-green reads as neon against this artwork, and the scene's
 * own baked firelight is the only thing that should look genuinely bright.
 */
const FIREFLY_COLOR = '#d7ba7d';

/** One waypoint of a wander path, as an art-space offset from the base position. */
type Waypoint = readonly [dx: number, dy: number];

interface Firefly {
  /** Art-space position, in `campfire-scene.webp`'s own 902×1022 pixel grid. */
  x: number;
  y: number;
  /** Art-space diameter. Scaled with the artwork like every other overlay. */
  size: number;
  peakOpacity: number;
  /** One full lap of the wander path. Long — this is a drift, not a flight. */
  driftMs: number;
  /** The glow pulse, deliberately unrelated to the drift period. */
  pulseMs: number;
  pulseDelayMs: number;
  /** Four waypoints; the path returns to the base position to close the loop. */
  path: readonly [Waypoint, Waypoint, Waypoint, Waypoint];
}

/**
 * Twelve hand-placed fireflies, drifting through the dark vegetation and
 * shoreline that flank the campfire.
 *
 * Placement is the whole design, and it is subtractive: the sky is already
 * carrying ~60 baked stars and the flame is already throwing baked embers, so
 * a warm point in either place would add noise while being invisible *as a
 * firefly*. Every position below therefore sits in the one unoccupied band —
 * where the firelight falls off into darkness — and stays inside the region
 * that remains on screen at every width the scene renders at (art x 126–825,
 * y 205–1022, measured).
 *
 * Each firefly wanders a closed four-waypoint loop rather than sliding along a
 * straight line, because a straight line is the thing that reads as "animated
 * particle" instead of "insect." The paths are also directional by intent: the
 * two fireflies nearest the fire (#6, #8) wander *away* from it and the two on
 * its left (#3, #5) wander further left, so no firefly's excursion can carry it
 * into the fire sprite's rect (art x 471–671, y 614–924) — verified against the
 * widest point of every path, not just the base positions.
 *
 * Drift and pulse are separate cycles with no common factor, so a firefly is
 * never brightest at the same point on its path twice in a row, and the twelve
 * of them never visibly resynchronise. That coupling — continuous slow motion,
 * independent slow glow — is what makes it read as alive rather than as twelve
 * things obeying one clock.
 *
 * Path amplitude and period are both tuned for *perceptibility of the motion
 * itself*, which turned out to be the thing that matters. The first pass used
 * ~20px paths over 27–43s: a real, forever-running animation that read as
 * static, because 0.5px/second is below the threshold at which the eye resolves
 * movement at all — so the layer looked like eight dots that had appeared once
 * and stopped. These paths are ~2.4× wider and run ~1.7× faster (≈2.5px/second
 * in art space), which is still unhurried enough to ignore while reading the
 * terminal, but fast enough that a firefly you actually look at is visibly
 * going somewhere. Brightness, size and count were deliberately *not* raised to
 * buy that legibility — motion was the missing variable, not presence.
 *
 * Hardcoded rather than hashed or randomised: screenshots have to reproduce
 * exactly for visual QA, and a fixed table is also simply easier to tune by
 * hand than a seed is.
 */
const FIREFLIES: Firefly[] = [
  { x: 300, y: 858, size: 4.0, peakOpacity: 0.88, driftMs: 19000, pulseMs: 6200, pulseDelayMs: 0,
    path: [[-22, -16], [-38, 10], [-14, 26], [12, -10]] },
  { x: 238, y: 902, size: 3.6, peakOpacity: 0.80, driftMs: 24000, pulseMs: 7400, pulseDelayMs: 1800,
    path: [[18, -22], [36, 6], [10, 28], [-14, 12]] },
  { x: 382, y: 828, size: 4.4, peakOpacity: 0.92, driftMs: 17000, pulseMs: 5600, pulseDelayMs: 3300,
    path: [[-26, -14], [-46, 8], [-20, 22], [-8, -20]] },
  { x: 176, y: 940, size: 3.7, peakOpacity: 0.78, driftMs: 27000, pulseMs: 8300, pulseDelayMs: 900,
    path: [[20, -24], [38, -6], [14, 22], [-12, 14]] },
  { x: 412, y: 792, size: 3.5, peakOpacity: 0.84, driftMs: 21000, pulseMs: 6800, pulseDelayMs: 4600,
    path: [[-24, -20], [-44, -6], [-18, 18], [-6, 24]] },
  { x: 716, y: 812, size: 4.2, peakOpacity: 0.90, driftMs: 18500, pulseMs: 5900, pulseDelayMs: 2400,
    path: [[24, -18], [42, 8], [18, 26], [8, -14]] },
  { x: 778, y: 874, size: 3.6, peakOpacity: 0.82, driftMs: 25500, pulseMs: 7900, pulseDelayMs: 5200,
    path: [[16, -22], [34, 4], [10, 26], [-10, -12]] },
  { x: 700, y: 918, size: 4.0, peakOpacity: 0.86, driftMs: 22500, pulseMs: 6500, pulseDelayMs: 3900,
    path: [[26, -16], [44, 10], [20, 28], [10, -10]] },
  { x: 340, y: 780, size: 4.3, peakOpacity: 0.94, driftMs: 20500, pulseMs: 7100, pulseDelayMs: 2100,
    path: [[-20, -14], [-36, 6], [-16, 20], [-6, -16]] },
  { x: 208, y: 828, size: 3.4, peakOpacity: 0.79, driftMs: 26000, pulseMs: 6100, pulseDelayMs: 6000,
    path: [[22, -18], [40, 4], [16, 24], [-10, 10]] },
  { x: 752, y: 940, size: 3.9, peakOpacity: 0.87, driftMs: 23500, pulseMs: 8000, pulseDelayMs: 1200,
    path: [[18, -20], [34, 2], [12, 24], [-8, -10]] },
  { x: 268, y: 962, size: 3.5, peakOpacity: 0.83, driftMs: 16500, pulseMs: 5300, pulseDelayMs: 4300,
    path: [[-18, -20], [-34, 4], [-14, 18], [8, 12]] },
];

/**
 * startup.log's firefly layer — the quiet half of "the fire is alive, and the
 * environment around it is quietly alive too."
 *
 * Rendered inside `CampfireScene`'s measured-art block and positioned through
 * the scene's own `rect`/`scale`, exactly like the fire sprite: art-space
 * coordinates in, screen pixels out. That is what keeps a firefly drifting over
 * the same patch of grass at every viewport width without this component ever
 * measuring anything, listening for a resize, or knowing a breakpoint exists —
 * the wander offsets are scaled too, so a firefly covers the same ground
 * relative to the artwork rather than a fixed screen distance that would read
 * as a much wider excursion on a small pane.
 *
 * Every per-firefly value travels as a CSS custom property so all eight share
 * two keyframes and one class (see `.campfire-firefly` in index.css) rather
 * than generating eight of each. Only `opacity` and `transform` animate, so the
 * layer is GPU-composited and costs no layout or paint work — and it runs on no
 * JS timer at all, unlike the fire sprite it sits beside.
 *
 * `pointer-events-none` and `aria-hidden="true"` are inherited from the scene
 * container (both inherit through the subtree), so this layer deliberately
 * re-declares neither: it is decorative, unfocusable, and unannounced by
 * construction rather than by repetition.
 */
export function CampfireFireflies({ rect, scale }: { rect: SceneRect; scale: number }) {
  return (
    <>
      {FIREFLIES.map((firefly) => {
        const [p1, p2, p3, p4] = firefly.path;
        const px = (v: number) => `${(v * scale).toFixed(2)}px`;
        return (
          <span
            key={`${firefly.x}:${firefly.y}`}
            className="campfire-firefly absolute rounded-full"
            style={
              {
                left: rect.left + firefly.x * scale,
                top: rect.top + firefly.y * scale,
                width: firefly.size * scale,
                height: firefly.size * scale,
                backgroundColor: FIREFLY_COLOR,
                '--firefly-peak': firefly.peakOpacity,
                '--firefly-drift-duration': `${firefly.driftMs}ms`,
                '--firefly-pulse-duration': `${firefly.pulseMs}ms`,
                '--firefly-pulse-delay': `${firefly.pulseDelayMs}ms`,
                '--firefly-x1': px(p1[0]), '--firefly-y1': px(p1[1]),
                '--firefly-x2': px(p2[0]), '--firefly-y2': px(p2[1]),
                '--firefly-x3': px(p3[0]), '--firefly-y3': px(p3[1]),
                '--firefly-x4': px(p4[0]), '--firefly-y4': px(p4[1]),
              } as React.CSSProperties
            }
          />
        );
      })}
    </>
  );
}
