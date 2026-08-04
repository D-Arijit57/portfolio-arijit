import React, { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { GitHubContributionGraph } from './GitHubContributionGraph';
import { useContributionCalendar } from '../../hooks/useContributionCalendar';
import { computeContributionStats } from '../../lib/contributionStats';
import { formatRelativeTime } from '../../lib/formatRelativeTime';

const GITHUB_LINK_PATTERN = /GitHub: \[@[\w-]+\]\((https:\/\/[^)]+)\)/;

const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";

// Reused, not invented: green/cyan/amber already mean something elsewhere
// on this page — #3fb950 is the "Available" status dot, #4fc1ff is
// index.css's own --tok-metric ("numbers, deltas, throughput"), #d19a66 is
// PROSE_CLASSNAMES' bold/accent tan. Syntax-highlighting the stats with the
// page's existing palette instead of new hex values.
const GREEN = '#3fb950';
const CYAN = 'var(--tok-metric)';
const AMBER = '#d19a66';
const MUTED = '#858585';

function Num({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="font-medium" style={{ color }}>
      {children}
    </span>
  );
}

/**
 * whoami.md's GitHub Contributions section — presented as a command a
 * developer ran (`./contributions.sh`) rather than a dashboard widget. The
 * prompt line sits above one plain bordered terminal (no title bar/dots —
 * matches the reference target exactly, a single continuous surface, not a
 * window with chrome) containing the heatmap (GitHubContributionGraph's
 * `bare` variant — same grid/reveal/legend, just without its own card
 * chrome or heading) and a stats footer as terminal output, not cards.
 * Stats are computed from the same calendar data the grid reads
 * (useContributionCalendar + computeContributionStats) — live, not
 * hardcoded.
 */
export function ContributionsTerminal() {
  const { file, calendar } = useContributionCalendar();
  const stats = calendar ? computeContributionStats(calendar) : null;

  const profileFile = useStore((state) => state.workspaceFiles.find((f) => f.id === 'github:profile'));
  const profileUrl = useMemo(() => {
    if (!profileFile) return null;
    return profileFile.content.match(GITHUB_LINK_PATTERN)?.[1] ?? null;
  }, [profileFile]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const lastUpdatedLabel = !stats?.lastDate
    ? 'unknown'
    : stats.lastDate === todayIso
      ? 'today'
      : formatRelativeTime(stats.lastDate).toLowerCase();

  return (
    <div className="my-4">
      <div className="mb-2 text-[12px]" style={{ fontFamily: ROBOTO_MONO }}>
        <span style={{ color: GREEN }}>arijit</span>
        <span style={{ color: MUTED }}>@</span>
        <span style={{ color: '#569cd6' }}>github</span>
        <span style={{ color: MUTED }}>:~$</span> <span className="text-[#cccccc]">./contributions.sh</span>
      </div>

      <div
        className="overflow-hidden rounded-md border border-[#2d2d30] bg-[#111318] p-4 text-[#cccccc]"
        style={{ fontFamily: ROBOTO_MONO }}
      >
        {!file || !calendar ? (
          <div className="py-2 text-[12px] italic" style={{ color: MUTED }}>
            {!file ? 'GitHub contribution data isn’t available yet.' : 'Contribution calendar unavailable this cycle.'}
          </div>
        ) : (
          <GitHubContributionGraph variant="bare" cellSize={14} gap={4} />
        )}

        {stats && (
          <div className="mt-3 border-t border-[#2d2d30] pt-3 text-[12px] leading-[1.9]">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <Num color={GREEN}>{stats.total.toLocaleString()}</Num>
                <span style={{ color: MUTED }}> contributions in the last year</span>
              </div>
              {stats.firstDate && stats.lastDate && (
                <div className="shrink-0" style={{ color: MUTED }}>
                  {stats.firstDate} → {stats.lastDate}
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <div>
                <span style={{ color: MUTED }}>current streak </span>
                <Num color={CYAN}>{stats.currentStreak}</Num>
                <span style={{ color: MUTED }}> days · longest </span>
                <Num color={CYAN}>{stats.longestStreak}</Num>
                <span style={{ color: MUTED }}> days · active </span>
                <Num color={CYAN}>{stats.activeDays}</Num>
                <span style={{ color: MUTED }}> days</span>
              </div>
              {stats.bestDay && (
                <div className="shrink-0">
                  <span style={{ color: MUTED }}>best day </span>
                  <Num color={AMBER}>{stats.bestDay.count}</Num>
                  <span style={{ color: MUTED }}> on {stats.bestDay.date}</span>
                </div>
              )}
            </div>

            <div>
              <span style={{ color: MUTED }}>today </span>
              <Num color={AMBER}>{stats.todayCount}</Num>
              <span style={{ color: MUTED }}> commit{stats.todayCount === 1 ? '' : 's'} · last updated {lastUpdatedLabel}</span>
            </div>
          </div>
        )}
      </div>

      {profileUrl && (
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-[12px] text-[#007acc] hover:underline"
        >
          View full GitHub profile →
        </a>
      )}
    </div>
  );
}
