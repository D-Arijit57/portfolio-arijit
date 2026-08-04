import type { GitHubContributionCalendar } from '../types/github';

export interface ContributionStats {
  total: number;
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  todayCount: number;
  bestDay: { count: number; date: string } | null;
  /** Last day present in the calendar — the data is generated through "today", so this doubles as the "as of" date. */
  lastDate: string | null;
  /** First day present in the calendar — paired with lastDate for the "2025-08-03 → 2026-08-04" range line. */
  firstDate: string | null;
}

/**
 * Derives every ContributionsTerminal stat from the day-level calendar data
 * already hydrated for the heatmap (GitHubContributionGraph reads the same
 * `github:contributions` file) — no second fetch, no separate stats
 * endpoint. Streaks/active-days/best-day are computed here rather than
 * trusted from the server because only `totalContributions` is a field the
 * calendar payload actually carries; everything else is derived from the
 * per-day counts that payload already includes.
 */
export function computeContributionStats(calendar: GitHubContributionCalendar): ContributionStats {
  const days = calendar.weeks.flatMap((week) => week.days);

  let activeDays = 0;
  let longestStreak = 0;
  let running = 0;
  let bestDay: { count: number; date: string } | null = null;

  for (const day of days) {
    if (day.count > 0) {
      activeDays += 1;
      running += 1;
      if (running > longestStreak) longestStreak = running;
    } else {
      running = 0;
    }
    if (!bestDay || day.count > bestDay.count) {
      bestDay = { count: day.count, date: day.date };
    }
  }

  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) currentStreak += 1;
    else break;
  }

  const firstDay = days[0] ?? null;
  const lastDay = days[days.length - 1] ?? null;

  return {
    total: calendar.totalContributions,
    currentStreak,
    longestStreak,
    activeDays,
    todayCount: lastDay?.count ?? 0,
    bestDay,
    lastDate: lastDay?.date ?? null,
    firstDate: firstDay?.date ?? null,
  };
}
