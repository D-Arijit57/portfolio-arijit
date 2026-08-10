import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { EditorTabs, editorTabDomId } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';
import { EditorRenderer } from './EditorRenderer';
import { SplitEditorArea } from './SplitEditorArea';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { SINGLE_PANE_BREAKPOINT_PX } from '../../lib/workspaceBreakpoints';

export function EditorArea() {
  const { editorSplit, setBootActive, openedTabs, activeFileId } = useStore();
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

  // Sprint 10E.2 clears the store's bootActive flag (see useStore.ts), which
  // Notifications checks to suppress hydration-time toasts while the boot
  // illusion is still running. Phase 7C: the boot now finishes *before*
  // VSCodeShell — and therefore before this component exists at all — so
  // simply mounting is the signal that it is over. Left as an effect on the
  // store setter rather than deleted outright: the flag starts true at store
  // creation, so something still has to clear it or Notifications would stay
  // suppressed for the whole session.
  useEffect(() => {
    setBootActive(false);
  }, [setBootActive]);

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
