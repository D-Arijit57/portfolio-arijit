// Sprint 10D.1 (Intelligent File Opening Animation): the single source of
// truth for *which* files get the typing-reveal effect and *whether* a given
// fileId has already played it this session. Kept as a pure, framework-free
// module — same pattern as the search index / notification queue — so
// future files opt in with a one-line addition to the Set below, without
// touching EditorRenderer or any of the renderers it dispatches to.

export const TYPING_REVEAL_FILE_IDS = new Set([
  'readme',
  'work_history',
  'contact_sh',
  'skills_frontend',
  'skills_backend',
  'resume',
]);

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
