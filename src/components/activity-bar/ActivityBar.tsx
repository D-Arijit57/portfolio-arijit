import React from 'react';
import { Files, Search, GitBranch, Play, Settings, User } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { rescueFocusBeforeExplorerClose } from '../../lib/explorerFocusSafety';

const FOCUS_RING = 'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#4fc1ff]';

export function ActivityBar() {
  const { explorerState, toggleExplorer, setExplorerView } = useStore();

  const isFilesActive = explorerState.isOpen && explorerState.view === 'files';
  const isSearchActive = explorerState.isOpen && explorerState.view === 'search';

  return (
    <div className="w-[50px] bg-[#333333] flex flex-col justify-between items-center py-2 shrink-0 border-r border-[#1e1e1e]">
      <div className="flex flex-col gap-4 w-full items-center">
        <button
          id="activity-bar-explorer-toggle"
          onClick={() => {
            rescueFocusBeforeExplorerClose(isFilesActive);
            if (isFilesActive) toggleExplorer();
            else setExplorerView('files');
          }}
          className={cn("p-2 relative group flex justify-center w-full", FOCUS_RING, isFilesActive ? "text-white" : "text-[#858585] hover:text-white")}
          title="Explorer"
          aria-pressed={isFilesActive}
        >
          <Files size={24} strokeWidth={1.5} />
          {isFilesActive && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
          )}
        </button>
        <button
          onClick={() => {
            rescueFocusBeforeExplorerClose(isSearchActive);
            if (isSearchActive) toggleExplorer();
            else setExplorerView('search');
          }}
          className={cn("p-2 relative group flex justify-center w-full", FOCUS_RING, isSearchActive ? "text-white" : "text-[#858585] hover:text-white")}
          title="Search"
          aria-pressed={isSearchActive}
        >
          <Search size={24} strokeWidth={1.5} />
          {isSearchActive && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
          )}
        </button>
        <button disabled className="p-2 text-[#858585] cursor-default" title="Source Control">
          <GitBranch size={24} strokeWidth={1.5} />
        </button>
        <button disabled className="p-2 text-[#858585] cursor-default" title="Run and Debug">
          <Play size={24} strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex flex-col gap-4 w-full items-center">
        <button disabled className="p-2 text-[#858585] cursor-default" title="Accounts">
          <User size={24} strokeWidth={1.5} />
        </button>
        <button disabled className="p-2 text-[#858585] cursor-default" title="Manage">
          <Settings size={24} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
