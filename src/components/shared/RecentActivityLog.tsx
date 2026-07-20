import React, { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { extractFencedBlock } from '../../lib/extractFencedBlock';
import { formatRelativeTime } from '../../lib/formatRelativeTime';
import type { GitHubActivityEntry } from '../../types/github';

interface RecentActivityLogProps {
  /** Defaults to the generated GitHub provider's activity file — override only for reuse against a different source. */
  sourceFileId?: string;
}

/**
 * Dense `git log --oneline`-style reader for real recent GitHub activity —
 * reuses the same already-hydrated `github:activity` content the Explorer
 * and Editor already read (VFS_DESIGN.md §11.5), no separate fetch. `sha`
 * is present when the backend sourced this from real commit search
 * (server/providers/github/githubApiClient.ts's searchRecentCommits) and
 * absent for the Events-API-derived fallback — rendered conditionally so
 * neither data source ever needs a fake placeholder for the other's field.
 * One line per commit, by design: this reads as terminal output, not an
 * activity feed — repoName is available via the row's title tooltip
 * rather than its own visual line, keeping the commit message the one
 * thing competing for attention.
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
      <div className="my-4 rounded-md border border-[#333333] bg-[#1e1e1e] p-3 text-[13px] italic text-[#858585]">
        No recent public activity.
      </div>
    );
  }

  return (
    <div className="my-4 rounded-md border border-[#333333] bg-[#1e1e1e] font-mono text-[12px]">
      <div className="flex items-center gap-2 border-b border-[#333333] px-3 py-1 text-[#858585]">
        <span className="h-2 w-2 rounded-full bg-[#f14c4c]" />
        <span className="h-2 w-2 rounded-full bg-[#e5e510]" />
        <span className="h-2 w-2 rounded-full bg-[#3fb950]" />
        <span className="ml-2 text-[10px]">git log --oneline</span>
      </div>
      <div className="px-3 py-1.5">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5 leading-tight" title={entry.repoName}>
            <span className="shrink-0 text-[#3fb950]">●</span>
            {entry.sha && <span className="shrink-0 text-[#4ec9b0]">{entry.sha}</span>}
            <span className="min-w-0 flex-1 truncate text-[#cccccc]">{entry.summary}</span>
            <span className="shrink-0 text-[10px] text-[#858585]">{formatRelativeTime(entry.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
