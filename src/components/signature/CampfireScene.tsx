import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { CampfireFireflies } from './CampfireFireflies';

const IMAGE_SRC = '/startup/campfire-scene.webp';

/** Intrinsic size of the optimized scene asset. */
const ART_W = 902;
const ART_H = 1022;

/* ------------------------------------------------------------------ *
 * The 3-frame fire sprite that lights the campfire pit — approved and
 * shipped as part of startup.log's campfire scene.
 * ------------------------------------------------------------------ */

const FIRE_SRC = '/startup/campfire-fire.webp';

/** The sheet is 3 frames laid out horizontally, each 200×310. */
const FIRE_FRAMES = 3;
const FIRE_W = 200;
const FIRE_H = 310;

/**
 * Where the sheet's frames sit in the scene's own pixel grid.
 *
 * Not guessed: the frames turned out to be a re-render of a crop of
 * `campfire-scene.webp` itself, so the offset is recoverable. Matching the
 * sheet's bottom band — the stone ring, which is identical across all three
 * frames — against the scene by normalised cross-correlation peaks at 0.917
 * at exactly 1.00 scale and this origin. At that placement a pasted frame
 * differs from the scene by mean 7/255 outside the flame, i.e. the frames
 * are drop-in replacements for that rectangle rather than a decal that has
 * to be fitted over it. That is what lets this be an opaque overlay: no
 * cut-out mask, no seam, and the pit keeps the artwork's own baked firelight.
 */
const FIRE_ORIGIN_X = 471;
const FIRE_ORIGIN_Y = 614;

/**
 * 140ms/frame ≈ 7fps. Slow enough that three frames read as a cycling flame
 * rather than a strobe, fast enough not to read as a slideshow.
 */
const FIRE_FRAME_MS = 140;

/**
 * How long the scene takes to come up out of the dark once the fire catches.
 *
 * Long on purpose. The reveal is the payoff at the end of a ~2.2s boot
 * (PROFILE_HOLD_MS in timing.ts exists to protect exactly this beat), and a
 * fast fade reads as an image finishing loading rather than as a fire taking
 * hold. `ease-out` puts most of the change early, so the flame is legible
 * well before the far mountains finish arriving.
 */
/* Exported (Phase 9C) so the cursor handoff can be scheduled off the
 * campfire's *actual* reveal duration instead of a second hand-tuned copy of
 * it that would silently drift if this value ever changed. Export only — the
 * value, the reveal, and every other campfire behaviour are untouched. */
export const REVEAL_MS = 2400;

/**
 * The scene's state before the fire catches.
 *
 * Two properties rather than one, because they suppress different things.
 * Opacity over the pane's own `bg-black` scales every pixel toward black, so
 * the flame — by far the brightest thing in the frame — crosses the
 * visibility threshold first and the dim mountains and stars last; that
 * ordering is what makes the reveal read as firelight spreading rather than
 * as a crossfade. Brightness then holds the midtones (stones, ground, the
 * lake) down while that happens, so the pit lights up before the ground
 * around it does. Both land on their neutral values, so the settled scene is
 * pixel-for-pixel the one that was already approved.
 */
const REVEAL_FROM = { opacity: 0, filter: 'brightness(0.4)' } as const;
const REVEAL_TO = { opacity: 1, filter: 'brightness(1)' } as const;

/**
 * Steps the sheet through its frames once `ignite` is true, so combustion
 * starts on READY rather than on mount.
 *
 * Holds frame 0 both before ignition and under `prefers-reduced-motion` —
 * for reduced motion that *is* the static final state, because frame 0 is
 * the flame the scene art already has baked in at this exact position.
 * Note the deliberate asymmetry with `instant`: a repeat visit this session
 * skips the typing but still gets a live fire, since a frozen campfire in a
 * night scene reads as a broken image, not as a completed animation.
 */
function useFireFrame(ignite: boolean): number {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!ignite || prefersReducedMotion()) return undefined;
    const id = window.setInterval(
      () => setFrame((f) => (f + 1) % FIRE_FRAMES),
      FIRE_FRAME_MS,
    );
    return () => window.clearInterval(id);
  }, [ignite]);

  return frame;
}
/* ------------------------- end fire sprite block ------------------------ */

/**
 * Where the crop is anchored when the pane's aspect ratio doesn't match the
 * art's. Horizontal 0.62 keeps the campfire (source x 54–73%) fully in frame
 * even at the narrowest supported pane, where cover crops ~57% of the art's
 * width away. Vertical 1.0 anchors to the bottom, so the one thing a wide,
 * short pane crops is empty sky rather than the fire and the ground it lights.
 */
const FOCAL_X = 0.62;
const FOCAL_Y = 1;

/** Exported (Phase 9D) so the firefly layer can be positioned in the same
 * art-space rect the fire sprite uses, instead of re-deriving the scene's
 * geometry from a second, independently-drifting source. Export only — the
 * shape is unchanged. */
export interface SceneRect {
  width: number;
  height: number;
  left: number;
  top: number;
}

/**
 * Cover math, done here rather than delegated to `object-fit: cover`, for one
 * reason: overlays (the fire sprite, shooting stars) have to be positioned in
 * the *art's* coordinate space, and `object-fit` gives no way to ask where a
 * given source pixel landed. Returning the painted rect explicitly means the
 * `<img>` element and every overlay share one box, so they align by
 * construction instead of by two independently-guessed percentages.
 */
function coverRect(containerW: number, containerH: number): SceneRect {
  const scale = Math.max(containerW / ART_W, containerH / ART_H);
  const width = ART_W * scale;
  const height = ART_H * scale;
  return {
    width,
    height,
    left: (containerW - width) * FOCAL_X,
    top: (containerH - height) * FOCAL_Y,
  };
}

/**
 * The pixel-art scene behind startup.log's terminal output — a right-weighted
 * night camp rendered from `public/startup/campfire-scene.webp` (902×1022,
 * ~47KB, cropped from the approved reference so none of that mockup's own
 * fake chrome or placeholder text is baked in).
 *
 * Sized to cover the pane via a measured rect (see `coverRect`) instead of the
 * previous `h-full w-auto` + `object-fit: contain`, which had two defects this
 * replaces: Tailwind preflight's `img{max-width:100%}` capped the width below
 * ~1300px and `contain` letterboxed the remainder, leaving up to 437px of dead
 * black under the art at 768px; and overlay positions were percentages of the
 * *container* while the image was sized off its own height, so the two drifted
 * apart by as much as 332px vertically. Both were measured, not theorized.
 *
 * Deliberately carries no glow layer. The artwork already contains its own
 * baked firelight — warm falloff on the stone ring, the log, the grass, and a
 * reflection down the lake — and the radial-gradient overlay that used to sit
 * here fought all of it: ~3× the flame's width, centred by different math than
 * the image, and animated by uniform `scale()`, which reads as a breathing
 * blob rather than combustion. Illumination now comes from the art, and (once
 * the sprite lands) from the flame itself.
 *
 * `ignite` now drives the fire sprite (see the fire sprite block at
 * the top of this file). `instant` is still inert here on purpose: it is true
 * for a repeat visit as well as for reduced motion, and only the latter should
 * stop the flame.
 */
export function CampfireScene({ ignite, instant }: { ignite: boolean; instant?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<SceneRect | null>(null);
  const fireFrame = useFireFrame(ignite);

  // `instant` covers reduced motion *and* a repeat visit this session, and
  // both want the same thing here: the settled scene, no reveal. That is the
  // opposite of the flame loop's reading of the same flag (see useFireFrame) —
  // a reveal is a one-time transition, so "already complete" is a valid
  // resting state for it; a fire that has stopped moving is not.
  const revealed = instant || ignite;

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setRect(coverRect(width, height));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      style={{
        ...(revealed ? REVEAL_TO : REVEAL_FROM),
        // Skipped entirely when `instant`, so a repeat visit renders settled
        // on the first paint instead of transitioning from a state it was
        // never shown in.
        transition: instant ? undefined : `opacity ${REVEAL_MS}ms ease-out, filter ${REVEAL_MS}ms ease-out`,
      }}
    >
      {rect && (
        <>
          <img
            src={IMAGE_SRC}
            alt=""
            decoding="async"
            className="absolute max-w-none"
            style={{ width: rect.width, height: rect.height, left: rect.left, top: rect.top }}
          />
          {/* Fire sprite overlay — see the block at the top of this file.
              A window onto the sheet rather than a background-image, so the
              frames go through the same <img> scaling path as the scene
              underneath them; a background-image resamples on a different
              code path and the two disagree by a fraction of a pixel at the
              overlay's edge, which is exactly where a seam would show. */}
          {(() => {
            const scale = rect.width / ART_W;
            return (
              <div
                className="absolute overflow-hidden"
                style={{
                  left: rect.left + FIRE_ORIGIN_X * scale,
                  top: rect.top + FIRE_ORIGIN_Y * scale,
                  width: FIRE_W * scale,
                  height: FIRE_H * scale,
                }}
              >
                <img
                  src={FIRE_SRC}
                  alt=""
                  decoding="async"
                  className="absolute top-0 max-w-none"
                  style={{
                    width: FIRE_W * FIRE_FRAMES * scale,
                    height: FIRE_H * scale,
                    left: -fireFrame * FIRE_W * scale,
                  }}
                />
              </div>
            );
          })()}
          {/* Phase 9D: the firefly layer, positioned through this same rect
              (see CampfireFireflies.tsx). Last in the block so it sits above
              the artwork, but it never overlaps the fire sprite's rect — the
              stacking order is incidental, the placement is deliberate. */}
          <CampfireFireflies rect={rect} scale={rect.width / ART_W} />
        </>
      )}
    </div>
  );
}
