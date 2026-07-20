import type {
  GitHubActivityEntry,
  GitHubContributionCalendar,
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
  // Human-readable list stays the file's primary content (this file is a
  // normal, readable workspace file like any other); the fenced JSON block
  // is an additive, structured mirror of the same data for the frontend's
  // reusable Recent Activity widget (EditorRenderer's markdown `code`
  // override) to parse — no second API call, no separate endpoint.
  const json = JSON.stringify(activity.slice(0, 8));
  return ['# Recent Activity', '', ...items, '', '```github-recent-activity', json, '```', ''].join('\n');
}

export function generateContributionsMarkdown(calendar: GitHubContributionCalendar): string {
  const json = JSON.stringify(calendar);
  return [
    '# Contributions',
    '',
    `${calendar.totalContributions} contributions in the last year.`,
    '',
    '```github-contribution-calendar',
    json,
    '```',
    '',
  ].join('\n');
}

export function generateContributionsUnavailableMarkdown(): string {
  return (
    '# Contributions\n' +
    '\n> The real contribution calendar requires the GitHub GraphQL API, which needs a configured GITHUB_TOKEN. ' +
    'Set GITHUB_TOKEN to enable this file.\n'
  );
}

export function generateUnavailableMarkdown(title: string): string {
  return `# ${title}\n${UNAVAILABLE_NOTE}`;
}
