import React from 'react';
import { Files, Search, GitBranch, Play, Settings, User } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export function ActivityBar() {
  const { explorerState, toggleExplorer, setCommandPaletteOpen } = useStore();

  return (
    <div className="w-[50px] bg-[#333333] flex flex-col justify-between items-center py-2 shrink-0 border-r border-[#1e1e1e]">
      <div className="flex flex-col gap-4 w-full items-center">
        <button 
          onClick={toggleExplorer}
          className={cn("p-2 relative group flex justify-center w-full", explorerState.isOpen ? "text-white" : "text-[#858585] hover:text-white")}
          title="Explorer"
        >
          <Files size={24} strokeWidth={1.5} />
          {explorerState.isOpen && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
          )}
        </button>
        <button 
          onClick={() => setCommandPaletteOpen(true)}
          className="p-2 text-[#858585] hover:text-white transition-colors"
          title="Search"
        >
          <Search size={24} strokeWidth={1.5} />
        </button>
        <button className="p-2 text-[#858585] hover:text-white transition-colors" title="Source Control">
          <GitBranch size={24} strokeWidth={1.5} />
        </button>
        <button className="p-2 text-[#858585] hover:text-white transition-colors" title="Run and Debug">
          <Play size={24} strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex flex-col gap-4 w-full items-center">
        <button className="p-2 text-[#858585] hover:text-white transition-colors" title="Accounts">
          <User size={24} strokeWidth={1.5} />
        </button>
        <button className="p-2 text-[#858585] hover:text-white transition-colors" title="Manage">
          <Settings size={24} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
