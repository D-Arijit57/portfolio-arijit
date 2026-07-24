import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, RotateCcw } from 'lucide-react';
import type { VirtualFile } from '../../types';
import { getArchitectureModel, projectKeyFromPath } from '../../architecture/registry';
import { CATEGORY_STYLES } from '../../architecture/categories';
import { layoutModel, NODE_WIDTH, NODE_HEIGHT } from './layout';
import { resolveIcon } from './icons';

/**
 * The Architecture Canvas (ARCHITECTURE_PLATFORM_DESIGN.md §6.2) — the first
 * real renderer built against the Architecture Platform. Resolves its model
 * through the registry only (never imports a project model directly),
 * renders nodes/nodes styled exclusively via CATEGORY_STYLES, and never
 * touches Mermaid text. Phase 2 scope: rendering + pan/zoom/fit/reset only —
 * no hover, selection, or sync (Phase 3).
 */

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const FIT_MARGIN = 64;

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export function ArchitectureCanvas({ file }: { file: VirtualFile }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const panState = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);

  const model = useMemo(() => {
    const projectKey = projectKeyFromPath(file.path);
    return projectKey ? getArchitectureModel(projectKey) : undefined;
  }, [file.path]);

  const layout = useMemo(() => (model ? layoutModel(model) : undefined), [model]);

  const fitToScreen = () => {
    const container = containerRef.current;
    if (!container || !layout || layout.width === 0 || layout.height === 0) return;
    const availableWidth = container.clientWidth - FIT_MARGIN * 2;
    const availableHeight = container.clientHeight - FIT_MARGIN * 2;
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min(availableWidth / layout.width, availableHeight / layout.height)),
    );
    setViewport({
      scale,
      x: (container.clientWidth - layout.width * scale) / 2,
      y: (container.clientHeight - layout.height * scale) / 2,
    });
  };

  const resetView = () => {
    const container = containerRef.current;
    if (!container || !layout) return;
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

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    (event.target as Element).setPointerCapture(event.pointerId);
    panState.current = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY };
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!panState.current || panState.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - panState.current.lastX;
    const dy = event.clientY - panState.current.lastY;
    panState.current.lastX = event.clientX;
    panState.current.lastY = event.clientY;
    setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (panState.current?.pointerId === event.pointerId) {
      panState.current = null;
    }
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

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

  if (!model || !layout) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#1e1e1e] text-[#858585] text-sm font-mono">
        No architecture model registered for this project.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#1e1e1e]">
      <svg
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
            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#5a5a5a"
                  strokeWidth={1.5}
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
            return (
              <g key={node.id} transform={`translate(${position.x}, ${position.y})`}>
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={6}
                  fill="#252526"
                  stroke={style.accentColor}
                  strokeWidth={1.5}
                />
                <rect width={4} height={NODE_HEIGHT} fill={style.accentColor} rx={2} />
                <foreignObject x={12} y={0} width={NODE_WIDTH - 20} height={NODE_HEIGHT}>
                  <div className="h-full flex items-center gap-2 px-1">
                    {Icon && <Icon size={16} color={style.accentColor} className="shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-[12px] text-white font-medium truncate">{node.title}</div>
                      {node.technology && (
                        <div className="text-[10px] text-[#858585] truncate">{node.technology}</div>
                      )}
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-3 right-3 flex gap-1">
        <button
          type="button"
          onClick={fitToScreen}
          title="Fit to screen"
          className="p-1.5 rounded bg-[#252526] border border-[#3c3c3c] text-[#cccccc] hover:bg-[#2d2d2d]"
        >
          <Maximize size={14} />
        </button>
        <button
          type="button"
          onClick={resetView}
          title="Reset view"
          className="p-1.5 rounded bg-[#252526] border border-[#3c3c3c] text-[#cccccc] hover:bg-[#2d2d2d]"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
