import type {
  LeetCodeActivitySummary,
  LeetCodeContestSummary,
  LeetCodeProfile,
  LeetCodeSolvedStats,
  LeetCodeSubmissionEntry,
  RawLeetCodeCalendar,
  RawLeetCodeContestHistoryEntry,
  RawLeetCodeContestRanking,
  RawLeetCodeMatchedUser,
  RawLeetCodeRecentSubmission,
  RawLeetCodeSubmitStatEntry,
} from './leetcodeTypes';

const RECENT_CONTEST_CAP = 10;
const ACTIVITY_WINDOW_DAYS = 90;

/**
 * Transformer stage (VFS_DESIGN.md §11.2): pure functions, raw LeetCode API
 * response -> internal domain types. Never produces markdown or VirtualFile —
 * that's the next two stages' job.
 */

export function transformProfile(raw: RawLeetCodeMatchedUser): LeetCodeProfile {
  return {
    username: raw.username,
    displayName: raw.profile.realName || raw.username,
    aboutMe: raw.profile.aboutMe,
    avatarUrl: raw.profile.userAvatar,
    ranking: raw.profile.ranking,
    countryName: raw.profile.countryName,
    company: raw.profile.company,
    school: raw.profile.school,
    profileUrl: `https://leetcode.com/${raw.username}/`,
  };
}

export function transformSolvedStats(raw: RawLeetCodeMatchedUser): LeetCodeSolvedStats {
  const findCount = (entries: readonly RawLeetCodeSubmitStatEntry[], difficulty: string) =>
    entries.find((entry) => entry.difficulty === difficulty)?.count ?? 0;

  const ac = raw.submitStatsGlobal.acSubmissionNum;
  const total = raw.submitStatsGlobal.totalSubmissionNum;

  const totalSolved = findCount(ac, 'All');
  const totalSubmissions = findCount(total, 'All');

  return {
    easySolved: findCount(ac, 'Easy'),
    mediumSolved: findCount(ac, 'Medium'),
    hardSolved: findCount(ac, 'Hard'),
    totalSolved,
    totalSubmissions,
    acceptanceRate: totalSubmissions > 0 ? (totalSolved / totalSubmissions) * 100 : null,
  };
}

/** Already capped to RECENT_SUBMISSIONS_LIMIT by the API client's own query. */
export function transformRecentSubmissions(raw: readonly RawLeetCodeRecentSubmission[]): LeetCodeSubmissionEntry[] {
  return raw.map((entry) => ({
    title: entry.title,
    slug: entry.titleSlug,
    status: entry.statusDisplay,
    language: entry.lang,
    submittedAt: new Date(Number(entry.timestamp) * 1000).toISOString(),
  }));
}

/** Bounded to the most recent RECENT_CONTEST_CAP attended contests (VFS_DESIGN.md §11.5's top-N precedent). */
export function transformContest(
  ranking: RawLeetCodeContestRanking | null,
  history: readonly RawLeetCodeContestHistoryEntry[],
): LeetCodeContestSummary {
  const recentContests = history
    .filter((entry): entry is RawLeetCodeContestHistoryEntry & { contest: NonNullable<RawLeetCodeContestHistoryEntry['contest']> } =>
      entry.attended && entry.contest !== null,
    )
    .sort((a, b) => b.contest.startTime - a.contest.startTime)
    .slice(0, RECENT_CONTEST_CAP)
    .map((entry) => ({
      title: entry.contest.title,
      ranking: entry.ranking,
      rating: Math.round(entry.rating),
      startedAt: new Date(entry.contest.startTime * 1000).toISOString(),
    }));

  return {
    attendedCount: ranking?.attendedContestsCount ?? 0,
    rating: ranking ? Math.round(ranking.rating) : null,
    globalRanking: ranking?.globalRanking ?? null,
    topPercentage: ranking?.topPercentage ?? null,
    recentContests,
  };
}

/**
 * `submissionCalendar` is a JSON-encoded { [unixDayStartSeconds]: count }
 * map. currentStreak/totalActiveDays come straight from the API; the
 * windowed active-day count mirrors GitHub's deriveContributions bounding
 * (VFS_DESIGN.md §11.5) so activity.md stays a bounded summary, not an
 * unbounded calendar dump.
 */
export function transformActivity(raw: RawLeetCodeCalendar | undefined): LeetCodeActivitySummary {
  if (!raw) {
    return { currentStreak: 0, totalActiveDays: 0, activeDaysInWindow: 0, windowDays: ACTIVITY_WINDOW_DAYS };
  }

  const cutoffSeconds = Date.now() / 1000 - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60;
  let calendar: Record<string, number>;
  try {
    calendar = JSON.parse(raw.submissionCalendar) as Record<string, number>;
  } catch {
    calendar = {};
  }

  const activeDaysInWindow = Object.entries(calendar).filter(
    ([daySeconds, count]) => count > 0 && Number(daySeconds) >= cutoffSeconds,
  ).length;

  return {
    currentStreak: raw.streak,
    totalActiveDays: raw.totalActiveDays,
    activeDaysInWindow,
    windowDays: ACTIVITY_WINDOW_DAYS,
  };
}
