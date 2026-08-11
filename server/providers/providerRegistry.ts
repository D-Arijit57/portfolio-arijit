import type { ContentProvider } from './contentProvider.js';
import { logger } from '../utils/logger.js';

/**
 * The VFS's only awareness of generated-content sources: a set of registered
 * ContentProviders, keyed by namespace. Adding a future provider is
 * "construct it, call register()" — nothing else in this class, or anything
 * that depends on it, needs to change (VFS_DESIGN.md §11.6).
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, ContentProvider>();
  private initialRefresh: Promise<void> | undefined;

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

  /**
   * Memoized refreshAll(): the first caller triggers it, every caller
   * (concurrent or later) awaits that same run. Exists so a serverless
   * request handler can await "at least one refresh cycle has completed"
   * without caring whether it's the one that kicked it off (module-scope
   * startup call) or a later request piggybacking on the same in-flight
   * promise — Vercel's Node runtime is free to freeze an instance the
   * moment a response is sent, cancelling any promise that isn't part of
   * what the response actually waited on, so a fire-and-forget refreshAll()
   * that a request never awaits is not guaranteed to run to completion.
   * Does not replace the interval-driven refreshAll() calls used to keep
   * content current after the first cycle — those intentionally start a
   * fresh run every time.
   */
  refreshAllOnce(): Promise<void> {
    if (!this.initialRefresh) {
      this.initialRefresh = this.refreshAll();
    }
    return this.initialRefresh;
  }
}
