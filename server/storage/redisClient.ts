import { Redis } from '@upstash/redis';

const UNIQUE_VISITORS_KEY = 'portfolio:visitors:unique';

/**
 * Thrown for any failure this client can produce — same split
 * resendClient.ts's own ResendClientError makes: this file only classifies
 * and reports, visitorService.ts decides how that affects the HTTP
 * response.
 */
export class RedisClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedisClientError';
  }
}

/**
 * One HyperLogLog key (`PFADD`/`PFCOUNT`), not a per-visitor record —
 * the whole reason HLL is the right structure here: `PFADD` is naturally
 * idempotent for a repeat visitor's own ID (adding the same element again
 * doesn't change the estimated cardinality), so there's no separate "have I
 * already counted this ID" check to maintain, and the store never retains
 * an actual queryable list of who visited — only a probabilistic sketch of
 * how many distinct IDs it's seen (Identity + Reply — no, Visitor Count
 * requirements iteration §Privacy: exactly the "unique count, not
 * surveillance" property that made this the recommended approach).
 *
 * A fresh `Redis` instance per call, not a cached module-level singleton —
 * matches resendClient.ts's own `new Resend(opts.apiKey)` per call. Both are
 * REST-based clients (no connection to pool or keep warm), so there's no
 * performance cost to this, and it keeps every call here trivially stateless
 * — a property serverless invocations already require.
 */
export async function recordUniqueVisit(
  visitorId: string,
  opts: { url: string; token: string },
): Promise<number> {
  const redis = new Redis({ url: opts.url, token: opts.token });
  try {
    await redis.pfadd(UNIQUE_VISITORS_KEY, visitorId);
    return await redis.pfcount(UNIQUE_VISITORS_KEY);
  } catch (err) {
    throw new RedisClientError(err instanceof Error ? err.message : 'Upstash Redis request failed');
  }
}

/** Reads the current count without adding anything — used for the owner's
 * own visits, which must never enter the sketch (Self-Exclusion
 * requirements iteration §7) but should still see the real number. */
export async function readUniqueVisitorCount(opts: { url: string; token: string }): Promise<number> {
  const redis = new Redis({ url: opts.url, token: opts.token });
  try {
    return await redis.pfcount(UNIQUE_VISITORS_KEY);
  } catch (err) {
    throw new RedisClientError(err instanceof Error ? err.message : 'Upstash Redis request failed');
  }
}
