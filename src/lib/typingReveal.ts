// Sprint 10D.1 (Intelligent File Opening Animation): originally paired with
// TYPING_REVEAL_FILE_IDS (a fileId allowlist) and useTypingReveal.ts's
// clip-path wipe — both retired by the markdown typography & animation
// redesign (ResumeWorkspace.tsx, the allowlist's last real member, now uses
// useFileRevealSequence directly). This module's session-gating primitives
// outlived that system: they're the shared "has this fileId's reveal played
// this session" bookkeeping every later reveal engine (useFileRevealSequence,
// lib/bootSequence.ts, GitHubContributionGraph.tsx) still builds on.

// Session-local bookkeeping — resets on a real page refresh, same pattern as
// useStore.ts's notifiedGeneratedNamespaces. Not store state: nothing
// outside useTypingReveal() needs to react to it.
const animatedThisSession = new Set<string>();

export function hasAnimated(fileId: string): boolean {
  return animatedThisSession.has(fileId);
}

export function markAnimated(fileId: string): void {
  animatedThisSession.add(fileId);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
