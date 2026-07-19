import type {
  LeetCodeActivitySummary,
  LeetCodeContestSummary,
  LeetCodeProfile,
  LeetCodeSolvedStats,
  LeetCodeSubmissionEntry,
} from './leetcodeTypes';

/**
 * Markdown Generator stage (VFS_DESIGN.md §11.2): pure functions, one domain
 * type in, one markdown string out. Knows only markdown formatting — never
 * ids, never isReadonly, never the VirtualFile shape.
 */

const UNAVAILABLE_NOTE =
  '\n> Data unavailable this cycle — the previous sync attempt for this section failed. It will retry on the next refresh.\n';

export function generateReadmeMarkdown(profile: LeetCodeProfile, lastSyncedAt: string): string {
  return `# LeetCode

Generated workspace content for [@${profile.username}](${profile.profileUrl}), last synced ${lastSyncedAt}.

- [profile.md](./profile.md) — bio and account details
- [stats.md](./stats.md) — solved-problem breakdown
- [recent.md](./recent.md) — recent accepted submissions
- [contests.md](./contests.md) — contest rating and history
- [activity.md](./activity.md) — submission streak and activity

This folder is generated and read-only. It refreshes automatically and cannot be edited from the workspace.
`;
}

export function generateProfileMarkdown(profile: LeetCodeProfile): string {
  const lines = [`# ${profile.displayName}`, '', profile.aboutMe || '_No bio set._', '', `- LeetCode: [@${profile.username}](${profile.profileUrl})`];
  if (profile.ranking !== null) lines.push(`- Ranking: ${profile.ranking.toLocaleString()}`);
  if (profile.company) lines.push(`- Company: ${profile.company}`);
  if (profile.school) lines.push(`- School: ${profile.school}`);
  if (profile.countryName) lines.push(`- Country: ${profile.countryName}`);
  return lines.join('\n') + '\n';
}

export function generateStatsMarkdown(stats: LeetCodeSolvedStats): string {
  const acceptance = stats.acceptanceRate !== null ? `${stats.acceptanceRate.toFixed(1)}%` : 'n/a';
  return [
    '# Stats',
    '',
    '| Difficulty | Solved |',
    '|---|---|',
    `| Easy | ${stats.easySolved} |`,
    `| Medium | ${stats.mediumSolved} |`,
    `| Hard | ${stats.hardSolved} |`,
    `| **Total** | **${stats.totalSolved}** |`,
    '',
    `- Total submissions: ${stats.totalSubmissions}`,
    `- Acceptance rate: ${acceptance}`,
    '',
  ].join('\n');
}

export function generateRecentMarkdown(submissions: readonly LeetCodeSubmissionEntry[]): string {
  if (submissions.length === 0) {
    return '# Recent Submissions\n\nNo recent accepted submissions found.\n';
  }
  const rows = submissions.map(
    (entry) => `| ${entry.title} | ${entry.status} | ${entry.language} | ${entry.submittedAt.slice(0, 10)} |`,
  );
  return [
    '# Recent Submissions',
    '',
    `Most recent ${submissions.length} accepted submissions.`,
    '',
    '| Title | Status | Language | Date |',
    '|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

export function generateContestsMarkdown(summary: LeetCodeContestSummary): string {
  if (summary.attendedCount === 0) {
    return '# Contests\n\nNo contest history — this user has not entered a rated contest yet.\n';
  }

  const lines = [
    '# Contests',
    '',
    `- Contests attended: ${summary.attendedCount}`,
    `- Rating: ${summary.rating ?? 'n/a'}`,
    `- Global ranking: ${summary.globalRanking ?? 'n/a'}`,
  ];
  if (summary.topPercentage !== null) {
    lines.push(`- Top: ${summary.topPercentage.toFixed(2)}%`);
  }
  lines.push('');

  if (summary.recentContests.length > 0) {
    lines.push(
      `Most recent ${summary.recentContests.length} attended contests.`,
      '',
      '| Contest | Ranking | Rating | Date |',
      '|---|---|---|---|',
      ...summary.recentContests.map(
        (entry) => `| ${entry.title} | ${entry.ranking} | ${entry.rating} | ${entry.startedAt.slice(0, 10)} |`,
      ),
      '',
    );
  }

  return lines.join('\n');
}

export function generateActivityMarkdown(summary: LeetCodeActivitySummary): string {
  return [
    '# Activity',
    '',
    `- Current streak: ${summary.currentStreak} day(s)`,
    `- Total active days: ${summary.totalActiveDays}`,
    `- Active days in the last ${summary.windowDays} days: ${summary.activeDaysInWindow}`,
    '',
  ].join('\n');
}

export function generateUnavailableMarkdown(title: string): string {
  return `# ${title}\n${UNAVAILABLE_NOTE}`;
}
