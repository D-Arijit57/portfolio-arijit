import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ManifestModel } from '../../manifest/types';
import { buildConstellationGraph } from '../../manifest/constellationGraph';
import { resolveConstellationLayout } from '../../manifest/constellationLayout';
import { buildConstellationRevealOrder } from '../../manifest/constellationReveal';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { ConstellationScene } from './ConstellationScene';

/**
 * The Tech Stack Constellation — constellation.explore's renderer.
 * Independent of src/architecture/'s Architecture Canvas by design.
 *
 * This file is intentionally thin: it's the data-wiring step of the
 * pipeline —
 *
 *   constellation.explore -> parseManifest() -> ManifestModel
 *     -> buildConstellationGraph()        (src/manifest/constellationGraph.ts)
 *     -> resolveConstellationLayout()     (src/manifest/constellationLayout.ts)
 *     -> buildConstellationRevealOrder()  (src/manifest/constellationReveal.ts)
 *     -> <ConstellationScene>             (viewport, animation, interaction,
 *                                          and all SVG rendering)
 *
 * Nothing here is Cortexa-specific — a different project's manifest
 * produces a different constellation with zero changes to this file or
 * ConstellationScene. Rakshachakra's own visual identity (a crystal-lattice
 * topology, per-technology colors) lives entirely in its own
 * constellation.explore data (hand-authored position/connectsTo/color, see
 * workspaceSeed.ts) and one small optional `color` field on
 * ManifestTechnology (constellationGraph.ts) — never a per-project branch
 * here.
 */
export function ManifestConstellation({ model, fileId }: { model: ManifestModel; fileId: string }) {
  const graph = useMemo(() => buildConstellationGraph(model), [model]);
  const layout = useMemo(() => resolveConstellationLayout(graph), [graph]);
  const revealOrder = useMemo(() => buildConstellationRevealOrder(graph), [graph]);
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

  return (
    <div className="flex h-full w-full flex-col bg-[#020304]">
      <div className="flex items-start justify-between gap-4 border-b border-[#3c3c3c] bg-[#1e1e1e]/80 px-6 py-4 backdrop-blur-sm">
        <div className="min-w-0">
          {/* Was text-[16px] in the default (sans) font — the one heading in
              this file's own chrome bar not set in Geist Mono, so it read as
              a landing-page headline dropped into a VS Code panel instead of
              a workspace label. font-mono + 13px brings it in line with
              every other file-header title in the app (e.g.
              InspectorPanel.tsx's own `text-[13px] font-semibold text-white`
              file-detail heading) — same weight and color, just the
              workspace's own typeface and scale instead of the page body's. */}
          <h1 className="flex items-baseline gap-1.5 font-mono text-[13px] font-semibold text-white">
            <span className="text-[#569cd6]">#</span> Tech Stack Constellation
          </h1>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[#9d9d9d]">
            {graph.description || `An interactive visualization of the technologies used in ${graph.project}.`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[12px]">
          <span className="text-[#858585]">Projects</span>
          <div className="flex items-center gap-1.5 rounded border border-[#3c3c3c] bg-[#252526] px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#007acc]" />
            <span className="text-white">{graph.project}</span>
            <ChevronDown size={12} className="text-[#858585]" />
          </div>
        </div>
      </div>

      <ConstellationScene fileId={fileId} graph={graph} layout={layout} revealOrder={revealOrder} reduceMotion={reduceMotion} />
    </div>
  );
}
