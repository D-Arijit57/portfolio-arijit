import type { ContentProvider, ProviderStatus } from '../contentProvider';
import type { FileNodeRepository } from '../../repositories';
import { GitHubApiClient } from './githubApiClient';
import {
  transformActivity,
  transformCommits,
  transformContributionCalendar,
  transformPinned,
  transformProfile,
  transformRepos,
} from './githubTransformer';
import {
  generateActivityMarkdown,
  generateContributionsMarkdown,
  generateContributionsUnavailableMarkdown,
  generatePinnedMarkdown,
  generatePinnedUnavailableMarkdown,
  generateProfileMarkdown,
  generateReadmeMarkdown,
  generateRepositoriesMarkdown,
  generateUnavailableMarkdown,
} from './githubMarkdownGenerator';
import { generateGitHubVirtualFiles, type GitHubMarkdownBundle } from './githubVirtualFileGenerator';
import { logger } from '../../utils/logger';

/**
 * First concrete ContentProvider implementation (VFS_DESIGN.md §11.5).
 * Orchestrates the four-stage pipeline (§11.2) and is the only component that
 * calls FileNodeRepository.reconcileGeneratedSubtree for the "github"
 * namespace. Everything GitHub-specific lives inside this module and its
 * sibling files under server/providers/github/ — nothing above the
 * ContentProvider interface knows GitHub exists.
 */
export class GitHubProvider implements ContentProvider {
  readonly namespace = 'github';

  private status: ProviderStatus = { state: 'idle' };

  constructor(
    private readonly repository: FileNodeRepository,
    private readonly apiClient: GitHubApiClient,
    private readonly username: string | undefined,
    private readonly hasToken: boolean,
  ) {}

  getStatus(): ProviderStatus {
    return this.status;
  }

  async refresh(): Promise<void> {
    if (!this.username) {
      this.status = {
        state: 'error',
        lastSyncedAt: this.status.lastSyncedAt,
        lastError: 'GITHUB_USERNAME is not configured',
      };
      return;
    }

    this.status = { state: 'syncing', lastSyncedAt: this.status.lastSyncedAt };

    // profile.md is the one required file — its failure aborts the whole
    // cycle and leaves the namespace's last reconciled state untouched
    // (VFS_DESIGN.md §11.5 "Partial failures").
    let profile;
    try {
      profile = transformProfile(await this.apiClient.getUser());
    } catch (err) {
      this.recordFailure(err, 'fetching GitHub profile');
      return;
    }

    const [repos, pinned, events, contributionCalendar, commits] = await Promise.all([
      this.safely(() => this.apiClient.listRepos()),
      this.hasToken ? this.safely(() => this.apiClient.listPinnedRepos()) : Promise.resolve(undefined),
      this.safely(() => this.apiClient.listPublicEvents()),
      this.hasToken ? this.safely(() => this.apiClient.getContributionCalendar()) : Promise.resolve(undefined),
      this.hasToken ? this.safely(() => this.apiClient.searchRecentCommits()) : Promise.resolve(undefined),
    ]);

    // Real commit history (sha + message) is preferred over the Events-API
    // fallback (repo-level prose, no per-commit detail) whenever the Search
    // API succeeded and actually returned something; an empty/failed search
    // still degrades to the Events-derived summary rather than "unavailable"
    // outright, since that's real (if less detailed) data too.
    const activityEntries = commits && commits.length > 0 ? transformCommits(commits) : events ? transformActivity(events) : undefined;

    const lastSyncedAt = new Date().toISOString();
    const markdown: GitHubMarkdownBundle = {
      readme: generateReadmeMarkdown(profile, lastSyncedAt),
      profile: generateProfileMarkdown(profile),
      repositories: repos ? generateRepositoriesMarkdown(transformRepos(repos)) : generateUnavailableMarkdown('Repositories'),
      pinned: pinned
        ? generatePinnedMarkdown(transformPinned(pinned))
        : this.hasToken
          ? generateUnavailableMarkdown('Pinned Repositories')
          : generatePinnedUnavailableMarkdown(),
      activity: activityEntries ? generateActivityMarkdown(activityEntries) : generateUnavailableMarkdown('Recent Activity'),
      contributions: contributionCalendar
        ? generateContributionsMarkdown(transformContributionCalendar(contributionCalendar))
        : this.hasToken
          ? generateUnavailableMarkdown('Contributions')
          : generateContributionsUnavailableMarkdown(),
    };

    try {
      const nodes = generateGitHubVirtualFiles(markdown);
      await this.repository.reconcileGeneratedSubtree(this.namespace, nodes);
    } catch (err) {
      this.recordFailure(err, 'reconciling GitHub content into the workspace tree');
      return;
    }

    this.status = { state: 'idle', lastSyncedAt };
    logger.info('GitHubProvider refresh succeeded', { username: this.username, lastSyncedAt });
  }

  /** Best-effort stage: failure degrades that one file rather than aborting the cycle (§11.5). */
  private async safely<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch (err) {
      logger.warn('GitHubProvider best-effort fetch failed; that section will report as unavailable this cycle', {
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
    logger.error('GitHubProvider refresh failed; namespace retains its last-known-good content', {
      username: this.username,
      error: message,
    });
  }
}
