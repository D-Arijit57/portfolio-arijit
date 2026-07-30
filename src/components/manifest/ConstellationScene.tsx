import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Maximize, RotateCcw, X, ChevronDown, Boxes } from 'lucide-react';
import type { ConstellationGraph, ConstellationNode } from '../../manifest/constellationGraph';
import type { ConstellationLayoutResult } from '../../manifest/constellationLayout';
import type { ConstellationRevealUnit } from '../../manifest/constellationReveal';
import { useFileRevealSequence } from '../../hooks/useFileRevealSequence';
import { useConstellationViewport } from '../../hooks/useConstellationViewport';
import { ConstellationBackdrop } from './ConstellationBackdrop';
import { ConstellationStar } from './ConstellationStar';
import { ConstellationEdge } from './ConstellationEdge';
import type { ConstellationVisualState } from './constellationVisualState';

/**
 * The Tech Stack Constellation's scene — everything downstream of "a
 * graph and a layout exist": viewport (pan/zoom/fit/focus), the reveal/
 * animation sequence, hover/select dependency-chain highlighting, and the
 * actual SVG composition (backdrop, edges, stars, legend/detail card).
 * Nothing here is Cortexa-specific — a different project's manifest
 * produces a different constellation with zero changes to this file.
 */

const DISSOLVE_DURATION_S = 0.6;

export interface ConstellationSceneProps {
  fileId: string;
  graph: ConstellationGraph;
  layout: ConstellationLayoutResult;
  revealOrder: ConstellationRevealUnit[];
  reduceMotion: boolean;
}

export function ConstellationScene({ fileId, graph, layout, revealOrder, reduceMotion }: ConstellationSceneProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    containerRef,
    svgRef,
    viewport,
    viewportTransition,
    fitToScreenManual,
    resetView,
    focusOnNode,
    resetInteraction,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useConstellationViewport(layout);

  const revealSequence = useFileRevealSequence({
    fileId: `${fileId}:${graph.project}`,
    unitCount: revealOrder.length,
    containerRef,
    enabled: revealOrder.length > 0,
  });

  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const parentById = useMemo(() => new Map(graph.edges.map((e) => [e.to, e.from])), [graph]);
  const childrenById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const edge of graph.edges) {
      const list = map.get(edge.from) ?? [];
      list.push(edge.to);
      map.set(edge.from, list);
    }
    return map;
  }, [graph]);

  const unitIndexByNodeId = useMemo(() => {
    const map = new Map<string, number>();
    revealOrder.forEach((unit, index) => {
      if (unit.type === 'node') map.set(unit.id, index);
    });
    return map;
  }, [revealOrder]);
  const unitIndexByEdgeKey = useMemo(() => {
    const map = new Map<string, number>();
    revealOrder.forEach((unit, index) => {
      if (unit.type === 'edge') map.set(unit.id, index);
    });
    return map;
  }, [revealOrder]);

  useEffect(() => {
    setSelectedId(null);
    setHoveredId(null);
    resetInteraction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') setSelectedId(null);
  };

  const activeId = hoveredId ?? selectedId;

  // "Highlight dependency chain": every ancestor up to the root (what this
  // node depends on) plus its full descendant subtree (what depends on
  // it) — the connected set on a tree, computed fresh per active id since
  // trees here are small (tens of nodes, not thousands).
  const highlightSet = useMemo(() => {
    if (!activeId) return null;
    const set = new Set<string>([activeId]);
    let cursor = parentById.get(activeId);
    while (cursor) {
      set.add(cursor);
      cursor = parentById.get(cursor);
    }
    const stack = [...(childrenById.get(activeId) ?? [])];
    while (stack.length > 0) {
      const id = stack.pop() as string;
      if (set.has(id)) continue;
      set.add(id);
      stack.push(...(childrenById.get(id) ?? []));
    }
    return set;
  }, [activeId, parentById, childrenById]);

  const stateForId = (id: string): ConstellationVisualState => {
    if (!activeId || !highlightSet) return 'default';
    if (id === activeId) return 'active';
    return highlightSet.has(id) ? 'connected' : 'dimmed';
  };

  const stateForEdge = (from: string, to: string): ConstellationVisualState => {
    if (!activeId || !highlightSet) return 'default';
    if (from === activeId || to === activeId) return 'active';
    return highlightSet.has(from) && highlightSet.has(to) ? 'connected' : 'dimmed';
  };

  const selectedNode = selectedId ? nodeById.get(selectedId) : undefined;

  if (graph.nodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm font-mono text-[#858585]">
        No technologies to display.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden" tabIndex={-1} onKeyDown={handleKeyDown}>
      <svg
        ref={svgRef}
        className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp(e, () => setSelectedId(null))}
        onPointerLeave={(e) => handlePointerUp(e, () => setSelectedId(null))}
      >
        <defs>
          <style>
            {`
              @keyframes constellation-heartbeat { 0%, 100% { opacity: 0; transform: scale(0.94); } 50% { opacity: 0.5; transform: scale(1.06); } }
              @keyframes constellation-twinkle { 0%, 76%, 100% { opacity: 0.15; transform: scale(0.88); } 88% { opacity: 1; transform: scale(1.08); } }
              @keyframes constellation-glow-breathe { 0%, 100% { opacity: 0.28; transform: scale(0.95); } 50% { opacity: 0.5; transform: scale(1.05); } }
            `}
          </style>
          <radialGradient id="constellation-space-bg" cx="50%" cy="34%" r="80%">
            <stop offset="0%" stopColor="#0a0f16" />
            <stop offset="60%" stopColor="#050708" />
            <stop offset="100%" stopColor="#010102" />
          </radialGradient>
          {/* One radial "star" gradient per category color — bright
              near-white core fading through the category's own hue into
              full transparency. ConstellationStar's layered halo/bloom
              circles sample this instead of a flat fill, which is what
              makes a node read as a light source rather than a filled UI
              circle with a blur behind it. */}
          {graph.categories.map((cat) => (
            <radialGradient key={cat.key} id={`constellation-star-glow-${cat.color.slice(1)}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
              <stop offset="22%" stopColor={cat.color} stopOpacity={0.85} />
              <stop offset="100%" stopColor={cat.color} stopOpacity={0} />
            </radialGradient>
          ))}
          <filter id="constellation-node-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="constellation-halo-blur" x="-160%" y="-160%" width="420%" height="420%">
            <feGaussianBlur stdDeviation="13" />
          </filter>
          <filter id="constellation-corona-blur" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id="constellation-edge-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
          <filter id="constellation-nebula-blur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="55" />
          </filter>
        </defs>

        <ConstellationBackdrop viewportX={viewport.x} viewportY={viewport.y} />

        {/* A plain SVG `transform` attribute, not a Framer Motion
            `animate` prop — Motion has special-cased handling for SVG
            elements where animating `scale` makes it silently manage
            `transform-origin` around the element's own content bounding
            box (confirmed via computed-style inspection: transformOrigin
            kept resolving to the content's bbox center no matter what
            `style`/`transformTemplate` said), throwing off exactly the
            (0,0)-anchored math fitToScreen assumes. A plain attribute-set
            transform doesn't go through that path at all — it uses SVG's
            native view-box-relative (0,0) origin, confirmed by the
            per-node `<motion.g transform="...">` below (also
            attribute-set, never distorted) — so pan/zoom/fit's math is
            trustworthy again. The one thing Motion was providing here,
            `transition`, is replaced by an equivalent plain CSS
            transition (SVG's presentational `transform` attribute maps
            to the same CSS property, so `transition: transform ...`
            animates attribute changes exactly like style changes). */}
        <g
          transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.scale})`}
          style={{
            transition:
              viewportTransition.duration > 0
                ? `transform ${viewportTransition.duration}s ${
                    viewportTransition.ease ? `cubic-bezier(${viewportTransition.ease.join(',')})` : 'ease'
                  }`
                : 'none',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.g
              key={graph.project}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.85, transition: { duration: DISSOLVE_DURATION_S, ease: 'easeIn' } }}
              style={{ transformOrigin: `${layout.width / 2}px ${layout.height / 2}px` }}
            >
              {graph.edges.map((edge) => {
                const from = layout.positions.get(edge.from);
                const to = layout.positions.get(edge.to);
                if (!from || !to) return null;
                const targetNode = nodeById.get(edge.to);
                const color = targetNode?.color ?? '#5a5a5a';
                const edgeKey = `${edge.from}->${edge.to}`;
                const unitIndex = unitIndexByEdgeKey.get(edgeKey) ?? 0;
                const delay = revealSequence.isComplete ? 0 : revealSequence.getUnitTransition(unitIndex).delay;
                const duration = revealSequence.isComplete ? 0.2 : revealSequence.getUnitTransition(unitIndex).duration;
                return (
                  <ConstellationEdge
                    key={edgeKey}
                    edgeKey={edgeKey}
                    pathId={`constellation-edge-${edgeKey}`}
                    from={from}
                    to={to}
                    color={color}
                    state={stateForEdge(edge.from, edge.to)}
                    reduceMotion={reduceMotion}
                    delay={delay}
                    duration={duration}
                    isRevealed={revealSequence.isComplete}
                  />
                );
              })}

              {graph.nodes.map((node) => {
                const position = layout.positions.get(node.id);
                if (!position) return null;
                const unitIndex = unitIndexByNodeId.get(node.id) ?? 0;
                return (
                  <ConstellationStar
                    key={node.id}
                    node={node}
                    position={position}
                    isRoot={node.tier === 'primary'}
                    state={stateForId(node.id)}
                    reduceMotion={reduceMotion}
                    revealSequence={revealSequence}
                    unitIndex={unitIndex}
                    isLastRevealUnit={unitIndex === revealOrder.length - 1}
                    onHoverChange={(hovering) => setHoveredId(hovering ? node.id : null)}
                    onSelect={() => {
                      setSelectedId(node.id);
                      focusOnNode(position);
                    }}
                  />
                );
              })}
            </motion.g>
          </AnimatePresence>
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded border border-[#3c3c3c] bg-[#252526]/80 p-0.5 text-[#cccccc] backdrop-blur-sm">
        <button type="button" onClick={fitToScreenManual} title="Fit to screen" className="rounded p-1.5 hover:bg-[#2d2d2d]">
          <Maximize size={13} />
        </button>
        <button type="button" onClick={resetView} title="Reset view" className="rounded p-1.5 hover:bg-[#2d2d2d]">
          <RotateCcw size={13} />
        </button>
      </div>

      <ConstellationInfoCard graph={graph} selectedNode={selectedNode} onClose={() => setSelectedId(null)} />
    </div>
  );
}

/**
 * A small floating card in the canvas's top-right corner. Just enough to
 * orient at a glance (category colors + a technology count) without
 * permanently walling off a strip of the canvas; a selected node's detail
 * takes over the same card rather than opening a second panel.
 */
function ConstellationInfoCard({
  graph,
  selectedNode,
  onClose,
}: {
  graph: ConstellationGraph;
  selectedNode: ConstellationNode | undefined;
  onClose: () => void;
}) {
  if (selectedNode) {
    return (
      <div className="absolute right-3 top-3 z-10 w-60 max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-lg border border-[#3c3c3c] bg-[#1e1e1e]/90 shadow-lg backdrop-blur-sm">
        <div className="sticky top-0 flex items-center gap-2 border-b border-[#3c3c3c] bg-[#1e1e1e]/90 px-3 py-2 backdrop-blur-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selectedNode.color }} />
          <span className="flex-1 truncate text-[12px] font-medium text-white">{selectedNode.technology}</span>
          <button type="button" onClick={onClose} className="shrink-0 text-[#858585] hover:text-white" aria-label="Close">
            <X size={13} />
          </button>
        </div>
        <div className="space-y-3 px-3 py-2">
          <Field label="Role" value={selectedNode.role} />
          <Field label="Category" value={selectedNode.categoryLabel} />
          {selectedNode.description && <Field label="Description" value={selectedNode.description} />}
          {selectedNode.tags && selectedNode.tags.length > 0 && <Field label="Tags" value={selectedNode.tags} />}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-3 top-3 z-10 w-52 rounded-lg border border-[#3c3c3c] bg-[#1e1e1e]/90 shadow-lg backdrop-blur-sm">
      <div className="px-3 py-2.5">
        <div className="mb-2 text-[10px] uppercase tracking-wide text-[#858585]">Legend</div>
        <ul className="space-y-1.5">
          {graph.categories.map((cat) => (
            <li key={cat.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="truncate text-[11px] text-[#cccccc]">{cat.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 border-t border-[#3c3c3c] px-3 py-2 text-[11px]">
        <Boxes size={13} className="text-[#858585]" />
        <span className="font-semibold text-white">{graph.nodes.length}</span>
        <span className="text-[#9d9d9d]">Technologies</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | string[] | undefined }) {
  if (!value || value.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-[#858585]">{label}</div>
      {Array.isArray(value) ? (
        <ul className="mt-0.5 list-disc pl-4 text-[11px] text-[#cccccc]">
          {value.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-0.5 text-[11px] text-[#cccccc]">{value}</div>
      )}
    </div>
  );
}
