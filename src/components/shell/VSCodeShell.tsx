import React, { useEffect, useRef } from 'react';
import { ActivityBar } from '../activity-bar/ActivityBar';
import { Explorer } from '../explorer/Explorer';
import { EditorArea } from '../editor/EditorArea';
import { Terminal } from '../terminal/Terminal';
import { StatusBar } from '../status-bar/StatusBar';
import { CommandPalette } from '../command-palette/CommandPalette';
import { Notifications } from '../notifications/Notifications';
import { useStore } from '../../store/useStore';
import { useRouterSync } from '../../hooks/useRouterSync';
import { useTerminalCwdSync } from '../../hooks/useTerminalCwdSync';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { EXPLORER_COLLAPSE_BREAKPOINT_PX } from '../../lib/workspaceBreakpoints';
import { rescueFocusBeforeExplorerClose } from '../../lib/explorerFocusSafety';
import { saveFocusBeforeCommandPaletteOpen } from '../../lib/commandPaletteFocusMemory';

export function VSCodeShell() {
  const { setCommandPaletteOpen, explorerState, toggleExplorer } = useStore();
  useRouterSync();
  useTerminalCwdSync();

  const isCompact = useWindowWidth() < EXPLORER_COLLAPSE_BREAKPOINT_PX;
  // The desktop-width Explorer preference, snapshotted the moment the
  // viewport crosses down into compact — restored on the way back up so a
  // resize round-trip reproduces exactly what the user had, not whatever
  // the Explorer toggle (still fully usable while compact) was left at.
  const desktopExplorerOpenRef = useRef(explorerState.isOpen);
  // Starts false regardless of the real initial `isCompact` so a page
  // load that's *already* compact (a narrow device, not a later resize)
  // still runs the "just became compact" branch below on its first pass
  // and collapses Explorer immediately.
  const wasCompactRef = useRef(false);

  useEffect(() => {
    const wasCompact = wasCompactRef.current;
    if (isCompact && !wasCompact) {
      desktopExplorerOpenRef.current = explorerState.isOpen;
      if (explorerState.isOpen) {
        rescueFocusBeforeExplorerClose(true);
        toggleExplorer();
      }
    } else if (!isCompact && wasCompact) {
      if (desktopExplorerOpenRef.current !== explorerState.isOpen) {
        rescueFocusBeforeExplorerClose(explorerState.isOpen && !desktopExplorerOpenRef.current);
        toggleExplorer();
      }
    }
    wasCompactRef.current = isCompact;
    // Deliberately keyed on `isCompact` alone — this must fire only on a
    // breakpoint crossing, not on every explorerState change (which would
    // include the very toggle calls this effect itself makes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompact]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        saveFocusBeforeCommandPaletteOpen();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-sans selection:bg-[#264f78]">
      {/* Phase 5: a visually-hidden page heading — the app has no visible
          <h1> anywhere in its own chrome (markdown files render their own),
          so screen-reader users landing here had nothing to orient against. */}
      <h1 className="sr-only">Arijit Das — Software Engineer, developer workspace</h1>
      <div className="flex flex-1 overflow-hidden">
        <nav aria-label="Workspace" className="flex h-full">
          <ActivityBar />
          <Explorer />
        </nav>
        <main className="flex flex-col flex-1 overflow-hidden bg-[#1e1e1e]">
          <EditorArea />
          <Terminal />
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
      <Notifications />
    </div>
  );
}
