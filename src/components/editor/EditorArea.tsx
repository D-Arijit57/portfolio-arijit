import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { EditorTabs } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';
import { EditorRenderer } from './EditorRenderer';
import { SplitEditorArea } from './SplitEditorArea';
import { BootTerminal } from '../shell/BootTerminal';
import { hasBooted, prefersReducedMotion } from '../../lib/bootSequence';

export function EditorArea() {
  const { editorSplit, setBootActive } = useStore();
  // Lazy-initialized once per EditorArea mount (i.e. once per page load) —
  // switching tabs, reopening README, etc. never remount EditorArea, so the
  // boot terminal never replays mid-session. See lib/bootSequence.ts.
  const [booting, setBooting] = useState(() => !hasBooted() && !prefersReducedMotion());

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

  if (editorSplit) {
    return <SplitEditorArea />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#1e1e1e]">
      <EditorTabs pane="left" />
      <Breadcrumbs pane="left" />
      <div className="flex-1 overflow-hidden">
        <EditorRenderer pane="left" />
      </div>
    </div>
  );
}
