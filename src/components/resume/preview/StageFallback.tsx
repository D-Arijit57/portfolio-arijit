import { useEffect, useRef } from 'react';
import { REST_YAW_DEG, REST_PITCH_DEG } from '../scene/stageConfig';
import { prefersReducedMotion } from '../../../lib/typingReveal';

/**
 * Sprint 18 (spec §8.3): tiers 3 and 4 of the fallback ladder.
 *
 * Spec §13.29 rates a missing flat fallback as a *functional* failure rather
 * than an aesthetic one, and for a resume specifically: without it the
 * content is invisible to screen readers, crawlers, no-WebGL browsers, and
 * anyone whose GPU is blocklisted. The resume's text is always readable in
 * the left pane regardless — this covers the preview panel itself.
 *
 * Two tiers in one component, because they differ only in what they have to
 * draw with:
 *
 *   - **Tier 3, CSS 3D card.** A DOM element carrying the rasterised page,
 *     rotated with the same yaw and pitch the real stage uses, over layered
 *     box-shadows and a CSS perspective floor. Spec §8.1 puts this at "~80%
 *     of the way there at ~1% of the cost", and it is what Linear and Stripe
 *     actually ship.
 *   - **Tier 4, flat poster.** The same raster with a drop shadow, no
 *     transforms. This is also the poster frame: spec §10.1 point 5 and §15
 *     require the panel to first-paint without WebGL on the critical path.
 *
 * The CSS floor here is the one Sprint 17 built and Sprint 18's spec demoted
 * from primary to fallback (spec §4.1) — kept rather than deleted, since
 * this is exactly the tier it was always right for.
 */
export function StageFallback({
  canvas,
  flat = false,
}: {
  /** The rasterised page, once available. Null renders an empty stage. */
  canvas: HTMLCanvasElement | null;
  /** Tier 4: skip the 3D transform entirely. */
  flat?: boolean;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const reduceMotion = prefersReducedMotion();

  // The rasteriser hands back a live canvas element rather than a data URL,
  // so adopt it directly instead of paying for a base64 round-trip.
  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || !canvas) return;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    holder.replaceChildren(canvas);
    return () => {
      if (canvas.parentNode === holder) holder.removeChild(canvas);
    };
  }, [canvas]);

  const transform =
    flat || reduceMotion
      ? undefined
      : `rotateX(${REST_PITCH_DEG}deg) rotateY(${REST_YAW_DEG}deg)`;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[var(--resume-stage-bg)]">
      {!flat && (
        <>
          <div
            className="pointer-events-none absolute inset-x-[-50%] bottom-[-10%] h-[70%] origin-bottom"
            style={{
              transform: 'perspective(600px) rotateX(72deg)',
              backgroundImage: `
                repeating-linear-gradient(to right,  rgba(120,130,160,.16) 0 1px, transparent 1px 60px),
                repeating-linear-gradient(to bottom, rgba(120,130,160,.16) 0 1px, transparent 1px 60px)`,
              maskImage: 'radial-gradient(ellipse 60% 80% at 50% 100%, #000 0%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse 60% 80% at 50% 100%, #000 0%, transparent 75%)',
            }}
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(90,110,180,.14),transparent)] blur-2xl" />
        </>
      )}

      <div className="absolute inset-0 grid place-items-center [perspective:1400px]">
        <div className="relative" style={{ transform, width: '38%', minWidth: 200 }}>
          {/* Offset sibling rather than a drop-shadow filter: a filter follows
              the rotated geometry and produces a symmetric halo, which reads
              as a glow instead of a cast shadow. */}
          <div className="absolute inset-0 -z-10 translate-x-3 translate-y-6 scale-[0.97] rounded-sm bg-black/70 blur-2xl" />
          <div className="overflow-hidden rounded-[2px] bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,.8)]">
            <div ref={holderRef} className="aspect-[210/297] w-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Spec §8.3: the tier decision is made once at mount. Deliberately a real
 * context probe rather than a UA sniff — a blocklisted GPU, a disabled flag,
 * and a headless environment all present as "no context" and all need the
 * same answer.
 */
export function detectWebGLSupport(): boolean {
  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (!context) return false;
    // Release immediately — probes that linger count against the browser's
    // hard cap on live WebGL contexts.
    (context as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
