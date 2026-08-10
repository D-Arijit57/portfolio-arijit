import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { EditorTabs, editorTabDomId } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';
import { EditorRenderer } from './EditorRenderer';
import { SplitEditorArea } from './SplitEditorArea';
import { BootTerminal } from '../shell/BootTerminal';
import { shouldRunOnboarding } from '../../lib/onboardingScope';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { SINGLE_PANE_BREAKPOINT_PX } from '../../lib/workspaceBreakpoints';

export function EditorArea() {
  const { editorSplit, setBootActive, openedTabs, activeFileId } = useStore();
  // Lazy-initialized once per EditorArea mount (i.e. once per page load) —
  // switching tabs, reopening README, etc. never remount EditorArea, so the
  // boot terminal never replays mid-session. Portfolio UX Sprint: also
  // scoped to a README landing — shouldRunOnboarding() folds in the entry
  // route check alongside the existing hasBooted()/prefersReducedMotion()
  // gates (see lib/onboardingScope.ts / lib/bootSequence.ts).
  const [booting, setBooting] = useState(() => shouldRunOnboarding());
  const isSinglePane = useWindowWidth() < SINGLE_PANE_BREAKPOINT_PX;
  const activePane = editorSplit ? (openedTabs.find((t) => t.fileId === activeFileId)?.pane ?? 'left') : 'left';

  // Phase 5: track which pane last held focus (a plain document-level
  // listener, not a ref into either pane's own DOM — that subtree may
  // already be gone by the time the collapse effect below runs) so that
  // if the pane the single-pane collapse hides was the one holding focus,
  // it can be rescued instead of falling through to document.body.
  const lastFocusedPaneRef = useRef<'left' | 'right' | null>(null);
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const id = (e.target as HTMLElement | null)?.id ?? '';
      if (id.startsWith('editor-tab-left-')) lastFocusedPaneRef.current = 'left';
      else if (id.startsWith('editor-tab-right-')) lastFocusedPaneRef.current = 'right';
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  const wasSinglePaneRef = useRef(isSinglePane);
  useEffect(() => {
    if (isSinglePane && !wasSinglePaneRef.current) {
      const losingPane = lastFocusedPaneRef.current;
      if (losingPane && losingPane !== activePane && document.activeElement === document.body) {
        // Synchronous: this effect already runs after the single-pane
        // layout has committed, so the surviving pane's active tab is
        // already in the DOM — no extra frame to wait for.
        const fallback = activeFileId ? document.getElementById(editorTabDomId(activePane, activeFileId)) : null;
        (fallback ?? document.getElementById('activity-bar-explorer-toggle'))?.focus();
      }
    }
    wasSinglePaneRef.current = isSinglePane;
  }, [isSinglePane, activePane, activeFileId]);

  // Sprint 10E.2: mirrors `booting` into the store's bootActive flag (see
  // useStore.ts) so Notifications can suppress toasts for the same window,
  // covering both the reduced-motion/already-booted skip (fires once, on
  // mount) and the natural end of the sequence (fires when it completes).
  useEffect(() => {
    if (!booting) setBootActive(false);
  }, [booting, setBootActive]);

  // Sprint 10E.2: an instant swap, not a crossfade — the brief explicitly
  // calls out "dissolve transitions" as something to avoid. Both surfaces
  // sit on near-identical dark backgrounds, so the cut reads as the editor
  // clearing straight into README rather than a visible jump.
  if (booting) {
    return <BootTerminal onComplete={() => setBooting(false)} />;
  }

  if (editorSplit && !isSinglePane) {
    return <SplitEditorArea />;
  }

  // Below SINGLE_PANE_BREAKPOINT_PX, a workspace with two open panes
  // (welcome.md + startup.log, etc.) shows only the pane that owns the
  // active file, full width, instead of squeezing both into illegible
  // slivers (Phase 4 audit: the left pane hits its 200px floor and wraps
  // to 3-4 words/line at 768px). editorSplit/splitRatio/pane assignments
  // in the store are never touched here, so widening back past the
  // breakpoint restores SplitEditorArea exactly as the user left it — no
  // snapshot/restore bookkeeping needed, unlike Explorer's real toggle.
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#1e1e1e]">
      <EditorTabs pane={activePane} />
      <Breadcrumbs pane={activePane} />
      <div className="flex-1 overflow-hidden">
        <EditorRenderer pane={activePane} />
      </div>
    </div>
  );
}
