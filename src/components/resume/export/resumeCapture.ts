import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { RESUME_PAGE_WIDTH_PX, RESUME_PAGE_HEIGHT_PX } from '../specification/resumeSpec';

/**
 * Sprint 10F.4: the one rasterization step both the 3D preview's texture and
 * the "Download PDF" action build on — capturing once and reusing the
 * canvas for both is what guarantees they can never visually drift apart.
 * Scale 2 gives a crisp texture/print without inflating the source DOM's
 * layout (which stays fixed-width, see ../renderer/ResumeRenderer.tsx +
 * ../specification/resumeSpec.ts).
 */
export async function captureResumeCanvas(node: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(node, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
  });
}

/** A4 in points (jsPDF default unit) — 210mm x 297mm. */
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

/**
 * Sprint 10F.5: `fileName` has no default — this module has no opinion on
 * which resume variant is being exported. Callers resolve the filename from
 * the selected variant's `downloadFilename` (see variants/resumeRegistry.ts)
 * so a new variant never requires touching this file.
 */
export function downloadResumePdf(canvas: HTMLCanvasElement, fileName: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const imageData = canvas.toDataURL('image/png');

  // Scale the captured raster onto the page preserving its aspect ratio —
  // a "contain" fit against the page bounds. Width and height must be
  // scaled together: clamping height to A4_HEIGHT_PT independently of
  // width (as a previous version of this function did) distorts the
  // raster's aspect ratio instead of shrinking it uniformly.
  const rasterAspect = RESUME_PAGE_HEIGHT_PX / RESUME_PAGE_WIDTH_PX;
  let drawWidth = A4_WIDTH_PT;
  let drawHeight = drawWidth * rasterAspect;
  if (drawHeight > A4_HEIGHT_PT) {
    drawHeight = A4_HEIGHT_PT;
    drawWidth = drawHeight / rasterAspect;
  }

  doc.addImage(imageData, 'PNG', 0, 0, drawWidth, drawHeight);
  doc.save(fileName);
}
