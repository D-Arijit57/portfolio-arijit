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
        <div className="flex items-center gap-1 px-1 h-full">
          <GitBranch size={14} />
          <span>main*</span>
        </div>
        <div className="flex items-center gap-1 px-1 h-full">
          <RefreshCcw size={12} />
        </div>
        <div className="flex items-center gap-2 px-1 h-full">
          <div className="flex items-center gap-1">
            <XCircle size={14} />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle size={14} />
            <span>0</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-1 h-full">
          <span>Journey Workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-4 h-full">
        {file && (
          <>
            <div className="px-1 h-full flex items-center">
              Spaces: 4
            </div>
            <div className="px-1 h-full flex items-center">
              UTF-8
            </div>
            <div className="px-1 h-full flex items-center capitalize">
              {file.type}
            </div>
            <div className="px-1 h-full flex items-center">
              <Info size={12} className="mr-1" />
              Stable
            </div>
          </>
        )}
        <div className="px-1 h-full flex items-center">
          <Bell size={14} />
        </div>
      </div>
    </div>
  );
}
