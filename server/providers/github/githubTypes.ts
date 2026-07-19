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
}

export interface GitHubContributionSummary {
  activeDayCount: number;
  totalEventCount: number;
  mostActiveRepo: string | null;
  windowDays: number;
}
