import type { CommandDefinition } from '../types';
import { claimOwner } from '../../lib/api/visitorClient';

/**
 * The one-time owner-claim (Visitor Count requirements iteration §7) —
 * `owner <token>` marks *this browser* as the site owner's own, going
 * forward: future visits from it are excluded from startup.log's
 * unique-visitor count (server/routes/visitor.routes.ts's own
 * POST /api/visitor/owner, which this command is the only caller of).
 *
 * `hidden: true` keeps it out of `help`'s own listing — the token itself
 * is what actually gates the action (the endpoint 401s on a wrong one), so
 * hiding this command is only about not advertising an admin action, not
 * the thing standing between a stranger and claiming ownership.
 *
 * This excludes a *designated browser/device*, not "the owner from every
 * device or network" — see visitor.routes.ts's own comment for why that's
 * the honest scope of what a cookie-based claim can actually promise.
 */
export const ownerCommand: CommandDefinition = {
  name: 'owner',
  description: 'Claim this browser as the site owner (excludes it from the visitor count)',
  usage: 'owner <token>',
  category: 'backend',
  hidden: true,
  execute: async (ctx) => {
    const token = ctx.args[0];
    if (!token) {
      return { output: [{ type: 'error', text: 'owner: usage: owner <token>' }] };
    }

    const result = await claimOwner(token);

    if (result.status === 'success') {
      return { output: [{ type: 'text', text: 'This browser is now excluded from the visitor count.' }] };
    }
    if (result.status === 'unconfigured') {
      return { output: [{ type: 'error', text: 'owner: not configured on this deployment' }] };
    }
    return { output: [{ type: 'error', text: `owner: ${result.message}` }] };
  },
};
