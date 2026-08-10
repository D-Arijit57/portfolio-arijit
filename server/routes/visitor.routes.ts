import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { recordVisit } from '../services/visitorService';
import { parseCookies, serializeCookie } from '../utils/cookies';
import { config } from '../config/env';
import { BadRequestError, UnauthorizedError } from '../types';

export const visitorRouter = Router();

const VISITOR_ID_COOKIE = 'vid';
const OWNER_COOKIE = 'owner';
const VISITOR_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2; // 2 years
const OWNER_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2; // 2 years

/**
 * startup.log's `visitors N` line (MOTD placement, Visitor Count
 * requirements iteration §11). Cookie-based, not IP-based (§7/§8: IP is
 * explicitly not the uniqueness key here) — `vid` is a random opaque token
 * with no meaning outside this counter, minted here on first visit and
 * never regenerated afterward, which is what makes a repeat visit
 * genuinely idempotent against the HyperLogLog sketch (redisClient.ts's
 * own doc comment).
 *
 * `isOwner` is true when either the owner-claim cookie is present (see
 * /owner below) or the server isn't running in production — the free,
 * automatic half of the "don't count my visits" requirement; the cookie is
 * the half that actually covers checking the live deployed site from a
 * real browser. Neither claims to identify a *person* — see this route's
 * own honesty requirement (§7): this excludes a designated browser/device,
 * not "Arijit specifically," and says so in its own doc comments rather
 * than pretending otherwise.
 */
visitorRouter.post('/visitor/visit', async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const isOwner = cookies[OWNER_COOKIE] === '1' || config.nodeEnv !== 'production';
    const visitorId = cookies[VISITOR_ID_COOKIE] ?? randomUUID();
    const isNewVisitorId = !cookies[VISITOR_ID_COOKIE];

    const result = await recordVisit({ visitorId, isOwner });

    if (isNewVisitorId) {
      res.setHeader(
        'Set-Cookie',
        serializeCookie(VISITOR_ID_COOKIE, visitorId, {
          maxAgeSeconds: VISITOR_ID_MAX_AGE_SECONDS,
          secure: config.nodeEnv === 'production',
        }),
      );
    }

    if (result.status === 'unconfigured') {
      res.status(503).json({ error: 'Visitor counting is not configured' });
      return;
    }
    if (result.status === 'error') {
      res.status(502).json({ error: 'Failed to record visit' });
      return;
    }

    res.status(200).json({ count: result.count });
  } catch (err) {
    next(err);
  }
});

/**
 * The one-time owner-claim: visiting this endpoint with the correct
 * `OWNER_TOKEN` marks *this browser* as the owner's own, going forward,
 * via a long-lived cookie — not "identify Arijit everywhere," which
 * without real authentication isn't a claim this system can honestly make
 * (§7 again). Exposed as a hidden terminal command (`owner <token>`,
 * `src/terminal/commands/owner.ts`), not a documented URL — the token
 * itself is the actual gate, hiding the command is only about not
 * advertising an admin action in `help`'s own listing.
 */
visitorRouter.post('/visitor/owner', (req, res, next) => {
  try {
    const { token } = req.body as { token?: unknown };
    if (typeof token !== 'string' || token.length === 0) {
      throw new BadRequestError('token is required');
    }
    if (!config.ownerToken) {
      res.status(503).json({ error: 'Owner claim is not configured' });
      return;
    }
    if (token !== config.ownerToken) {
      throw new UnauthorizedError('Invalid owner token');
    }

    res.setHeader(
      'Set-Cookie',
      serializeCookie(OWNER_COOKIE, '1', {
        maxAgeSeconds: OWNER_MAX_AGE_SECONDS,
        secure: config.nodeEnv === 'production',
      }),
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
