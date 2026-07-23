const RESUME_PDF_PATH = '/resume/Arijit_Das_Resume.pdf';

/**
 * Sprint 12: the resume PDF is now a static asset (public/resume/), not a
 * backend-generated document — this fetch reads the file straight off the
 * server Vite/the static host is already serving, with no API call and no
 * runtime compilation. Used only to get bytes for the Three.js preview's
 * texture (see preview/pdfTexture.ts); the Download button below never
 * routes through this, since a direct browser download needs no fetch.
 */
export async function fetchResumePdf(): Promise<ArrayBuffer> {
  const res = await fetch(RESUME_PDF_PATH);
  if (!res.ok) {
    throw new Error(`Failed to fetch resume PDF: ${res.status}`);
  }
  return res.arrayBuffer();
}

/**
 * Downloads the static resume PDF directly — no fetch, no blob, no
 * ArrayBuffer to keep intact across consumers. The browser handles the
 * download entirely from `href` + `download`.
 */
export function downloadResumePdf(fileName: string): void {
  const link = document.createElement('a');
  link.href = RESUME_PDF_PATH;
  link.download = fileName;
  link.click();
}
