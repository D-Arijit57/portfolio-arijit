import type {
  GitHubActivityEntry,
  GitHubContributionSummary,
  GitHubPinnedRepoSummary,
  GitHubProfile,
  GitHubRepoSummary,
} from './githubTypes';

/**
 * Markdown Generator stage (VFS_DESIGN.md §11.2): pure functions, one domain
 * type in, one markdown string out. Knows only markdown formatting — never
 * ids, never isReadonly, never the VirtualFile shape.
 */

const UNAVAILABLE_NOTE =
  '\n> Data unavailable this cycle — the previous sync attempt for this section failed. It will retry on the next refresh.\n';

export function generateReadmeMarkdown(profile: GitHubProfile, lastSyncedAt: string): string {
  return `# GitHub

Generated workspace content for [@${profile.login}](${profile.profileUrl}), last synced ${lastSyncedAt}.

- [profile.md](./profile.md) — bio and account details
- [repositories.md](./repositories.md) — top repositories
- [pinned.md](./pinned.md) — pinned repositories
- [activity.md](./activity.md) — recent public activity
- [contributions.md](./contributions.md) — contribution summary

This folder is generated and read-only. It refreshes automatically and cannot be edited from the workspace.
`;
}

export function generateProfileMarkdown(profile: GitHubProfile): string {
  const lines = [
    `# ${profile.displayName}`,
    '',
    profile.bio ?? '_No bio set._',
    '',
    `- GitHub: [@${profile.login}](${profile.profileUrl})`,
  ];
  if (profile.company) lines.push(`- Company: ${profile.company}`);
  if (profile.location) lines.push(`- Location: ${profile.location}`);
  if (profile.blog) lines.push(`- Website: ${profile.blog}`);
  lines.push(
    `- Followers: ${profile.followers} · Following: ${profile.following}`,
    `- Public repos: ${profile.publicRepos}`,
    `- Member since: ${profile.memberSince.slice(0, 10)}`,
  );
  return lines.join('\n') + '\n';
}

export function generateRepositoriesMarkdown(repos: readonly GitHubRepoSummary[]): string {
  if (repos.length === 0) {
    return '# Repositories\n\nNo public repositories found.\n';
  }
  const rows = repos.map(
    (repo) =>
      `| [${repo.name}](${repo.url}) | ${repo.description ?? ''} | ${repo.language ?? ''} | ${repo.stars} | ${repo.forks} |`,
  );
  return [
    '# Repositories',
    '',
    `Top ${repos.length} public repositories by stars, then recency.`,
    '',
    '| Name | Description | Language | Stars | Forks |',
    '|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

export function generatePinnedMarkdown(pinned: readonly GitHubPinnedRepoSummary[]): string {
  if (pinned.length === 0) {
    return '# Pinned Repositories\n\nNo pinned repositories.\n';
  }
  const rows = pinned.map(
    (repo) => `| [${repo.name}](${repo.url}) | ${repo.description ?? ''} | ${repo.language ?? ''} | ${repo.stars} |`,
  );
  return ['# Pinned Repositories', '', '| Name | Description | Language | Stars |', '|---|---|---|---|', ...rows, ''].join(
    '\n',
  );
}

export function generatePinnedUnavailableMarkdown(): string {
  return (
    '# Pinned Repositories\n' +
    '\n> Pinned repositories require the GitHub GraphQL API, which needs a configured GITHUB_TOKEN. ' +
    'Set GITHUB_TOKEN to enable this file.\n'
  );
}

export function generateActivityMarkdown(activity: readonly GitHubActivityEntry[]): string {
  if (activity.length === 0) {
    return '# Recent Activity\n\nNo recent public activity.\n';
  }
  const items = activity.map((entry) => `- ${entry.createdAt.slice(0, 10)} — ${entry.summary}`);
  return ['# Recent Activity', '', ...items, ''].join('\n');
}

export function generateContributionsMarkdown(summary: GitHubContributionSummary): string {
  return [
    '# Contributions',
    '',
    `> Approximated from public activity over the last ${summary.windowDays} days — not a true contribution calendar (GitHub's public REST API doesn't expose one).`,
    '',
    `- Active days: ${summary.activeDayCount} / ${summary.windowDays}`,
    `- Public events: ${summary.totalEventCount}`,
    `- Most active repository: ${summary.mostActiveRepo ?? 'n/a'}`,
    '',
  ].join('\n');
}

export function generateUnavailableMarkdown(title: string): string {
  return `# ${title}\n${UNAVAILABLE_NOTE}`;
}
