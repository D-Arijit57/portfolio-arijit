import type { ArchitectureModel } from './types';

/**
 * The Architecture Registry (ARCHITECTURE_PLATFORM_DESIGN.md §5) — the only
 * mechanism renderers use to resolve "which project's architecture is this."
 * Module-level, not store state: same category as the terminal command
 * registry and the search index cache — derived/config data, not session
 * data.
 */
const models = new Map<string, ArchitectureModel>();

export function registerArchitecture(model: ArchitectureModel): void {
  models.set(model.projectKey, model);
}

export function getArchitectureModel(projectKey: string): ArchitectureModel | undefined {
  return models.get(projectKey);
}

export function projectKeyFromPath(path: string): string | undefined {
  const match = /^\/projects\/([^/]+)\//.exec(path);
  return match ? match[1].toLowerCase() : undefined;
}
