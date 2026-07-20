import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { extractFencedBlock } from '../../lib/extractFencedBlock';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import type { GitHubContributionCalendar } from '../../types/github';

// GitHub's own dark-mode intensity scale, reused as-is — this is already a
// muted, low-saturation palette that sits naturally against the workspace's
// #1e1e1e background; level 0 is swapped for a VS Code-neutral tone instead
// of GitHub's near-black so it doesn't read as "missing data" against the
// editor chrome.
const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: '#2a2d2e',
  1: '#0e4429',
  2: '#006d32',
  3: '#26a641',
  4: '#39d353',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const REVEAL_SESSION_KEY = 'github-contribution-graph';
const MIN_REVEAL_MS = 600;
const MAX_REVEAL_MS = 1000;
const MIN_STEPS = 6;
const MAX_STEPS = 10;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

interface GitHubContributionGraphProps {
  /** Defaults to the generated GitHub provider's contributions file — override only for reuse against a different source. */
  sourceFileId?: string;
}

/**
 * Reusable GitHub-style contribution heatmap. Reads real, already-hydrated
 * VFS content (VFS_DESIGN.md §11.5's `github:contributions` file) — no
 * network call of its own, no separate cache: the reconciled tree already
 * is the cache, and this re-renders automatically whenever a provider
 * refresh updates that file's content, since it subscribes to the store
 * directly rather than reading a point-in-time snapshot.
 */
export function GitHubContributionGraph({ sourceFileId = 'github:contributions' }: GitHubContributionGraphProps) {
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

  const totalWeeks = calendar?.weeks.length ?? 0;
  const [revealedWeeks, setRevealedWeeks] = useState(() =>
    !calendar || hasAnimated(REVEAL_SESSION_KEY) || prefersReducedMotion() ? totalWeeks : 0,
  );
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (!calendar) return;

    if (hasAnimated(REVEAL_SESSION_KEY) || prefersReducedMotion()) {
      setRevealedWeeks(calendar.weeks.length);
      return;
    }

    setRevealedWeeks(0);

    const duration = randomBetween(MIN_REVEAL_MS, MAX_REVEAL_MS);
    const stepCount = Math.min(calendar.weeks.length, Math.round(randomBetween(MIN_STEPS, MAX_STEPS)));
    if (stepCount === 0) return;

    let elapsed = 0;
    for (let i = 0; i < stepCount; i++) {
      const isLast = i === stepCount - 1;
      const weeksAtStep = isLast ? calendar.weeks.length : Math.round(((i + 1) / stepCount) * calendar.weeks.length);
      const stepDelay = randomBetween((duration / stepCount) * 0.5, (duration / stepCount) * 1.5);
      elapsed += stepDelay;

      const isFirst = i === 0;
      const timeout = window.setTimeout(() => {
        if (isFirst) markAnimated(REVEAL_SESSION_KEY);
        setRevealedWeeks(weeksAtStep);
      }, elapsed);
      timeoutsRef.current.push(timeout);
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // Keyed on the calendar's week count alone — a re-fetch that returns the
    // same shape must not replay; this only re-triggers if the underlying
    // file genuinely changes shape (extremely rare, a provider refresh).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar?.weeks.length]);

  if (!file) {
    return (
      <div className="text-[13px] text-[#858585] italic py-2">
        GitHub contribution data isn't available yet.
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="text-[13px] text-[#858585] italic py-2">
        Contribution calendar unavailable this cycle.
      </div>
    );
  }

  const monthMarkers: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;
  calendar.weeks.forEach((week, weekIndex) => {
    const firstDay = week.days[0];
    if (!firstDay) return;
    const month = new Date(firstDay.date).getMonth();
    if (month !== lastMonth) {
      monthMarkers.push({ weekIndex, label: MONTH_LABELS[month] });
      lastMonth = month;
    }
  });

  return (
    <div
      className="my-4 rounded-md border border-[#333333] bg-[#1e1e1e] p-4 font-mono text-[12px]"
      role="img"
      aria-label={`GitHub contribution calendar, ${calendar.totalContributions} contributions in the last year`}
    >
      <div className="mb-2 text-[#cccccc]">{calendar.totalContributions} contributions in the last year</div>

      <div className="overflow-x-auto">
        <div className="relative inline-block">
          <div className="relative mb-1 h-[14px]" style={{ width: totalWeeks * 13 }}>
            {monthMarkers.map(({ weekIndex, label }) => (
              <span
                key={weekIndex}
                className="absolute top-0 text-[10px] text-[#858585]"
                style={{ left: weekIndex * 13 }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {calendar.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.days.map((day) => {
                  const revealed = weekIndex < revealedWeeks;
                  const color = revealed ? LEVEL_COLORS[day.level] : LEVEL_COLORS[0];
                  return (
                    <div
                      key={day.date}
                      role="gridcell"
                      tabIndex={0}
                      aria-label={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}
                      title={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}
                      className="h-[10px] w-[10px] rounded-[2px] outline-none transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-[#007acc]"
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[#858585]">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <div key={level} className="h-[10px] w-[10px] rounded-[2px]" style={{ backgroundColor: LEVEL_COLORS[level] }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
