const API_BASE_URL = 'http://localhost:4000/api';

/**
 * Sprint 11: the one place the frontend asks for the canonical resume PDF —
 * the backend's LaTeX pipeline (server/services/resume/) is the sole
 * producer of these bytes. Both the Three.js preview (via
 * preview/pdfTexture.ts, rendering these exact bytes to a canvas) and the
 * Download button (saving these exact bytes directly) call this; neither
 * regenerates or reconstructs a PDF of its own.
 */
/**
 * Sprint 11.3: `logLabel` distinguishes callers in the console trace
 * (Download button vs. the preview's own build pipeline) without giving
 * this shared function an opinion on who's calling it. Purely additive
 * logging — no behavior change.
 */
export async function fetchResumePdf(variantId: string, logLabel = 'ResumePdf'): Promise<ArrayBuffer> {
  console.log(`[${logLabel}] Fetch started`, { variantId, url: `${API_BASE_URL}/resume/${variantId}.pdf` });
  const res = await fetch(`${API_BASE_URL}/resume/${encodeURIComponent(variantId)}.pdf`);
  console.log(`[${logLabel}] HTTP status`, { status: res.status, ok: res.ok });
  console.log(`[${logLabel}] Content-Length`, { contentLength: res.headers.get('content-length') });
  if (!res.ok) {
    throw new Error(`Failed to fetch resume PDF for variant "${variantId}": ${res.status}`);
  }
  return res.arrayBuffer();
}

/**
 * Saves already-fetched PDF bytes as a real file download — no jsPDF, no
 * reconstruction, the bytes are the canonical PDF as-is.
 *
 * Sprint 11.3: logging added around the click/revoke sequence only —
 * deliberately NOT touching the timing between `link.click()` and
 * `URL.revokeObjectURL(url)` itself (Sprint 11.2 already proved that
 * sequence is safe in this browser; this sprint is tracing, not fixing).
 */
export function saveResumePdf(pdfBytes: ArrayBuffer, fileName: string): void {
  console.log('[Download] Blob size', { byteLength: pdfBytes.byteLength });
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  console.log('[Download] ObjectURL created', { url });
  console.log('[Download] Download filename', { fileName });
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  console.log('[Download] Anchor clicked');
  URL.revokeObjectURL(url);
  console.log('[Download] ObjectURL revoked', { url });
}
