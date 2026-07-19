import type { ContentProvider } from './contentProvider';
import { logger } from '../utils/logger';

/**
 * The VFS's only awareness of generated-content sources: a set of registered
 * ContentProviders, keyed by namespace. Adding a future provider is
 * "construct it, call register()" — nothing else in this class, or anything
 * that depends on it, needs to change (VFS_DESIGN.md §11.6).
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, ContentProvider>();

  register(provider: ContentProvider): void {
    if (this.providers.has(provider.namespace)) {
      throw new Error(`A ContentProvider is already registered for namespace "${provider.namespace}"`);
    }
    this.providers.set(provider.namespace, provider);
  }

  get(namespace: string): ContentProvider | undefined {
    return this.providers.get(namespace);
  }

  getAll(): readonly ContentProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Runs every registered provider's refresh() once, concurrently. Fire-and-forget
   * from the caller's perspective (server/index.ts's startup refresh, §11.4) —
   * a provider never throws out of refresh(), so this never rejects; failures
   * surface only through that provider's own getStatus().
   */
  async refreshAll(): Promise<void> {
    await Promise.all(
      this.getAll().map(async (provider) => {
        try {
          await provider.refresh();
        } catch (err) {
          // Defensive only: refresh() is contracted to capture its own failures
          // in getStatus() and never throw. Logged, not rethrown, so one
          // misbehaving provider can never affect another's refresh.
          logger.error(`ContentProvider "${provider.namespace}" refresh() threw unexpectedly`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );
  }
}
