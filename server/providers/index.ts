import { repository } from '../composition.js';
import { config } from '../config/env.js';
import { GitHubApiClient } from './github/githubApiClient.js';
import { GitHubProvider } from './github/githubProvider.js';
import { ProviderRegistry } from './providerRegistry.js';

export * from './contentProvider.js';
export { ProviderRegistry } from './providerRegistry.js';

/**
 * Composition root for ContentProviders (VFS_DESIGN.md §11). Adding a future
 * provider (Blog, AI Notes, ...) means constructing it and calling
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
