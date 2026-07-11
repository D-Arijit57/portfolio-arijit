import React, { useEffect } from 'react';
import { ActivityBar } from '../activity-bar/ActivityBar';
import { Explorer } from '../explorer/Explorer';
import { EditorArea } from '../editor/EditorArea';
import { Terminal } from '../terminal/Terminal';
import { StatusBar } from '../status-bar/StatusBar';
import { CommandPalette } from '../command-palette/CommandPalette';
import { Notifications } from '../notifications/Notifications';
import { useStore } from '../../store/useStore';
import { useRouterSync } from '../../hooks/useRouterSync';
import { cn } from '../../lib/utils';

export function VSCodeShell() {
  const { setCommandPaletteOpen } = useStore();
  useRouterSync();

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
