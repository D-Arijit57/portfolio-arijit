/**
 * Domain model for the Architecture Platform (ARCHITECTURE_PLATFORM_DESIGN.md §3).
 * The canonical representation of a project's architecture — renderers
 * (Mermaid, Canvas, and future views) consume this, never the other way
 * around.
 */

export type ArchitectureCategory =
  | 'client'
  | 'frontend'
  | 'gateway'
  | 'backend'
  | 'ai'
  | 'auth'
  | 'queue'
  | 'database'
  | 'infrastructure'
  | 'storage'
  | 'messaging'
  | 'external';

export type NodeStatus = 'active' | 'planned' | 'deprecated';

export interface ArchitectureNode {
  id: string;
  title: string;
  category: ArchitectureCategory;
  technology?: string;
  description?: string;
  responsibilities?: string[];
  dependencies?: string[];
  status?: NodeStatus;
  icon?: string;
  documentation?: string;
  runtime?: string;
  deployment?: string;
  tradeoffs?: string;
}

export type ArchitectureEdgeKind = 'sync' | 'async' | 'data';

export interface ArchitectureEdge {
  from: string;
  to: string;
  label?: string;
  kind?: ArchitectureEdgeKind;
}

export interface ArchitectureModel {
  projectKey: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}
