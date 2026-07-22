import * as pdfjsLib from 'pdfjs-dist';

// Vite's standard "worker as a URL" pattern — bundles pdf.js's worker script
// alongside the app rather than needing it hosted separately.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

/**
 * Sprint 11: renders page 1 of the canonical resume PDF (produced by the
 * backend's LaTeX pipeline, server/services/resume/) onto a canvas — the
 * Three.js preview's texture source, and the LaTeX-era replacement for
 * html2canvas rasterizing an off-screen HTML node. The canvas this returns
 * is the same shape resumeCapture.ts's captureResumeCanvas() always
 * returned, so ResumeScene.tsx (camera, resize, lighting, hover) needs zero
 * changes — it never knew or cared how its texture's pixels were produced.
 *
 * scale=2 matches the old pipeline's html2canvas scale for equivalent
 * on-screen sharpness.
 *
 * Sprint 11.4 (Binary Resource Ownership): `pdfjsLib.getDocument({ data })`
 * transfers the given ArrayBuffer to pdf.js's Worker via postMessage,
 * which *detaches* it in this context — the caller's buffer becomes
 * permanently 0 bytes everywhere else it's referenced. This function now
 * clones its input before handing anything to pdf.js, so it can never
 * detach a caller's original buffer regardless of what the caller does
 * with it afterward — ownership of the caller's `pdfBytes` never leaves
 * the caller. Only the internal clone is transferred and consumed.
 */
export async function renderPdfPageToCanvas(pdfBytes: ArrayBuffer, scale = 2): Promise<HTMLCanvasElement> {
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
