import type { ArchitectureModel } from '../../architecture/types';

/**
 * Deterministic layered layout for the Architecture Canvas (Phase 2). Pure
 * function: model in, pixel positions out — no React, no randomness, no
 * per-project special-casing. A node's layer is its longest-path distance
 * from a root (a node with no incoming edges), which mirrors the top-down
 * flow `graph TD` already reads visually. Deliberately not a
 * crossing-minimizing/force-directed layout — that's more than Phase 2's
 * "readable, no overlaps, generic" bar requires.
 */

export interface NodePosition {
  x: number;
  y: number;
}

export interface LayoutResult {
  positions: Map<string, NodePosition>;
  width: number;
  height: number;
}

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 60;
const LAYER_GAP = 100;
const NODE_GAP = 48;

function assignLayers(model: ArchitectureModel): Map<string, number> {
  const incoming = new Map<string, string[]>(model.nodes.map((node) => [node.id, []]));
  for (const edge of model.edges) {
    incoming.get(edge.to)?.push(edge.from);
  }

  const layers = new Map<string, number>();
  const resolving = new Set<string>();

  function resolve(id: string): number {
    const cached = layers.get(id);
    if (cached !== undefined) return cached;
    if (resolving.has(id)) return 0; // cycle guard: treat as a root rather than recurse forever
    resolving.add(id);
    const parents = incoming.get(id) ?? [];
    const layer = parents.length === 0 ? 0 : Math.max(...parents.map(resolve)) + 1;
    resolving.delete(id);
    layers.set(id, layer);
    return layer;
  }

  for (const node of model.nodes) resolve(node.id);
  return layers;
}

export function layoutModel(model: ArchitectureModel): LayoutResult {
  const layerById = assignLayers(model);

  const nodesByLayer = new Map<number, string[]>();
  for (const node of model.nodes) {
    const layer = layerById.get(node.id) ?? 0;
    const ids = nodesByLayer.get(layer) ?? [];
    ids.push(node.id);
    nodesByLayer.set(layer, ids);
  }

  const layerCount = nodesByLayer.size === 0 ? 0 : Math.max(...nodesByLayer.keys()) + 1;
  const rowWidths = [...nodesByLayer.values()].map(
    (ids) => ids.length * NODE_WIDTH + (ids.length - 1) * NODE_GAP,
  );
  const maxRowWidth = rowWidths.length === 0 ? 0 : Math.max(...rowWidths);

  const positions = new Map<string, NodePosition>();
  for (const [layer, ids] of nodesByLayer) {
    const rowWidth = ids.length * NODE_WIDTH + (ids.length - 1) * NODE_GAP;
    const startX = (maxRowWidth - rowWidth) / 2;
    ids.forEach((id, index) => {
      positions.set(id, {
        x: startX + index * (NODE_WIDTH + NODE_GAP),
        y: layer * (NODE_HEIGHT + LAYER_GAP),
      });
    });
  }

  return {
    positions,
    width: maxRowWidth,
    height: layerCount === 0 ? 0 : layerCount * NODE_HEIGHT + (layerCount - 1) * LAYER_GAP,
  };
}
