import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { GitHubContributionGraph, CONTRIBUTION_REVEAL_SESSION_KEY } from './GitHubContributionGraph';
import { useContributionCalendar } from '../../hooks/useContributionCalendar';
import { computeContributionStats } from '../../lib/contributionStats';
import { formatRelativeTime } from '../../lib/formatRelativeTime';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';

// Pause between the command line appearing and the graph's own reveal
// (Phase A) starting — long enough to read as a beat, not a stutter. The
// terminal box itself no longer plays a separate left-to-right clip: round
// 2 moved all the "structure appearing" motion into the graph's own Phase A
// (the empty grid being placed left-to-right), so a second, overlapping
// directional reveal on the box would just be redundant motion. The box
// now only does a quick opacity fade, timed with the command line.
const COMMAND_PAUSE_MS = 200;
// Extra settle time after the graph reports its cells have finished before
// the stats footer starts fading in, so it never appears to race the grid.
const STATS_DELAY_MS = 100;

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

// Each stat row fades + translates up independently (with its own
// transition-delay) rather than the block fading in as one unit — Stage 4
// of the reveal calls for "small stagger between each statistic".
function StatRow({
  children,
  visible,
  animate,
  delayMs,
  className,
}: {
  children: React.ReactNode;
  visible: boolean;
  animate: boolean;
  delayMs: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: animate ? `opacity 260ms ease-out, transform 260ms ease-out` : 'none',
        transitionDelay: animate ? `${delayMs}ms` : '0ms',
      }}
    >
      {children}
    </div>
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
 *
 * Discovery, not display: on a first-time-this-session view, nothing below
 * the fold renders until the user has actually scrolled this section into
 * view (see useInViewOnce below) — a muted "-- more --" hint sits above it
 * until then. Once triggered, the command line appears, the terminal box
 * clip-reveals left to right, GitHubContributionGraph runs its own
 * cell-by-cell stagger (see CONTRIBUTION_REVEAL_SESSION_KEY — one shared
 * session flag gates this component's staging *and* the graph's, so they
 * can't drift out of sync on a repeat visit), and only once that settles
 * does the stats footer fade up. On any later view this session — or under
 * prefers-reduced-motion — every stage renders in its final state
 * immediately, no hint, no transitions.
 */
export function ContributionsTerminal() {
  const { file, calendar } = useContributionCalendar();
  const stats = calendar ? computeContributionStats(calendar) : null;

  const profileFile = useStore((state) => state.workspaceFiles.find((f) => f.id === 'github:profile'));
  const profileUrl = useMemo(() => {
    if (!profileFile) return null;
    return profileFile.content.match(GITHUB_LINK_PATTERN)?.[1] ?? null;
  }, [profileFile]);

  // Captured once at mount, not recomputed every render: markAnimated() is
  // called mid-sequence below, and if this were a plain derived const it
  // would flip true on the very next re-render those state updates cause —
  // silently disabling every transition the sequence just started.
  const [alreadyPlayed] = useState(() => hasAnimated(CONTRIBUTION_REVEAL_SESSION_KEY) || prefersReducedMotion());
  const { ref: sectionRef, inView } = useInViewOnce<HTMLDivElement>(0.15);

  const [commandVisible, setCommandVisible] = useState(alreadyPlayed);
  const [graphActive, setGraphActive] = useState(alreadyPlayed);
  const [statsVisible, setStatsVisible] = useState(alreadyPlayed);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (alreadyPlayed || !inView || !calendar) return;

    markAnimated(CONTRIBUTION_REVEAL_SESSION_KEY);
    setCommandVisible(true);
    timeoutsRef.current.push(window.setTimeout(() => setGraphActive(true), COMMAND_PAUSE_MS));
  }, [alreadyPlayed, inView, calendar]);

  const handleGraphRevealComplete = useCallback(() => {
    if (alreadyPlayed) return;
    timeoutsRef.current.push(window.setTimeout(() => setStatsVisible(true), STATS_DELAY_MS));
  }, [alreadyPlayed]);

  const hintVisible = !alreadyPlayed && !commandVisible;

  const todayIso = new Date().toISOString().slice(0, 10);
  const lastUpdatedLabel = !stats?.lastDate
    ? 'unknown'
    : stats.lastDate === todayIso
      ? 'today'
      : formatRelativeTime(stats.lastDate).toLowerCase();

  return (
    <div className="my-4" ref={sectionRef}>
      {!alreadyPlayed && (
        <div
          aria-hidden={!hintVisible}
          className="overflow-hidden text-[11px] transition-[opacity,max-height,margin] duration-300 ease-out"
          style={{
            fontFamily: ROBOTO_MONO,
            color: MUTED,
            opacity: hintVisible ? 1 : 0,
            maxHeight: hintVisible ? 16 : 0,
            marginBottom: hintVisible ? 8 : 0,
          }}
        >
          -- more --
        </div>
      )}

      <div
        className="mb-2 text-[12px] transition-opacity duration-200 ease-out"
        style={{ fontFamily: ROBOTO_MONO, opacity: commandVisible ? 1 : 0 }}
      >
        <span style={{ color: GREEN }}>arijit</span>
        <span style={{ color: MUTED }}>@</span>
        <span style={{ color: '#569cd6' }}>github</span>
        <span style={{ color: MUTED }}>:~$</span> <span className="text-[#cccccc]">./contributions.sh</span>
      </div>

      <div
        className="overflow-hidden rounded-md border border-[#2d2d30] bg-[#111318] p-4 text-[#cccccc]"
        style={{
          fontFamily: ROBOTO_MONO,
          opacity: commandVisible ? 1 : 0,
          transition: alreadyPlayed ? 'none' : 'opacity 120ms ease-out',
        }}
      >
        {!file || !calendar ? (
          <div className="py-2 text-[12px] italic" style={{ color: MUTED }}>
            {!file ? 'GitHub contribution data isn’t available yet.' : 'Contribution calendar unavailable this cycle.'}
          </div>
        ) : (
          <GitHubContributionGraph
            variant="bare"
            cellSize={14}
            gap={4}
            active={graphActive}
            onRevealComplete={handleGraphRevealComplete}
          />
        )}

        {stats && (
          <div className="mt-3 border-t border-[#2d2d30] pt-3 text-[12px] leading-[1.9]">
            <StatRow visible={statsVisible} animate={!alreadyPlayed} delayMs={0} className="flex items-baseline justify-between gap-4">
              <div>
                <Num color={GREEN}>{stats.total.toLocaleString()}</Num>
                <span style={{ color: MUTED }}> contributions in the last year</span>
              </div>
              {stats.firstDate && stats.lastDate && (
                <div className="shrink-0" style={{ color: MUTED }}>
                  {stats.firstDate} → {stats.lastDate}
                </div>
              )}
            </StatRow>

            <StatRow visible={statsVisible} animate={!alreadyPlayed} delayMs={70} className="flex items-baseline justify-between gap-4">
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
            </StatRow>

            <StatRow visible={statsVisible} animate={!alreadyPlayed} delayMs={140}>
              <span style={{ color: MUTED }}>today </span>
              <Num color={AMBER}>{stats.todayCount}</Num>
              <span style={{ color: MUTED }}> commit{stats.todayCount === 1 ? '' : 's'} · last updated {lastUpdatedLabel}</span>
            </StatRow>
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
