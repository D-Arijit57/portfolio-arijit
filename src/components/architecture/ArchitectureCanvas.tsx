import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, RotateCcw, Download } from 'lucide-react';
import type { VirtualFile } from '../../types';
import { useStore } from '../../store/useStore';
import { getArchitectureModel, projectKeyFromPath } from '../../architecture/registry';
import { CATEGORY_STYLES } from '../../architecture/categories';
import { getNodeRelationships, visualStateForNode, visualStateForEdge } from '../../architecture/relationships';
import { layoutModel, NODE_WIDTH, NODE_HEIGHT } from './layout';
import { resolveIcon } from './icons';
import { NodeDetailPopover } from './NodeDetailPopover';
import { Minimap } from './Minimap';

/**
 * The Architecture Canvas (ARCHITECTURE_PLATFORM_DESIGN.md §6.2). Phase 2
 * built rendering + pan/zoom/fit/reset; Phase 3 adds interaction
 * (hover/select/highlight/popover/keyboard) on top, entirely as derived
 * visual state — ArchitectureModel is never mutated, and connected-node/edge
 * sets are computed on read (src/architecture/relationships.ts), never
 * cached. Hover/select state lives in the store (architectureState), the
 * same place searchState/terminalState/notificationState already live,
 * since Editor and Canvas both need to read/write it.
 */

// MIN_SCALE only bounds *manual* zoom-out (handleWheel) — it must never
// floor the automatic fit calculation below, or a large-enough graph would
// be clamped up past what actually fits and clip. MAX_SCALE still caps fit
// (a deliberate readability/perf ceiling, not a correctness concern: it
// only means a very small graph won't stretch to fill 100%, never that a
// large one clips).
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
// Proportional, not a fixed pixel margin — this is what makes fit-to-screen
// viewport-aware instead of using an absolute value that's too generous on
// a small container and negligible on a large one. 0.08 on each side leaves
// the graph occupying ~84% of the viewport's binding axis after fitting
// (1 - 2 * ratio) — near the top of the "roughly 75-85%" target, since the
// brief calls the previous margin still too conservative. The *other* axis
// may show more margin than that whenever the graph's aspect ratio doesn't
// match the container's — inherent to a uniform (non-distorting) fit;
// forcing both axes to hit the same percentage would mean stretching nodes
// unevenly, which would look worse than extra margin on one side.
const FIT_PADDING_RATIO = 0.08;
const CLICK_DRAG_THRESHOLD = 4;
const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

const NODE_STROKE: Record<string, number> = { default: 1.5, active: 2.5, connected: 2, dimmed: 1.5 };
const NODE_OPACITY: Record<string, number> = { default: 1, active: 1, connected: 1, dimmed: 0.35 };
const EDGE_COLOR: Record<string, string> = {
  default: '#5a5a5a',
  connected: '#cccccc',
  dimmed: '#5a5a5a',
};
const EDGE_OPACITY: Record<string, number> = { default: 1, connected: 1, dimmed: 0.25 };
const EDGE_WIDTH: Record<string, number> = { default: 1.5, connected: 2.5, dimmed: 1.5 };

export function ArchitectureCanvas({ file }: { file: VirtualFile }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const panState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
  } | null>(null);

  const { architectureState, setHoveredArchitectureNode, setSelectedArchitectureNode } = useStore();
  const { hoveredNodeId, selectedNodeId } = architectureState;

  // Set on real pan/zoom only (not the initial mount-triggered fit) — once
  // true, the ResizeObserver below stops auto-refitting until Fit/Reset is
  // pressed, per "never override the camera after manual interaction."
  const hasInteractedRef = useRef(false);

  const model = useMemo(() => {
    const projectKey = projectKeyFromPath(file.path);
    return projectKey ? getArchitectureModel(projectKey) : undefined;
  }, [file.path]);

  const layout = useMemo(() => (model ? layoutModel(model) : undefined), [model]);

  // A stale node id from a different project's model must never bleed
  // across a project switch — reset interaction state whenever the
  // resolved model itself changes.
  useEffect(() => {
    setSelectedArchitectureNode(null);
    setHoveredArchitectureNode(null);
    hasInteractedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  const activeNodeId = hoveredNodeId ?? selectedNodeId;
  const relationships = useMemo(
    () => (model ? getNodeRelationships(model, activeNodeId) : undefined),
    [model, activeNodeId],
  );

  const fitToScreen = () => {
    const container = containerRef.current;
    if (!container || !layout || layout.width === 0 || layout.height === 0) return;
    const availableWidth = container.clientWidth * (1 - FIT_PADDING_RATIO * 2);
    const availableHeight = container.clientHeight * (1 - FIT_PADDING_RATIO * 2);
    // Maximize, don't minimize: the largest scale that satisfies both
    // dimensions, capped only by MAX_SCALE — never floored by MIN_SCALE,
    // so a graph that genuinely needs to shrink further to avoid clipping
    // always can.
    const scale = Math.min(MAX_SCALE, availableWidth / layout.width, availableHeight / layout.height);
    setViewport({
      scale,
      x: (container.clientWidth - layout.width * scale) / 2,
      y: (container.clientHeight - layout.height * scale) / 2,
    });
  };

  const fitToScreenManual = () => {
    // The explicit "Fit" button re-arms auto-refitting on resize, same as a
    // fresh open — an intentional Fit click is the user asking to return to
    // the computed framing, not a one-off exception to it.
    hasInteractedRef.current = false;
    fitToScreen();
  };

  const resetView = () => {
    const container = containerRef.current;
    if (!container || !layout) return;
    hasInteractedRef.current = false;
    setViewport({
      scale: 1,
      x: (container.clientWidth - layout.width) / 2,
      y: (container.clientHeight - layout.height) / 2,
    });
  };

  useEffect(() => {
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // The pane hosting this canvas animates its width (SplitEditorArea's
  // motion.div, 200ms transition) rather than snapping to it instantly, so
  // the mount-time fitToScreen() above can run mid-animation and measure a
  // too-narrow container — exactly what produced a small, off-center graph
  // in practice. A ResizeObserver re-fits on every real size change,
  // including the tail of that transition, converging on the correct fit
  // once the pane settles — and doubles as the "adapt to browser resize"
  // behavior, since it keeps firing for as long as the user hasn't taken
  // manual control.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (!hasInteractedRef.current) {
        fitToScreen();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    (event.target as Element).setPointerCapture(event.pointerId);
    panState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!panState.current || panState.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - panState.current.lastX;
    const dy = event.clientY - panState.current.lastY;
    panState.current.lastX = event.clientX;
    panState.current.lastY = event.clientY;
    hasInteractedRef.current = true;
    setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const pan = panState.current;
    if (!pan || pan.pointerId !== event.pointerId) return;

    const movedDistance = Math.hypot(event.clientX - pan.startX, event.clientY - pan.startY);
    const clickedNode = (event.target as Element).closest('[data-architecture-node]');
    if (movedDistance < CLICK_DRAG_THRESHOLD && !clickedNode) {
      setSelectedArchitectureNode(null);
    }
    panState.current = null;
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    hasInteractedRef.current = true;
    setViewport((v) => {
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * zoomFactor));
      const worldX = (cursorX - v.x) / v.scale;
      const worldY = (cursorY - v.y) / v.scale;
      return {
        scale: nextScale,
        x: cursorX - worldX * nextScale,
        y: cursorY - worldY * nextScale,
      };
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setSelectedArchitectureNode(null);
    }
  };

  const handleZoomPresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const nextScale = Number(event.target.value) / 100;
    hasInteractedRef.current = true;
    setViewport((v) => {
      const centerX = container.clientWidth / 2;
      const centerY = container.clientHeight / 2;
      const worldX = (centerX - v.x) / v.scale;
      const worldY = (centerY - v.y) / v.scale;
      return {
        scale: nextScale,
        x: centerX - worldX * nextScale,
        y: centerY - worldY * nextScale,
      };
    });
  };

  const handleMinimapNavigate = (worldX: number, worldY: number) => {
    const container = containerRef.current;
    if (!container) return;
    hasInteractedRef.current = true;
    setViewport((v) => ({
      scale: v.scale,
      x: container.clientWidth / 2 - worldX * v.scale,
      y: container.clientHeight / 2 - worldY * v.scale,
    }));
  };

  const handleExportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${model?.projectKey ?? 'architecture'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!model || !layout || !relationships) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#1e1e1e] text-[#858585] text-sm font-mono">
        No architecture model registered for this project.
      </div>
    );
  }

  const selectedNode = selectedNodeId ? model.nodes.find((n) => n.id === selectedNodeId) : undefined;
  const selectedPosition = selectedNodeId ? layout.positions.get(selectedNodeId) : undefined;
  const popoverScreenPosition =
    selectedNode && selectedPosition
      ? {
          left: viewport.x + (selectedPosition.x + NODE_WIDTH / 2) * viewport.scale,
          top: viewport.y + selectedPosition.y * viewport.scale,
        }
      : undefined;

  const currentZoomPercent = Math.round(viewport.scale * 100);
  const zoomOptions = Array.from(new Set([...ZOOM_PRESETS, currentZoomPercent])).sort((a, b) => a - b);

  return (
    <div className="flex h-full w-full flex-col bg-[#1e1e1e]">
      <div className="flex items-center gap-1 border-b border-[#3c3c3c] bg-[#252526] px-2 py-1 text-[12px] text-[#cccccc]">
        <button
          type="button"
          onClick={fitToScreenManual}
          title="Fit to screen"
          className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[#2d2d2d]"
        >
          <Maximize size={13} />
          <span>Fit to Screen</span>
        </button>

        <div className="mx-1 h-4 w-px bg-[#3c3c3c]" />

        <select
          value={currentZoomPercent}
          onChange={handleZoomPresetChange}
          title="Zoom level"
          className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-1.5 py-1 text-[12px] text-[#cccccc] outline-none"
        >
          {zoomOptions.map((percent) => (
            <option key={percent} value={percent}>
              {percent}%
            </option>
          ))}
        </select>

        <div className="mx-1 h-4 w-px bg-[#3c3c3c]" />

        <button
          type="button"
          onClick={resetView}
          title="Reset view"
          className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[#2d2d2d]"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={handleExportSvg}
          title="Export as SVG"
          className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[#2d2d2d]"
        >
          <Download size={13} />
          <span>Export SVG</span>
        </button>
      </div>

      <div ref={containerRef} className="relative flex-1 overflow-hidden" tabIndex={-1} onKeyDown={handleKeyDown}>
        <svg
          ref={svgRef}
          className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          <defs>
            <pattern id="architecture-grid" width={24} height={24} patternUnits="userSpaceOnUse">
              <circle cx={1} cy={1} r={1} fill="#333333" />
            </pattern>
            <marker
              id="architecture-arrow"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#5a5a5a" />
            </marker>
          </defs>

          <rect x={0} y={0} width="100%" height="100%" fill="url(#architecture-grid)" />

          <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.scale})`}>
            {model.edges.map((edge, index) => {
              const from = layout.positions.get(edge.from);
              const to = layout.positions.get(edge.to);
              if (!from || !to) return null;
              const x1 = from.x + NODE_WIDTH / 2;
              const y1 = from.y + NODE_HEIGHT;
              const x2 = to.x + NODE_WIDTH / 2;
              const y2 = to.y;
              const midY = (y1 + y2) / 2;
              const edgeState = visualStateForEdge(edge.from, edge.to, relationships);
              return (
                <g key={`${edge.from}-${edge.to}-${index}`} opacity={EDGE_OPACITY[edgeState]}>
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    fill="none"
                    stroke={EDGE_COLOR[edgeState]}
                    strokeWidth={EDGE_WIDTH[edgeState]}
                    markerEnd="url(#architecture-arrow)"
                  />
                  {edge.label && (
                    <text
                      x={(x1 + x2) / 2}
                      y={midY - 4}
                      textAnchor="middle"
                      fill="#858585"
                      fontSize={11}
                      fontFamily="monospace"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {model.nodes.map((node) => {
              const position = layout.positions.get(node.id);
              if (!position) return null;
              const style = CATEGORY_STYLES[node.category];
              const Icon = resolveIcon(node.icon ?? style.icon) ?? resolveIcon(style.icon);
              const nodeState = visualStateForNode(node.id, relationships);
              return (
                <g
                  key={node.id}
                  transform={`translate(${position.x}, ${position.y})`}
                  opacity={NODE_OPACITY[nodeState]}
                >
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={6}
                    fill="#252526"
                    stroke={style.accentColor}
                    strokeWidth={NODE_STROKE[nodeState]}
                  />
                  <rect width={4} height={NODE_HEIGHT} fill={style.accentColor} rx={2} />
                  <foreignObject x={0} y={0} width={NODE_WIDTH} height={NODE_HEIGHT}>
                    <button
                      type="button"
                      data-architecture-node={node.id}
                      className="flex h-full w-full items-center gap-2 px-3 pl-4 text-left focus:outline-none"
                      onMouseEnter={() => setHoveredArchitectureNode(node.id)}
                      onMouseLeave={() => setHoveredArchitectureNode(null)}
                      onFocus={() => setHoveredArchitectureNode(node.id)}
                      onBlur={() => setHoveredArchitectureNode(null)}
                      onClick={() => setSelectedArchitectureNode(node.id)}
                    >
                      {Icon && <Icon size={16} color={style.accentColor} className="shrink-0" />}
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-white">{node.title}</span>
                        {node.technology && (
                          <span className="block truncate text-[10px] text-[#858585]">{node.technology}</span>
                        )}
                      </span>
                    </button>
                  </foreignObject>
                </g>
              );
            })}
          </g>
        </svg>

        {selectedNode && popoverScreenPosition && (
          <NodeDetailPopover
            node={selectedNode}
            style={CATEGORY_STYLES[selectedNode.category]}
            screenPosition={popoverScreenPosition}
            onClose={() => setSelectedArchitectureNode(null)}
          />
        )}

        <div className="absolute bottom-3 right-3">
          <Minimap
            layout={layout}
            viewport={viewport}
            containerWidth={containerRef.current?.clientWidth ?? 0}
            containerHeight={containerRef.current?.clientHeight ?? 0}
            onNavigate={handleMinimapNavigate}
          />
        </div>
      </div>
    </div>
  );
}
