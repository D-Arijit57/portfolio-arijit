import { useMemo } from 'react';
import type { VirtualFile } from '../../types';
import { loadGraphModel } from '../../graph/loader';
import { buildGraph } from '../../graph/builder/buildGraph';
import { RadialLayout } from '../../graph/layout/radialLayout';
import { KnowledgeGraphScene } from './KnowledgeGraphScene';

/**
 * Knowledge Graph Renderer — Milestone 4: the first production renderer,
 * replacing Milestone 1's flat category/node-count scaffolding. Runs the
 * full pipeline once per file content change and hands the result
 * straight to the scene:
 *
 *   loadGraphModel -> buildGraph -> RadialLayout.layout -> KnowledgeGraphScene
 *
 * This component is the ONLY place that pipeline is wired together —
 * KnowledgeGraphScene and everything under it consumes `PositionedGraph`
 * alone and has no import from `graph/builder` or `graph/layout`'s
 * concrete strategy, so swapping `RadialLayout` for a future
 * `LayoutStrategy` only ever touches this one line.
 */
export function KnowledgeGraphViewer({ file }: { file: VirtualFile }) {
  const positioned = useMemo(() => {
    const model = loadGraphModel(file.content);
    if (!model || model.categories.length === 0) return undefined;
    const built = buildGraph(model);
    return RadialLayout.layout(built);
  }, [file.content]);

  if (!positioned || positioned.nodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1e1e1e] text-sm font-mono text-[#6b6b6b]">
        No graph data to display.
      </div>
    );
  }

  return <KnowledgeGraphScene positioned={positioned} />;
}
