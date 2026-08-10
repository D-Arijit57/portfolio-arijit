import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { EditorTabs } from './EditorTabs';
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
  const activePane = editorSplit ? (openedTabs.find((t) => t.fileId === activeFileId)?.pane ?? 'left') : 'left';

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
