import * as pdfjsLib from 'pdfjs-dist';

// Vite's standard "worker as a URL" pattern — bundles pdf.js's worker script
// alongside the app rather than needing it hosted separately.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

/**
 * Renders page 1 of the resume PDF (a static asset, see
 * export/fetchResumePdf.ts) onto a canvas — the Three.js preview's texture
 * source. ResumeScene.tsx (camera, resize, lighting, hover) needs zero
 * changes here — it never knew or cared how its texture's pixels were
 * produced.
 *
 * `pdfjsLib.getDocument({ data })` transfers the given ArrayBuffer to
 * pdf.js's Worker via postMessage, which *detaches* it in this context —
 * cloning first means the caller's buffer is never affected regardless of
 * what pdf.js does with the copy.
 */
/**
 * Sprint 18 (spec §5.5): `scale` is chosen for texel density, not by feel.
 *
 * A4 at scale 1 is 595x842pt, so scale 3 gives a ~1785x2526 raster. The
 * sheet's largest on-screen size is the `focused` state — roughly 390 CSS px
 * tall in a default panel, ~866 device px at DPR 2 — which puts the texture
 * at ~2.9 texels per screen pixel, inside the spec's 2.5-3.5 band. At the
 * previous 2.5 it fell to ~2.4 and the body text softened at focus, which
 * §15 explicitly fails on.
 *
 * That density holds in *both* staged and focused states, so this
 * deliberately does not re-rasterize on focus the way spec §5.5 step 6
 * suggests: one texture already satisfies the requirement everywhere, and a
 * mid-transition texture swap costs a visible hitch for no gain. VRAM lands
 * near 24MB with mipmaps, inside the §10.2 32MB budget.
 */
export async function renderPdfPageToCanvas(pdfBytes: ArrayBuffer, scale = 3): Promise<HTMLCanvasElement> {
  const transferableCopy = pdfBytes.slice(0);
  const pdf = await pdfjsLib.getDocument({ data: transferableCopy }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not acquire 2D canvas context for PDF rendering');

  await page.render({ canvasContext: context, viewport, canvas }).promise;
  return canvas;
}
