import React, { useLayoutEffect, useRef, useState } from 'react';

const IMAGE_SRC = '/startup/campfire-scene.webp';

/** Intrinsic size of the optimized scene asset. */
const ART_W = 902;
const ART_H = 1022;

/**
 * Where the crop is anchored when the pane's aspect ratio doesn't match the
 * art's. Horizontal 0.62 keeps the campfire (source x 54–73%) fully in frame
 * even at the narrowest supported pane, where cover crops ~57% of the art's
 * width away. Vertical 1.0 anchors to the bottom, so the one thing a wide,
 * short pane crops is empty sky rather than the fire and the ground it lights.
 */
const FOCAL_X = 0.62;
const FOCAL_Y = 1;

interface SceneRect {
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
 * `ignite` is threaded through for the sequence's benefit but has no visual
 * effect yet — the fire sprite it will drive is still behind its prototype
 * gate. Left in place so `TerminalRunner` keeps owning phase, rather than
 * having to re-learn this prop later.
 */
export function CampfireScene({ ignite: _ignite, instant: _instant }: { ignite: boolean; instant?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<SceneRect | null>(null);

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
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {rect && (
        <img
          src={IMAGE_SRC}
          alt=""
          decoding="async"
          className="absolute max-w-none"
          style={{ width: rect.width, height: rect.height, left: rect.left, top: rect.top }}
        />
      )}
    </div>
  );
}
