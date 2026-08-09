import { createApp } from '../server/app';
import { providerRegistry } from '../server/providers';

/**
 * Vercel serverless entrypoint. Thin wrapper around the existing Express
 * app (server/app.ts's createApp()) — every route (/api/fs/tree,
 * /api/fs/file/:id, /api/health, /api/feedback) keeps working completely
 * unchanged. No app.listen(): Vercel's Node runtime owns the HTTP server
 * and just needs a (req, res) handler, which an Express app already is.
 * vercel.json rewrites every /api/* request here.
 *
 * Deliberately not server/index.ts (the standalone entrypoint) — that file
 * calls app.listen() and sets up a 15-minute setInterval for provider
 * refresh, neither of which has a meaningful equivalent in a serverless
 * runtime (no long-lived process to hold a timer). The one-time startup
 * refresh below is this file's equivalent of server/index.ts's own startup
 * call — module-scope code runs once per cold start and is cached across
 * warm invocations, so this isn't a per-request cost.
 */
export default createApp();

void providerRegistry.refreshAll();
