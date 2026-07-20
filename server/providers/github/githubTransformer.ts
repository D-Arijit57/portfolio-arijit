import type {
  GitHubActivityEntry,
  GitHubContributionCalendar,
  GitHubPinnedRepoSummary,
  GitHubProfile,
  GitHubRepoSummary,
  RawGitHubCommitSearchResult,
  RawGitHubContributionCalendar,
  RawGitHubEvent,
  RawGitHubPinnedRepo,
  RawGitHubRepo,
  RawGitHubUser,
} from './githubTypes';

const REPO_CAP = 20;
const ACTIVITY_CAP = 20;

/**
 * Transformer stage (VFS_DESIGN.md §11.2): pure functions, raw GitHub API
 * response -> internal domain types. Never produces markdown or VirtualFile —
 * that's the next two stages' job.
 */

export function transformProfile(raw: RawGitHubUser): GitHubProfile {
  return {
    login: raw.login,
    displayName: raw.name ?? raw.login,
    bio: raw.bio,
    avatarUrl: raw.avatar_url,
    location: raw.location,
    company: raw.company,
    blog: raw.blog,
    followers: raw.followers,
    following: raw.following,
    publicRepos: raw.public_repos,
    memberSince: raw.created_at,
    profileUrl: raw.html_url,
  };
}

/** Bounded top-N by stars then recency, forks excluded (VFS_DESIGN.md §11.5 — keeps namespace size constant). */
export function transformRepos(raw: readonly RawGitHubRepo[]): GitHubRepoSummary[] {
  return raw
    .filter((repo) => !repo.fork)
    .slice()
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.updated_at.localeCompare(a.updated_at))
    .slice(0, REPO_CAP)
    .map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      updatedAt: repo.updated_at,
    }));
}

/** GitHub caps pins at 6 upstream; no additional bounding needed (VFS_DESIGN.md §11.5). */
export function transformPinned(raw: readonly RawGitHubPinnedRepo[]): GitHubPinnedRepoSummary[] {
  return raw.map((repo) => ({
    name: repo.name,
    description: repo.description,
    url: repo.url,
    stars: repo.stargazerCount,
    language: repo.primaryLanguage?.name ?? null,
  }));
}

export function transformActivity(raw: readonly RawGitHubEvent[]): GitHubActivityEntry[] {
  return raw
    .slice(0, ACTIVITY_CAP)
    .map((event) => ({
      summary: describeEvent(event),
      repoName: event.repo.name,
      createdAt: event.created_at,
    }))
    .filter((entry): entry is GitHubActivityEntry => entry.summary !== null);
}

/**
 * Real commit history from the Search API (githubApiClient.searchRecentCommits) —
 * preferred over transformActivity's Events-derived summaries whenever
 * available, since these carry an actual SHA and the real, unmodified first
 * line of the commit message rather than a generated description.
 */
export function transformCommits(raw: readonly RawGitHubCommitSearchResult[]): GitHubActivityEntry[] {
  return raw.map((item) => ({
    summary: item.commit.message.split('\n')[0],
    repoName: item.repository.full_name,
    createdAt: item.commit.author.date,
    sha: item.sha.slice(0, 7),
  }));
}

/**
 * Real contribution calendar (VFS_DESIGN.md §11.7 tech debt, now resolved):
 * GitHub's GraphQL API returns exact per-day counts directly — no
 * approximation from the Events feed needed anymore. Level bucketing
 * mirrors GitHub's own relative-intensity scheme (quartiles of this
 * account's own max daily count, not a fixed global threshold), since
 * GitHub's exact bucketing algorithm isn't publicly documented.
 */
export function transformContributionCalendar(raw: RawGitHubContributionCalendar): GitHubContributionCalendar {
  const maxCount = raw.weeks.reduce(
    (max, week) => Math.max(max, ...week.contributionDays.map((day) => day.contributionCount)),
    0,
  );
  const step = maxCount > 0 ? maxCount / 4 : 0;

  const levelFor = (count: number): 0 | 1 | 2 | 3 | 4 => {
    if (count === 0) return 0;
    if (step === 0) return 1;
    return Math.min(4, Math.ceil(count / step)) as 1 | 2 | 3 | 4;
  };

  return {
    totalContributions: raw.totalContributions,
    weeks: raw.weeks.map((week) => ({
      days: week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
        level: levelFor(day.contributionCount),
      })),
    })),
  };
}

function describeEvent(event: RawGitHubEvent): string | null {
  switch (event.type) {
    case 'PushEvent': {
      const branch = event.payload?.ref?.replace(/^refs\/heads\//, '');
      return branch ? `Pushed to ${branch} on ${event.repo.name}` : `Pushed to ${event.repo.name}`;
    }
    case 'PullRequestEvent':
      return `${capitalize(event.payload?.action ?? 'updated')} a pull request on ${event.repo.name}`;
    case 'IssuesEvent':
      return `${capitalize(event.payload?.action ?? 'updated')} an issue on ${event.repo.name}`;
    case 'IssueCommentEvent':
      return `Commented on an issue on ${event.repo.name}`;
    case 'CreateEvent':
      return `Created ${event.payload?.ref_type ?? 'a ref'} on ${event.repo.name}`;
    case 'ForkEvent':
      return `Forked ${event.repo.name}`;
    case 'WatchEvent':
      return `Starred ${event.repo.name}`;
    case 'ReleaseEvent':
      return `Published a release on ${event.repo.name}`;
    default:
      return null;
  }
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}
