import type {
  GitHubActivityEntry,
  GitHubContributionSummary,
  GitHubPinnedRepoSummary,
  GitHubProfile,
  GitHubRepoSummary,
  RawGitHubEvent,
  RawGitHubPinnedRepo,
  RawGitHubRepo,
  RawGitHubUser,
} from './githubTypes';

const REPO_CAP = 20;
const ACTIVITY_CAP = 20;
const CONTRIBUTION_WINDOW_DAYS = 90;

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
 * Approximation, not a true contribution calendar — GitHub's public REST API
 * doesn't expose the contribution graph; that would require the GraphQL API
 * (VFS_DESIGN.md §11.7, flagged tech debt). Derived from the same public
 * Events feed activity.md uses, bounded to the last 90 days.
 */
export function deriveContributions(raw: readonly RawGitHubEvent[]): GitHubContributionSummary {
  const cutoff = Date.now() - CONTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recent = raw.filter((event) => new Date(event.created_at).getTime() >= cutoff);

  const activeDays = new Set(recent.map((event) => event.created_at.slice(0, 10)));
  const repoCounts = new Map<string, number>();
  for (const event of recent) {
    repoCounts.set(event.repo.name, (repoCounts.get(event.repo.name) ?? 0) + 1);
  }
  let mostActiveRepo: string | null = null;
  let highestCount = 0;
  for (const [repo, count] of repoCounts) {
    if (count > highestCount) {
      mostActiveRepo = repo;
      highestCount = count;
    }
  }

  return {
    activeDayCount: activeDays.size,
    totalEventCount: recent.length,
    mostActiveRepo,
    windowDays: CONTRIBUTION_WINDOW_DAYS,
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
