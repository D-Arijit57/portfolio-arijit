import React, { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { extractFencedBlock } from '../../lib/extractFencedBlock';
import type { GitHubActivityEntry } from '../../types/github';

interface RecentActivityLogProps {
  /** Defaults to the generated GitHub provider's activity file — override only for reuse against a different source. */
  sourceFileId?: string;
}

/**
 * Lightweight terminal-inspired reader for real recent GitHub activity —
 * reuses the same already-hydrated `github:activity` content the Explorer
 * and Editor already read (VFS_DESIGN.md §11.5), no separate fetch.
 */
export function RecentActivityLog({ sourceFileId = 'github:activity' }: RecentActivityLogProps) {
  const file = useStore((state) => state.workspaceFiles.find((f) => f.id === sourceFileId));

  const entries = useMemo<GitHubActivityEntry[] | null>(() => {
    if (!file) return null;
    const raw = extractFencedBlock(file.content, 'github-recent-activity');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GitHubActivityEntry[];
    } catch {
      return null;
    }
  }, [file]);

  if (!entries || entries.length === 0) {
    return (
      <div className="my-4 rounded-md border border-[#333333] bg-[#1e1e1e] p-4 text-[13px] italic text-[#858585]">
        No recent public activity.
      </div>
    );
  }

  return (
    <div className="my-4 rounded-md border border-[#333333] bg-[#1e1e1e] font-mono text-[12px]">
      <div className="flex items-center gap-2 border-b border-[#333333] px-3 py-1.5 text-[#858585]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f14c4c]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e5e510]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#3fb950]" />
        <span className="ml-2 text-[11px]">git log --oneline</span>
      </div>
      <div className="px-3 py-2">
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-3 py-1 leading-relaxed">
            <span className="shrink-0 text-[#858585]">{entry.createdAt.slice(0, 10)}</span>
            <span className="text-[#cccccc]">{entry.summary}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
