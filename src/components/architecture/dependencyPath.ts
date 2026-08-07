import type { ArchitectureEdge, ArchitectureModel } from '../../architecture/types';

/**
 * Architecture Canvas 2.0 — full transitive dependency-path highlighting,
 * replacing the 1-hop-only src/architecture/relationships.ts for this
 * canvas specifically (kept canvas-local per this sprint's scope: nothing
 * under src/architecture/* is touched). Returns the exact same shape as
 * that module's NodeRelationships/visualStateFor* so ArchitectureCanvas.tsx
 * needed zero structural changes to its render tree — only the import and
 * the dimmed-opacity constants changed.
 *
 * buildPathState() is the shared low-level helper: also reused by
 * traceWorkflows.ts's useTraceStepper, so "hover path" and "trace path"
 * are the same highlighting mechanism, one driven by the mouse, the other
 * by a timer.
 */

export interface PathState {
  activeNodeId: string | null;
  connectedNodeIds: ReadonlySet<string>;
  connectedEdgeKeys: ReadonlySet<string>;
}

const EMPTY_PATH_STATE: PathState = {
  activeNodeId: null,
  connectedNodeIds: new Set(),
  connectedEdgeKeys: new Set(),
};

export function edgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

/**
 * Turns a set of "visited" node ids into a PathState by re-walking the edge
 * list and marking any edge whose *both* endpoints were visited in the same
 * traversal direction that discovered them — callers that already know the
 * traversal (getFullDependencyPath below) pass edges in directly via the
 * `markEdge` callback instead of this post-hoc form; this standalone
 * version is for traceWorkflows.ts, which already has an explicit ordered
 * node sequence rather than a graph walk to hook into.
 */
export function buildPathState(orderedNodeIds: string[], edges: ArchitectureEdge[], activeNodeId: string | null): PathState {
  if (orderedNodeIds.length === 0) return EMPTY_PATH_STATE;

  const connectedNodeIds = new Set(orderedNodeIds);
  const connectedEdgeKeys = new Set<string>();

  for (let i = 0; i < orderedNodeIds.length - 1; i++) {
    const from = orderedNodeIds[i];
    const to = orderedNodeIds[i + 1];
    const edgeExists = edges.some((e) => e.from === from && e.to === to);
    if (edgeExists) connectedEdgeKeys.add(edgeKey(from, to));
  }

  return { activeNodeId, connectedNodeIds, connectedEdgeKeys };
}

/**
 * Full transitive path from `nodeId`: every ancestor (walking predecessors
 * backward to the roots) and every descendant (walking successors forward
 * to the leaves), with edges marked *during* the walk — not by a post-hoc
 * "are both endpoints in the combined set" check, which is only
 * accidentally correct on a graph with no shortcut edges bypassing the
 * active node. No memoization: recomputed fresh on every call, matching
 * relationships.ts's own philosophy, and cheap at this graph's size (15
 * nodes / 16 edges).
 */
export function getFullDependencyPath(model: ArchitectureModel, nodeId: string | null): PathState {
  if (!nodeId) return EMPTY_PATH_STATE;

  const predecessorsByNode = new Map<string, string[]>();
  const successorsByNode = new Map<string, string[]>();
  for (const edge of model.edges) {
    if (!successorsByNode.has(edge.from)) successorsByNode.set(edge.from, []);
    successorsByNode.get(edge.from)!.push(edge.to);
    if (!predecessorsByNode.has(edge.to)) predecessorsByNode.set(edge.to, []);
    predecessorsByNode.get(edge.to)!.push(edge.from);
  }

  const connectedNodeIds = new Set<string>();
  const connectedEdgeKeys = new Set<string>();

  function walk(startId: string, neighborsByNode: Map<string, string[]>, direction: 'backward' | 'forward') {
    const queue = [startId];
    const visited = new Set<string>([startId]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = neighborsByNode.get(current) ?? [];
      for (const neighbor of neighbors) {
        connectedNodeIds.add(neighbor);
        connectedEdgeKeys.add(direction === 'backward' ? edgeKey(neighbor, current) : edgeKey(current, neighbor));
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  walk(nodeId, predecessorsByNode, 'backward');
  walk(nodeId, successorsByNode, 'forward');

  return { activeNodeId: nodeId, connectedNodeIds, connectedEdgeKeys };
}

/**
 * Direct (1-hop) neighbors of `nodeId` only — every node with an edge
 * immediately into or out of it, and those edges themselves. Cortexa
 * Redesign Phase 6: hover uses this instead of getFullDependencyPath's full
 * transitive walk above — "what does this service communicate with?", not
 * "everything upstream/downstream of it" — while click/select keeps the
 * full-path behavior unchanged, so the two interactions stay deliberately
 * different in scope (hover for a quick, local answer; click for the
 * complete picture in NodeDetailPopover).
 */
export function getDirectConnections(model: ArchitectureModel, nodeId: string | null): PathState {
  if (!nodeId) return EMPTY_PATH_STATE;

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

export function visualStateForNode(nodeId: string, path: PathState): NodeVisualState {
  if (!path.activeNodeId) return 'default';
  if (nodeId === path.activeNodeId) return 'active';
  return path.connectedNodeIds.has(nodeId) ? 'connected' : 'dimmed';
}

export function visualStateForEdge(from: string, to: string, path: PathState): NodeVisualState {
  if (!path.activeNodeId) return 'default';
  return path.connectedEdgeKeys.has(edgeKey(from, to)) ? 'connected' : 'dimmed';
}
