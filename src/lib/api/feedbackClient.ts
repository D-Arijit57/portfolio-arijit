import type { FeedbackSubmissionInput } from '../../contact/types';

// Same base-URL resolution as vfsClient.ts, including the import.meta.env.DEV
// gate — see that file's comment for why the gate (not just the fallback)
// is what actually keeps a localhost URL out of the production bundle.
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
 * All network I/O for the Review lives here — same "no component calls
 * fetch() directly" discipline vfsClient.ts documents for the VFS.
 * Discriminates network failure from an HTTP error from a genuine
 * success, so WorkspaceReview can render an honest state for each: there
 * is no "optimistic success" path anywhere in this client, by
 * construction — the only way to reach the success branch is a real 2xx.
 */
export type SubmitFeedbackResult =
  | { status: 'success' }
  | { status: 'unconfigured' }
  | { status: 'http-error'; statusCode: number; message: string }
  | { status: 'network-error'; message: string };

export async function submitFeedback(input: FeedbackSubmissionInput): Promise<SubmitFeedbackResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (err) {
    return {
      status: 'network-error',
      message: err instanceof Error ? err.message : 'Network request failed',
    };
  }

  if (res.status === 503) {
    return { status: 'unconfigured' };
  }

  if (!res.ok) {
    return {
      status: 'http-error',
      statusCode: res.status,
      message: await resolveErrorMessage(res),
    };
  }

  return { status: 'success' };
}
