import { fetchResumePdf } from '../export/fetchResumePdf';

/**
 * Sprint 11.4: Binary Resource Ownership.
 *
 * `bytes` here is the ORIGINAL, never-transferred fetch result. It is the
 * one thing every other piece of state (the download button, a future
 * "share" feature, anything) should read from — and it must never be
 * handed to a consumer that might transfer/detach an ArrayBuffer (pdf.js's
 * worker being the concrete example that caused the 0-byte download bug:
 * `pdfjsLib.getDocument({ data })` transfers `data` to a Worker via
 * postMessage, which detaches it in the caller's context — the same
 * `ArrayBuffer` instance becomes permanently empty everywhere it's
 * referenced, including in React state).
 *
 * Ownership rule, made structural rather than a comment to remember:
 * anything that needs to pass these bytes to such a consumer must go
 * through `cloneForTransfer()` below and treat the clone as consumed
 * afterward. `doc.bytes` itself is never passed to pdf.js directly again.
 */
export interface ResumePdfDocument {
  /** The untouched original bytes. Safe to read, hash, or download from at any time, any number of times — never passed to a transfer-consuming API directly. */
  bytes: ArrayBuffer;
  variantId: string;
  sha256: string;
  fetchedAt: number;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The one place a `ResumePdfDocument` gets constructed — fetches once,
 * hashes once, and wraps the result with the metadata needed to reason
 * about it later (which variant, whether it's stale) instead of leaving
 * callers to juggle a bare, anonymous `ArrayBuffer`.
 */
export async function loadResumePdfDocument(variantId: string, logLabel = 'ResumePdf'): Promise<ResumePdfDocument> {
  const bytes = await fetchResumePdf(variantId, logLabel);
  const sha256 = await sha256Hex(bytes);
  console.log(`[${logLabel}] Document loaded`, { variantId, sha256, byteLength: bytes.byteLength });
  return { bytes, variantId, sha256, fetchedAt: Date.now() };
}

/**
 * Ownership rule #2: any consumer that might transfer/detach an
 * ArrayBuffer (pdf.js's `getDocument` being the known case) must call this
 * first and pass the *clone* to that consumer — never `doc.bytes`
 * directly. `slice(0)` allocates independent backing memory; detaching the
 * clone can never affect `doc.bytes`, regardless of what the receiving
 * consumer does with it afterward.
 */
export function cloneForTransfer(doc: ResumePdfDocument): ArrayBuffer {
  return doc.bytes.slice(0);
}

/**
 * Ownership rule #3, enforced rather than assumed: a consumer that's about
 * to hand `doc.bytes` off for something irreversible (saving a download)
 * fails loudly instead of silently producing a 0-byte file if this
 * invariant is ever violated by a future change. This is the regression
 * guard for the exact class of bug Sprint 11.3 found.
 */
export function assertIntact(doc: ResumePdfDocument): void {
  if (doc.bytes.byteLength === 0) {
    throw new Error(
      `ResumePdfDocument for variant "${doc.variantId}" has a detached/empty buffer (0 bytes). ` +
        'This should be structurally impossible — some consumer received doc.bytes directly ' +
        'instead of cloneForTransfer(doc). Refusing to save an empty file.'
    );
  }
}
