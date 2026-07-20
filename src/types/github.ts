// Frontend mirror of server/providers/github/githubTypes.ts's domain shapes
// that cross the wire embedded inside generated markdown (see
// server/providers/github/githubMarkdownGenerator.ts) — kept intentionally
// minimal, only the fields the frontend widgets actually read.

export interface GitHubContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface GitHubContributionWeek {
  days: GitHubContributionDay[];
}

export interface GitHubContributionCalendar {
  totalContributions: number;
  weeks: GitHubContributionWeek[];
}

export interface GitHubActivityEntry {
  summary: string;
  repoName: string;
  createdAt: string;
}
