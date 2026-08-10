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
 * The single gate every onboarding-sequence piece (BootTerminal via
 * EditorArea, Explorer's stagger-open) checks once at its own mount, inside
 * a lazy `useState(() => ...)` initializer — cheap to call repeatedly since
 * none of these consumers re-check it reactively after their first render.
 */
export function shouldRunOnboarding(): boolean {
  return isReadmeEntryRoute() && !hasBooted() && !prefersReducedMotion();
}
