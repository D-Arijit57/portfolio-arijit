/**
 * Wire shapes for the subset of the GitHub REST/GraphQL response fields
 * GitHubApiClient reads. Deliberately partial — only what the pipeline
 * actually consumes, not a full GitHub API type definition.
 */

export interface RawGitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  location: string | null;
  company: string | null;
  blog: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  html_url: string;
}

export interface RawGitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  fork: boolean;
}

export interface RawGitHubEvent {
  type: string;
  repo: { name: string };
  created_at: string;
  // GitHub's public Events API omits commit-level detail (privacy trimming) —
  // a PushEvent's payload carries only ref/head/before, no commit count.
  payload?: { ref?: string; action?: string; ref_type?: string };
}

export interface RawGitHubPinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  primaryLanguage: { name: string } | null;
}

/** One item from `GET /search/commits` (Search API, not the Events feed — see githubApiClient.ts). */
export interface RawGitHubCommitSearchResult {
  sha: string;
  commit: {
    message: string;
    author: { date: string };
  };
  repository: { full_name: string };
}

export interface RawGitHubCommitSearchResponse {
  total_count: number;
  items: RawGitHubCommitSearchResult[];
}

/** Raw shape of GitHub's GraphQL `contributionsCollection.contributionCalendar`. */
export interface RawGitHubContributionCalendar {
  totalContributions: number;
  weeks: {
    contributionDays: {
      date: string;
      contributionCount: number;
    }[];
  }[];
}

/**
 * Internal domain types the Transformer stage produces (VFS_DESIGN.md §11.2)
 * — the Markdown Generator stage knows only these shapes, never the raw
 * GitHub wire format.
 */

export interface GitHubProfile {
  login: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string;
  location: string | null;
  company: string | null;
  blog: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  memberSince: string;
  profileUrl: string;
}

export interface GitHubRepoSummary {
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
}

export interface GitHubPinnedRepoSummary {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  language: string | null;
}

export interface GitHubActivityEntry {
  summary: string;
  repoName: string;
  createdAt: string;
  /** Short (7-char) commit SHA — present only when sourced from real commit
   *  search (transformCommits), absent for the Events-API-derived fallback
   *  (transformActivity), which has no per-commit detail to offer one. */
  sha?: string;
}

/** A single day's contribution intensity, GitHub-style 0-4 level bucketing. */
export interface GitHubContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface GitHubContributionWeek {
  days: GitHubContributionDay[];
}

/** Real contribution calendar (VFS_DESIGN.md §11.7 tech debt, now resolved via GraphQL). */
export interface GitHubContributionCalendar {
  totalContributions: number;
  weeks: GitHubContributionWeek[];
}
