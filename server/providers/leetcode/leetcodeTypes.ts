/**
 * Wire shapes for the subset of LeetCode's (unofficial) GraphQL response
 * fields LeetCodeApiClient reads. Deliberately partial — only what the
 * pipeline actually consumes, not a full schema definition. See
 * ARCHITECTURE.md's "LeetCode Provider" §3 note: this endpoint is unofficial,
 * unlike GitHub's documented REST API.
 */

export interface RawLeetCodeSubmitStatEntry {
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'All';
  count: number;
  submissions: number;
}

export interface RawLeetCodeProfile {
  realName: string | null;
  userAvatar: string;
  ranking: number | null;
  countryName: string | null;
  company: string | null;
  school: string | null;
  aboutMe: string | null;
}

export interface RawLeetCodeMatchedUser {
  username: string;
  profile: RawLeetCodeProfile;
  submitStatsGlobal: {
    acSubmissionNum: RawLeetCodeSubmitStatEntry[];
    totalSubmissionNum: RawLeetCodeSubmitStatEntry[];
  };
}

export interface RawLeetCodeRecentSubmission {
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
}

export interface RawLeetCodeContestRanking {
  attendedContestsCount: number;
  rating: number;
  globalRanking: number | null;
  totalParticipants: number | null;
  topPercentage: number | null;
}

export interface RawLeetCodeContestHistoryEntry {
  attended: boolean;
  rating: number;
  ranking: number;
  contest: { title: string; startTime: number } | null;
}

export interface RawLeetCodeCalendar {
  streak: number;
  totalActiveDays: number;
  /** JSON-encoded map of unix-day-start-seconds -> submission count for that day. */
  submissionCalendar: string;
}

/**
 * Internal domain types the Transformer stage produces (VFS_DESIGN.md §11.2)
 * — the Markdown Generator stage knows only these shapes, never the raw
 * LeetCode wire format.
 */

export interface LeetCodeProfile {
  username: string;
  displayName: string;
  aboutMe: string | null;
  avatarUrl: string;
  ranking: number | null;
  countryName: string | null;
  company: string | null;
  school: string | null;
  profileUrl: string;
}

export interface LeetCodeSolvedStats {
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSolved: number;
  totalSubmissions: number;
  acceptanceRate: number | null;
}

export interface LeetCodeSubmissionEntry {
  title: string;
  slug: string;
  status: string;
  language: string;
  submittedAt: string;
}

export interface LeetCodeRecentContestEntry {
  title: string;
  ranking: number;
  rating: number;
  startedAt: string;
}

export interface LeetCodeContestSummary {
  attendedCount: number;
  rating: number | null;
  globalRanking: number | null;
  topPercentage: number | null;
  recentContests: LeetCodeRecentContestEntry[];
}

export interface LeetCodeActivitySummary {
  currentStreak: number;
  totalActiveDays: number;
  activeDaysInWindow: number;
  windowDays: number;
}
