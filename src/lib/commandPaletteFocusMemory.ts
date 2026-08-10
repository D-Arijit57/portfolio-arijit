/**
 * Phase 5: CommandPalette's own Command.Input steals focus the instant it
 * mounts (`autoFocus`), which happens during the same commit as the open
 * — by the time any effect inside CommandPalette itself could run,
 * `document.activeElement` already points at the input, too late to know
 * what was focused before. Captured instead at the actual trigger (the
 * Cmd/Ctrl+K handler in VSCodeShell.tsx), a moment earlier, then restored
 * once the palette closes so the triggering control gets focus back.
 */
let previouslyFocused: HTMLElement | null = null;
let previouslyFocusedId: string | null = null;

export function saveFocusBeforeCommandPaletteOpen() {
  const el = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  previouslyFocused = el;
  previouslyFocusedId = el?.id || null;
}

export function restoreFocusAfterCommandPaletteClose() {
  // Prefer looking the element back up by id — Explorer rows and editor
  // tabs (Framer Motion Reorder/AnimatePresence) can remount their DOM
  // node while the palette is open, which would leave `previouslyFocused`
  // pointing at a now-detached element that silently no-ops on .focus().
  // Their ids are stable across a remount even when the node isn't.
  const byId = previouslyFocusedId ? document.getElementById(previouslyFocusedId) : null;
  (byId ?? previouslyFocused)?.focus();
  previouslyFocused = null;
  previouslyFocusedId = null;
}
