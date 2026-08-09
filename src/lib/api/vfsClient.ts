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
 * All backend communication for the Virtual File System is encapsulated here.
 * No component or store action should call fetch() directly.
 */

export async function fetchWorkspaceTree(): Promise<VirtualFolder> {
  const res = await fetch(`${API_BASE_URL}/fs/tree`);
  if (!res.ok) {
    throw new Error(await resolveErrorMessage(res));
  }
  return res.json() as Promise<VirtualFolder>;
}

export async function fetchFile(id: string): Promise<VirtualFile> {
  const res = await fetch(`${API_BASE_URL}/fs/file/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(await resolveErrorMessage(res));
  }
  return res.json() as Promise<VirtualFile>;
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
