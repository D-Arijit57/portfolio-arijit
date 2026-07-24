import type { ArchitectureModel } from './types';

/**
 * Derived graph relationships (ARCHITECTURE_PLATFORM_DESIGN.md §7 area,
 * Phase 3). Pure functions: given a model and an "active" node id, compute
 * which nodes/edges are connected to it. Nothing here is cached or stored —
 * relationships are recomputed from model.edges on every call, so the model
 * never duplicates this information and stays purely declarative.
 */

export interface NodeRelationships {
  activeNodeId: string | null;
  connectedNodeIds: ReadonlySet<string>;
  connectedEdgeKeys: ReadonlySet<string>;
}

const EMPTY_RELATIONSHIPS: NodeRelationships = {
  activeNodeId: null,
  connectedNodeIds: new Set(),
  connectedEdgeKeys: new Set(),
};

export function edgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

export function getNodeRelationships(
  model: ArchitectureModel,
  nodeId: string | null,
): NodeRelationships {
  if (!nodeId) return EMPTY_RELATIONSHIPS;

  const connectedNodeIds = new Set<string>();
  const connectedEdgeKeys = new Set<string>();

  for (const edge of model.edges) {
    if (edge.from === nodeId) {
      connectedNodeIds.add(edge.to);
      connectedEdgeKeys.add(edgeKey(edge.from, edge.to));
    } else if (edge.to === nodeId) {
      connectedNodeIds.add(edge.from);
      connectedEdgeKeys.add(edgeKey(edge.from, edge.to));
    }
  }

  return { activeNodeId: nodeId, connectedNodeIds, connectedEdgeKeys };
}

export type NodeVisualState = 'active' | 'connected' | 'dimmed' | 'default';

export function visualStateForNode(nodeId: string, relationships: NodeRelationships): NodeVisualState {
  if (!relationships.activeNodeId) return 'default';
  if (nodeId === relationships.activeNodeId) return 'active';
  return relationships.connectedNodeIds.has(nodeId) ? 'connected' : 'dimmed';
}

export function visualStateForEdge(
  from: string,
  to: string,
  relationships: NodeRelationships,
): NodeVisualState {
  if (!relationships.activeNodeId) return 'default';
  return relationships.connectedEdgeKeys.has(edgeKey(from, to)) ? 'connected' : 'dimmed';
}
