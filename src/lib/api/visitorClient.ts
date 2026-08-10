// Same base-URL resolution and "no component calls fetch() directly"
// discipline as feedbackClient.ts/vfsClient.ts.
const API_BASE_URL = import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL || '/api' : '/api';

export type RecordVisitResult =
  | { status: 'success'; count: number }
  | { status: 'unconfigured' }
  | { status: 'error' };

/**
 * Records one visit and returns the current unique count — `credentials:
 * 'include'` is required here specifically (feedbackClient.ts's own fetch
 * doesn't need it): the visitor-ID and owner cookies only round-trip
 * cross-origin at all with it set, which matters in local dev where the
 * Vite server and the API are genuinely different origins (see
 * server/app.ts's own cors() comment for the other half of this).
 */
export async function recordVisit(): Promise<RecordVisitResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/visitor/visit`, { method: 'POST', credentials: 'include' });
    if (res.status === 503) return { status: 'unconfigured' };
    if (!res.ok) return { status: 'error' };
    const body = (await res.json()) as { count: number };
    return { status: 'success', count: body.count };
  } catch {
    return { status: 'error' };
  }
}

export type ClaimOwnerResult = { status: 'success' } | { status: 'unconfigured' } | { status: 'error'; message: string };

/** The `owner <token>` terminal command's only network call. */
export async function claimOwner(token: string): Promise<ClaimOwnerResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/visitor/owner`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.status === 503) return { status: 'unconfigured' };
    if (res.status === 401) return { status: 'error', message: 'Invalid owner token.' };
    if (!res.ok) return { status: 'error', message: `Request failed with status ${res.status}` };
    return { status: 'success' };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Network request failed' };
  }
}
