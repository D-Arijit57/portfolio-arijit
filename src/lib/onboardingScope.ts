// Portfolio UX Sprint (Interactive Workspace Assistant): the boot terminal
// (lib/bootSequence.ts) already plays once per session on any first load,
// file-agnostic. This sprint scopes the onboarding bundle — boot log and
// Explorer's stagger-open — to README landings only, so a direct deep link
// to another file (whoami.md, cortexa.md, etc.) never sees it, even on a
// first-ever visit. Deliberately a thin layer on top of bootSequence.ts
// rather than a change to it — the boot log's own content/timing stays
// exactly as previously signed off.
import { hasBooted, prefersReducedMotion } from './bootSequence';
import { resolveUrlPathToFile } from '../hooks/useRouterSync';

export { hasBooted, prefersReducedMotion };

/**
 * True only for the entry routes that resolve to README.md: the bare root
 * path (before useRouterSync's mount effect rewrites it to
 * /journey/welcome) and /journey(/welcome) itself. Every other deep link
 * (/journey/about, /journey/projects/cortexa, ...) returns false.
 */
export function isReadmeEntryRoute(): boolean {
  const { pathname } = window.location;
  if (pathname === '/') return true;
  return resolveUrlPathToFile(pathname)?.id === 'readme';
}

/**
 * Whether the pre-workspace boot cold-start should run at all (Phase 7C:
 * WorkspaceColdStart, mounted by App.tsx before VSCodeShell exists). The
 * `!hasBooted()` term belongs here and only here — it is what stops the
 * sequence replaying, and useBootSequence re-checks it internally anyway.
 */
export function shouldRunWorkspaceBoot(): boolean {
  return isReadmeEntryRoute() && !hasBooted() && !prefersReducedMotion();
}

/**
 * Whether the workspace's own onboarding visuals — now just Explorer's
 * stagger-open — should play. Deliberately NOT gated on hasBooted().
 *
 * Phase 7C moved the boot ahead of VSCodeShell, so markBooted() now fires
 * *before* Explorer ever mounts. Keeping `!hasBooted()` here would have
 * made this return false by the time Explorer read it, silently deleting
 * the stagger with no error to notice. The term was never doing real work
 * for Explorer in the first place: Explorer mounts exactly once per page
 * load (it never remounts as the user navigates — see its own comment), and
 * on a fresh load hasBooted() was always still false at that moment. So
 * dropping it preserves today's behaviour exactly while making it immune to
 * where the boot happens to run.
 */
export function shouldRunOnboarding(): boolean {
  return isReadmeEntryRoute() && !prefersReducedMotion();
}
