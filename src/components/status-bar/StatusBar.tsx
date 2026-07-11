import React from 'react';
import { GitBranch, RefreshCcw, XCircle, AlertTriangle, Bell, Info } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';

export function StatusBar() {
  const { activeFileId } = useStore();
  const file = activeFileId ? getFileById(activeFileId) : null;

  return (
    <div className="h-[22px] bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] select-none z-50">
      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-1 hover:bg-[#1f8ad1] px-1 h-full cursor-pointer transition-colors">
          <GitBranch size={14} />
          <span>main*</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-[#1f8ad1] px-1 h-full cursor-pointer transition-colors">
          <RefreshCcw size={12} />
        </div>
        <div className="flex items-center gap-2 hover:bg-[#1f8ad1] px-1 h-full cursor-pointer transition-colors">
          <div className="flex items-center gap-1">
            <XCircle size={14} />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle size={14} />
            <span>0</span>
          </div>
        </div>
        <div className="flex items-center gap-1 hover:bg-[#1f8ad1] px-1 h-full cursor-pointer transition-colors">
          <span>Journey Workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-4 h-full">
        {file && (
          <>
            <div className="hover:bg-[#1f8ad1] px-1 h-full flex items-center cursor-pointer">
              Ln {Math.max(1, Math.floor(Math.random() * 50))}, Col {Math.max(1, Math.floor(Math.random() * 80))}
            </div>
            <div className="hover:bg-[#1f8ad1] px-1 h-full flex items-center cursor-pointer">
              Spaces: 4
            </div>
            <div className="hover:bg-[#1f8ad1] px-1 h-full flex items-center cursor-pointer">
              UTF-8
            </div>
            <div className="hover:bg-[#1f8ad1] px-1 h-full flex items-center cursor-pointer capitalize">
              {file.type}
            </div>
            <div className="hover:bg-[#1f8ad1] px-1 h-full flex items-center cursor-pointer">
              <Info size={12} className="mr-1" />
              Stable
            </div>
          </>
        )}
        <div className="hover:bg-[#1f8ad1] px-1 h-full flex items-center cursor-pointer">
          <Bell size={14} />
        </div>
      </div>
    </div>
  );
}
