import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { recordUniqueVisit, readUniqueVisitorCount } from '../storage/redisClient.js';
import type { VisitRequest } from '../types/index.js';

export type RecordVisitResult = { status: 'ok'; count: number } | { status: 'unconfigured' } | { status: 'error' };

/**
 * Business logic for one visit — same "route layer stays thin, this owns
 * the decision" split feedbackService.ts already established. The only
 * policy here: an unconfigured Upstash degrades to 'unconfigured' rather
 * than throwing, so visitor.routes.ts can simply omit the count from its
 * response without ever touching backend boot — mirrors
 * feedbackService.ts's own unconfigured-Resend degrade exactly.
 *
 * `request.isOwner` visits are never added to the HyperLogLog sketch — see
 * redisClient.ts's own doc comment — but still read the real count, so the
 * one person checking their own site sees an honest number, just doesn't
 * change it.
 */
export async function recordVisit(request: VisitRequest): Promise<RecordVisitResult> {
  if (!config.upstashRedisRestUrl || !config.upstashRedisRestToken) {
    return { status: 'unconfigured' };
  }

  const opts = { url: config.upstashRedisRestUrl, token: config.upstashRedisRestToken };

  try {
    const count = request.isOwner
      ? await readUniqueVisitorCount(opts)
      : await recordUniqueVisit(request.visitorId, opts);
    return { status: 'ok', count };
  } catch (err) {
    logger.error('Failed to record visit', { message: err instanceof Error ? err.message : String(err) });
    return { status: 'error' };
  }
}
