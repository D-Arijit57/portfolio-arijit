/**
 * Phase 5: Explorer unmounts entirely when it closes (`if (!isOpen) return
 * null` in Explorer.tsx), so focus that was inside it — a tree row, the
 * Outline/Timeline toggles — would otherwise fall through to
 * document.body with no sensible next Tab stop. Call this synchronously
 * right before whatever state change is about to close Explorer (both
 * ActivityBar's manual toggle and VSCodeShell's Phase 4 compact-width
 * auto-collapse do), while its DOM is still present, so containment is a
 * reliable check — not after, once the ref would already be gone.
 */
export function rescueFocusBeforeExplorerClose(willClose: boolean) {
  if (!willClose) return;
  const explorerEl = document.getElementById('explorer-panel');
  if (explorerEl?.contains(document.activeElement)) {
    document.getElementById('activity-bar-explorer-toggle')?.focus();
  }
}
