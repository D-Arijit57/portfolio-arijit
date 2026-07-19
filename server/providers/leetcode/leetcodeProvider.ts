import type { ContentProvider, ProviderStatus } from '../contentProvider';
import type { FileNodeRepository } from '../../repositories';
import { LeetCodeApiClient } from './leetcodeApiClient';
import {
  transformActivity,
  transformContest,
  transformProfile,
  transformRecentSubmissions,
  transformSolvedStats,
} from './leetcodeTransformer';
import {
  generateActivityMarkdown,
  generateContestsMarkdown,
  generateProfileMarkdown,
  generateReadmeMarkdown,
  generateRecentMarkdown,
  generateStatsMarkdown,
  generateUnavailableMarkdown,
} from './leetcodeMarkdownGenerator';
import { generateLeetCodeVirtualFiles, type LeetCodeMarkdownBundle } from './leetcodeVirtualFileGenerator';
import { logger } from '../../utils/logger';

/**
 * Second concrete ContentProvider implementation, validating
 * ARCHITECTURE.md "LeetCode Provider" §1's claim that the ContentProvider
 * contract generalizes without changes. Orchestrates the same four-stage
 * pipeline (VFS_DESIGN.md §11.2) GitHubProvider uses and is the only
 * component that calls FileNodeRepository.reconcileGeneratedSubtree for the
 * "leetcode" namespace. Everything LeetCode-specific lives inside this
 * module and its sibling files under server/providers/leetcode/ — nothing
 * above the ContentProvider interface knows LeetCode exists.
 */
export class LeetCodeProvider implements ContentProvider {
  readonly namespace = 'leetcode';

  private status: ProviderStatus = { state: 'idle' };

  constructor(
    private readonly repository: FileNodeRepository,
    private readonly apiClient: LeetCodeApiClient,
    private readonly username: string | undefined,
  ) {}

  getStatus(): ProviderStatus {
    return this.status;
  }

  async refresh(): Promise<void> {
    if (!this.username) {
      this.status = {
        state: 'error',
        lastSyncedAt: this.status.lastSyncedAt,
        lastError: 'LEETCODE_USERNAME is not configured',
      };
      return;
    }

    this.status = { state: 'syncing', lastSyncedAt: this.status.lastSyncedAt };

    // profile.md/stats.md both derive from one required call — its failure
    // aborts the whole cycle and leaves the namespace's last reconciled
    // state untouched (mirrors GitHubProvider's profile.md handling,
    // VFS_DESIGN.md §11.5 "Partial failures").
    let matchedUser;
    try {
      matchedUser = await this.apiClient.getProfile();
    } catch (err) {
      this.recordFailure(err, 'fetching LeetCode profile');
      return;
    }

    const [recentSubmissions, contestInfo, calendar] = await Promise.all([
      this.safely(() => this.apiClient.getRecentSubmissions()),
      this.safely(() => this.apiClient.getContestInfo()),
      this.safely(() => this.apiClient.getCalendar()),
    ]);

    const profile = transformProfile(matchedUser);
    const stats = transformSolvedStats(matchedUser);
    const lastSyncedAt = new Date().toISOString();

    const markdown: LeetCodeMarkdownBundle = {
      readme: generateReadmeMarkdown(profile, lastSyncedAt),
      profile: generateProfileMarkdown(profile),
      stats: generateStatsMarkdown(stats),
      recent: recentSubmissions
        ? generateRecentMarkdown(transformRecentSubmissions(recentSubmissions))
        : generateUnavailableMarkdown('Recent Submissions'),
      // Empty contest history is a valid result, not a fetch failure — only
      // an actual fetch error (contestInfo === undefined) renders the
      // "unavailable" note; transformContest itself already renders "no
      // contest history" for a genuinely empty-but-successful result.
      contests: contestInfo
        ? generateContestsMarkdown(transformContest(contestInfo.ranking, contestInfo.history))
        : generateUnavailableMarkdown('Contests'),
      activity: generateActivityMarkdown(transformActivity(calendar)),
    };

    try {
      const nodes = generateLeetCodeVirtualFiles(markdown);
      await this.repository.reconcileGeneratedSubtree(this.namespace, nodes);
    } catch (err) {
      this.recordFailure(err, 'reconciling LeetCode content into the workspace tree');
      return;
    }

    this.status = { state: 'idle', lastSyncedAt };
    logger.info('LeetCodeProvider refresh succeeded', { username: this.username, lastSyncedAt });
  }

  /** Best-effort stage: failure degrades that one file rather than aborting the cycle. */
  private async safely<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch (err) {
      logger.warn('LeetCodeProvider best-effort fetch failed; that section will report as unavailable this cycle', {
        error: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    }
  }

  private recordFailure(err: unknown, context: string): void {
    const message = err instanceof Error ? err.message : String(err);
    this.status = {
      state: 'error',
      lastSyncedAt: this.status.lastSyncedAt,
      lastError: `Failed while ${context}: ${message}`,
    };
    logger.error('LeetCodeProvider refresh failed; namespace retains its last-known-good content', {
      username: this.username,
      error: message,
    });
  }
}
