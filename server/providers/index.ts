import { repository } from '../composition';
import { config } from '../config/env';
import { GitHubApiClient } from './github/githubApiClient';
import { GitHubProvider } from './github/githubProvider';
import { LeetCodeApiClient } from './leetcode/leetcodeApiClient';
import { LeetCodeProvider } from './leetcode/leetcodeProvider';
import { ProviderRegistry } from './providerRegistry';

export * from './contentProvider';
export { ProviderRegistry } from './providerRegistry';

/**
 * Composition root for ContentProviders (VFS_DESIGN.md §11). Adding a future
 * provider (LeetCode, Blog, ...) means constructing it and calling
 * providerRegistry.register() here — no other subsystem changes (§11.6).
 */
export const providerRegistry = new ProviderRegistry();

providerRegistry.register(
  new GitHubProvider(
    repository,
    new GitHubApiClient(config.githubUsername ?? '', config.githubToken),
    config.githubUsername,
    Boolean(config.githubToken),
  ),
);

providerRegistry.register(
  new LeetCodeProvider(repository, new LeetCodeApiClient(config.leetcodeUsername ?? ''), config.leetcodeUsername),
);
