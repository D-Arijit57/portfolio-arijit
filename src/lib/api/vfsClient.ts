import type { VirtualFile, VirtualFolder } from '../../types';

// Base URL for the backend API. In production (Vercel) the API is served
// from the same origin as the frontend via api/index.ts + vercel.json's
// rewrite, so the relative '/api' is correct with zero configuration.
// Local dev still needs an explicit port (no Vite dev proxy is configured)
// since the frontend (port 3000) and the standalone Express server (port
// 4000, server/config/env.ts's PORT default) are different origins — set
// VITE_API_BASE_URL in .env to point at it (see .env.example).
//
// The `import.meta.env.DEV` gate is deliberate, not just belt-and-suspenders:
// Vite loads plain `.env` (as opposed to `.env.production`) in every mode,
// dev AND production build alike, so a `VITE_API_BASE_URL` a developer set
// for local dev would otherwise get baked straight into the production
// bundle (confirmed — this is exactly what happened before this gate was
// added, checked by grepping the built dist/ output). Reading the override
// only when import.meta.env.DEV is true means a production build can never
// contain a localhost URL, regardless of what's sitting in .env.
const API_BASE_URL = import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL || '/api' : '/api';

async function resolveErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    // Response body wasn't JSON (or was empty) — fall through to the status-based message.
  }
  return `Request failed with status ${res.status}`;
}

/**
 * Why the tree fetch failed, kept as a discriminator rather than a bare
 * message because the four cases have genuinely different diagnoses:
 *
 * - `unreachable`     the request never completed (backend down, DNS, CORS).
 * - `http-error`      the API answered, and answered with a real error status.
 * - `not-json`        a 2xx whose body isn't JSON. In practice this is the
 *                     signature of a *routing* misconfiguration, not an
 *                     outage: `/api/*` fell through to the SPA rewrite and
 *                     served index.html with a 200. Distinguishing it matters
 *                     because "backend unavailable" is the wrong thing to go
 *                     looking at when the backend is fine and the rewrite is
 *                     what's broken (vercel.json's `/api/(.*)` rule).
 * - `malformed-json`  correct content-type, unparseable body.
 */
export type VfsFailureKind = 'unreachable' | 'http-error' | 'not-json' | 'malformed-json';

export class VfsFetchError extends Error {
  constructor(readonly kind: VfsFailureKind, message: string) {
    super(message);
    this.name = 'VfsFetchError';
  }
}

/**
 * All backend communication for the Virtual File System is encapsulated here.
 * No component or store action should call fetch() directly.
 */

export async function fetchWorkspaceTree(): Promise<VirtualFolder> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/fs/tree`);
  } catch (err) {
    throw new VfsFetchError(
      'unreachable',
      err instanceof Error ? err.message : 'Network request failed',
    );
  }

  if (!res.ok) {
    throw new VfsFetchError('http-error', await resolveErrorMessage(res));
  }

  // A 2xx is not on its own evidence of having reached the API: the SPA
  // rewrite answers unmatched paths with index.html and a 200, so the
  // content-type is what actually separates "the API replied" from "the
  // static host replied on the API's behalf". Checked before res.json() so
  // the failure is classified rather than surfacing as an opaque
  // "Unexpected token '<'" SyntaxError.
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new VfsFetchError(
      'not-json',
      `Expected JSON from ${API_BASE_URL}/fs/tree but received "${contentType || 'no content-type'}" ` +
        `(HTTP ${res.status}). This usually means /api/* is not being routed to the API and the ` +
        `SPA fallback answered instead — check vercel.json's rewrite order.`,
    );
  }

  try {
    return (await res.json()) as VirtualFolder;
  } catch (err) {
    throw new VfsFetchError(
      'malformed-json',
      err instanceof Error ? err.message : 'Response body was not valid JSON',
    );
  }
}

/**
 * Discriminates the three outcomes a save can have, since a save-pipeline
 * caller (Store.saveFile(), Sprint 4B) needs to tell "server rejected the
 * write" apart from "request never reached the server" to decide whether
 * retrying makes sense — a generic thrown Error collapses that distinction.
 */
export type UpdateFileResult =
  | { status: 'success'; file: VirtualFile }
  | { status: 'http-error'; statusCode: number; message: string }
  | { status: 'network-error'; message: string };

export async function updateFile(id: string, content: string): Promise<UpdateFileResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/fs/file/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    return {
      status: 'network-error',
      message: err instanceof Error ? err.message : 'Network request failed',
    };
  }

  if (!res.ok) {
    return {
      status: 'http-error',
      statusCode: res.status,
      message: await resolveErrorMessage(res),
    };
  }

  const file = (await res.json()) as VirtualFile;
  return { status: 'success', file };
}
