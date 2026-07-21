import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { RESUME_PAGE_WIDTH_PX, RESUME_PAGE_HEIGHT_PX } from './ResumeDocument';

/**
 * Sprint 10F: the one rasterization step both the 3D preview's texture and
 * the "Download PDF" action build on — capturing once and reusing the
 * canvas for both is what guarantees they can never visually drift apart.
 * Scale 2 gives a crisp texture/print without inflating the source DOM's
 * layout (which stays fixed-width, see ResumeDocument.tsx).
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

export function downloadResumePdf(canvas: HTMLCanvasElement, fileName = 'Arijit_Das_Resume.pdf'): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const imageData = canvas.toDataURL('image/png');

  // Scale the captured raster onto the page preserving its aspect ratio,
  // anchored to the top edge (matches a single-page resume with no crop).
  const rasterAspect = RESUME_PAGE_HEIGHT_PX / RESUME_PAGE_WIDTH_PX;
  const drawWidth = A4_WIDTH_PT;
  const drawHeight = drawWidth * rasterAspect;
  const height = Math.min(drawHeight, A4_HEIGHT_PT);

  doc.addImage(imageData, 'PNG', 0, 0, drawWidth, height);
  doc.save(fileName);
}
