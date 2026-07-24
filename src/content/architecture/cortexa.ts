import { registerArchitecture } from '../../architecture/registry';
import type { ArchitectureModel } from '../../architecture/types';

/**
 * Cortexa's canonical ArchitectureModel — the first consumer of the
 * Architecture Platform (ARCHITECTURE_PLATFORM_DESIGN.md §13, Phase 1).
 * This is now the source of truth for Cortexa's architecture; the previous
 * hand-written architecture.mmd text is generated from this model
 * (modelToMermaid(), see workspaceSeed.ts), not the other way around.
 *
 * Registers itself on import — whatever imports this module (workspaceSeed.ts)
 * must run before the app's first render, the same "module load = registration"
 * ordering the terminal command registry and search index already rely on.
 */
export const cortexaArchitecture: ArchitectureModel = {
  projectKey: 'cortexa',
  nodes: [
    { id: 'client', title: 'Client', category: 'client' },
    { id: 'api_gateway', title: 'API Gateway', category: 'gateway' },
    { id: 'load_balancer', title: 'Load Balancer', category: 'infrastructure' },
    { id: 'auth_service', title: 'Auth Service', category: 'auth' },
    { id: 'cortexa_core', title: 'Cortexa Core', category: 'backend' },
    { id: 'postgres', title: 'PostgreSQL', category: 'database' },
    { id: 'redis_cache', title: 'Redis Cache', category: 'database' },
  ],
  edges: [
    { from: 'client', to: 'api_gateway', label: 'HTTP' },
    { from: 'api_gateway', to: 'load_balancer' },
    { from: 'load_balancer', to: 'auth_service', label: 'gRPC' },
    { from: 'load_balancer', to: 'cortexa_core', label: 'gRPC' },
    { from: 'cortexa_core', to: 'postgres' },
    { from: 'cortexa_core', to: 'redis_cache' },
  ],
};

registerArchitecture(cortexaArchitecture);
