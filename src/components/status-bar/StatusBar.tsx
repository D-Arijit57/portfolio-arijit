import React from 'react';
import { GitBranch, RefreshCcw, XCircle, AlertTriangle, Bell, Info } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';

export function StatusBar() {
  const { activeFileId, vfsDegraded } = useStore();
  const file = activeFileId ? getFileById(activeFileId) : null;
  // Phase 8A: the degraded-hydration signal. Deliberately routed through the
  // warning counter that was already here (previously hardcoded to 0) rather
  // than adding a banner or any new visual language — a workspace running on
  // seed data because the API didn't answer is exactly what a VS Code status
  // bar warning count is for. Quiet by design: a visitor won't register it,
  // while anyone diagnosing the deployment gets the reason on hover and the
  // full message in the console.
  const warningCount = vfsDegraded ? 1 : 0;
  const warningTitle = vfsDegraded
    ? `Workspace is running on bundled seed data — ${vfsDegraded.message}`
    : undefined;

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
          <div className="flex items-center gap-1" title={warningTitle}>
            <AlertTriangle size={14} />
            <span>{warningCount}</span>
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
