import type { VirtualFile, VirtualFolder } from '../../types';

// Base URL for the backend API. No Vite dev proxy is configured, so the
// frontend (port 3000) must address the backend explicitly — port matches
// server/config/env.ts's PORT default (4000).
const API_BASE_URL = 'http://localhost:4000/api';

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
