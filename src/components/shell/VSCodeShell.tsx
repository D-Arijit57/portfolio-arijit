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
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { EXPLORER_COLLAPSE_BREAKPOINT_PX } from '../../lib/workspaceBreakpoints';

export function VSCodeShell() {
  const { setCommandPaletteOpen, explorerState, toggleExplorer } = useStore();
  useRouterSync();

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
      if (explorerState.isOpen) toggleExplorer();
    } else if (!isCompact && wasCompact) {
      if (desktopExplorerOpenRef.current !== explorerState.isOpen) toggleExplorer();
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
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-sans selection:bg-[#264f78]">
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <Explorer />
        <div className="flex flex-col flex-1 overflow-hidden bg-[#1e1e1e]">
          <EditorArea />
          <Terminal />
        </div>
      </div>
      <StatusBar />
      <CommandPalette />
      <Notifications />
    </div>
  );
}
