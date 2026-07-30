import { useMemo } from 'react';
import type { VirtualFile } from '../../types';
import { loadGraphModel } from '../../graph/loader';

/**
 * Knowledge Graph Renderer — Milestone 1 scaffolding only. Proves the
 * pipeline (file -> registry -> this component -> Loader -> GraphModel)
 * renders something real, without building Graph Builder, Layout Engine,
 * Physics, or the actual node/edge visualization yet — those are later
 * milestones, deliberately not started here.
 *
 * This view is intentionally plain: a flat list of categories and node
 * names with counts, no positions, no SVG, no interaction. It gets
 * replaced by KnowledgeGraphScene once Milestone 3/4 land; nothing here
 * is meant to survive as the shipped look.
 */
export function KnowledgeGraphViewer({ file }: { file: VirtualFile }) {
  const model = useMemo(() => loadGraphModel(file.content), [file.content]);

  if (!model || model.categories.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1e1e1e] text-sm font-mono text-[#858585]">
        No graph data to display.
      </div>
    );
  }

  const totalNodes = model.categories.reduce((sum, cat) => sum + cat.nodes.length, 0);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#1e1e1e]">
      <div className="border-b border-[#3c3c3c] bg-[#1e1e1e]/80 px-6 py-4">
        <div className="mb-1 flex items-center gap-2">
          <h1 className="text-[16px] font-semibold text-white">{model.title}</h1>
          <span className="rounded border border-[#3c3c3c] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#858585]">
            Milestone 1 &mdash; pipeline scaffolding
          </span>
        </div>
        <p className="max-w-2xl text-[12px] leading-relaxed text-[#9d9d9d]">{model.description}</p>
        <p className="mt-1 text-[11px] text-[#666]">
          {model.categories.length} categories &middot; {totalNodes} nodes &middot; parsed from real YAML, no layout/rendering yet
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {model.categories.map((category) => (
          <div key={category.key} className="rounded-lg border border-[#3c3c3c] bg-[#252526] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-white">{category.title}</h2>
              <span className="text-[11px] text-[#858585]">{category.nodes.length}</span>
            </div>
            <ul className="space-y-1">
              {category.nodes.map((node) => (
                <li key={node.id} className="flex items-center gap-1.5 text-[12px] text-[#cccccc]">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-[#569cd6]" />
                  <span className="truncate">{node.name}</span>
                  {node.isCore && <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wide text-[#858585]">core</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
