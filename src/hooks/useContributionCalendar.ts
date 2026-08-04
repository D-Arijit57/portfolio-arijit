import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { extractFencedBlock } from '../lib/extractFencedBlock';
import type { GitHubContributionCalendar } from '../types/github';

/**
 * Reads + parses the same already-hydrated `github:contributions` VFS file
 * GitHubContributionGraph has always read — pulled out so
 * ContributionsTerminal's stats footer can compute streaks/best-day/etc.
 * from the identical calendar data the grid renders, without a second
 * fetch or a second (potentially drifting) parse implementation.
 */
export function useContributionCalendar(sourceFileId = 'github:contributions') {
  const file = useStore((state) => state.workspaceFiles.find((f) => f.id === sourceFileId));

  const calendar = useMemo<GitHubContributionCalendar | null>(() => {
    if (!file) return null;
    const raw = extractFencedBlock(file.content, 'github-contribution-calendar');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GitHubContributionCalendar;
    } catch {
      return null;
    }
  }, [file]);

  return { file, calendar };
}
