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
