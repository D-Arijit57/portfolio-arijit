import { useMemo } from 'react';
import type { Point, PositionedGraph } from '../../graph/layout/types';
import { useConstellationViewport } from '../../hooks/useConstellationViewport';
import { useGraphInteraction } from '../../hooks/useGraphInteraction';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { GraphBackground } from './GraphBackground';
import { GraphEdgeLine } from './GraphEdgeLine';
import { GraphNode } from './GraphNode';
import { categoryColorForNode } from './graphVisuals';

/**
 * The Knowledge Graph's scene — Milestone 4's static renderer plus
 * Milestone 5's Interaction Layer, composed on top without either the
 * Layout Engine or the renderer's own drawing rules changing. The
 * pipeline stays:
 *
 *   Graph Loader -> Graph Builder -> Layout Engine -> Renderer -> Interaction Layer
 *
 * This file is the ONLY place that composes the two new hooks
 * (`useConstellationViewport`, generalized rather than forked, and
 * `useGraphInteraction`) with the drawing components — GraphNode and
 * GraphEdgeLine receive plain state/handler props and never reach back
 * into either hook themselves.
 *
 * Renders ONLY `positioned.edges` — the real graph topology. No sibling
 * helper lines, declaration-order paths, or other diagnostic overlays.
 */
export function KnowledgeGraphScene({ positioned }: { positioned: PositionedGraph }) {
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

  const nodeById = useMemo(() => new Map(positioned.nodes.map((node) => [node.id, node])), [positioned]);

  const leafNodes = positioned.nodes.filter((node) => node.kind === 'leaf');
  const categoryNodes = positioned.nodes.filter((node) => node.kind === 'category');
  const rootNodes = positioned.nodes.filter((node) => node.kind === 'root');

  const categoryPositionByKey = useMemo(() => {
    const map = new Map<string, Point>();
    for (const node of categoryNodes) map.set(node.key, { x: node.x, y: node.y });
    return map;
  }, [categoryNodes]);

  // A category's label reads away from the mean position of its OWN
  // leaves, not always "straight up" — a leaf can land in any direction
  // relative to its own category under the force-relaxed layout. Falls
  // back to "away from the graph center" for a category with no leaves.
  const categoryLabelDirectionByKey = useMemo(() => {
    const map = new Map<string, Point>();
    for (const category of categoryNodes) {
      const children = leafNodes.filter((leaf) => leaf.categoryKey === category.key);
      if (children.length === 0) {
        map.set(category.key, { x: category.x - positioned.center.x, y: category.y - positioned.center.y });
        continue;
      }
      const centroid = children.reduce(
        (sum, leaf) => ({ x: sum.x + leaf.x / children.length, y: sum.y + leaf.y / children.length }),
        { x: 0, y: 0 },
      );
      map.set(category.key, { x: category.x - centroid.x, y: category.y - centroid.y });
    }
    return map;
  }, [categoryNodes, leafNodes, positioned.center]);

  const {
    containerRef,
    svgRef,
    viewport,
    viewportTransition,
    fitToScreenAnimated,
    focusOnNode,
    handlePointerDown: viewportPointerDown,
    handlePointerMove: viewportPointerMove,
    handlePointerUp: viewportPointerUp,
  } = useConstellationViewport(positioned.bounds, { nodeSelector: '[data-graph-node]' });

  const interaction = useGraphInteraction(positioned, viewport.scale);

  const selectAndFocus = (nodeId: string) => {
    interaction.handleNodeSelect(nodeId);
    const node = nodeById.get(nodeId);
    if (node) focusOnNode({ x: node.x, y: node.y });
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    viewportPointerMove(event);
    interaction.updateDrag({ x: event.clientX, y: event.clientY });
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const draggedId = interaction.dragState?.nodeId;
    if (draggedId) selectAndFocus(draggedId);
    interaction.endDrag();
    viewportPointerUp(event, () => {
      interaction.clearSelection();
      fitToScreenAnimated();
    });
  };

  const dragEndpointFor = (nodeId: string, end: 'from' | 'to') => {
    if (!interaction.dragState || interaction.dragState.nodeId !== nodeId) return null;
    return { end, offset: interaction.dragState.offset, isDragging: interaction.dragState.isDragging };
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#0b0d10] font-sans">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${positioned.bounds.width} ${positioned.bounds.height}`}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={viewportPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <style>
            {`
              @keyframes graph-node-float {
                0%   { transform: translate(0px, 0px); }
                30%  { transform: translate(var(--float-x1), var(--float-y1)); }
                62%  { transform: translate(var(--float-x2), var(--float-y2)); }
                85%  { transform: translate(var(--float-x3), var(--float-y3)); }
                100% { transform: translate(0px, 0px); }
              }
              @keyframes graph-node-breathe {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(var(--breathe-scale)); }
              }
              @keyframes graph-edge-breathe {
                0%, 100% { opacity: 0.85; }
                50% { opacity: 1; }
              }
            `}
          </style>
          <pattern id="graph-grid" width={44} height={44} patternUnits="userSpaceOnUse">
            <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#ffffff" strokeOpacity={0.035} strokeWidth={1} />
          </pattern>
          <filter id="graph-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0" />
          </filter>
          <radialGradient id="graph-vignette" cx="50%" cy="50%" r="75%">
            <stop offset="55%" stopColor="#000000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.55} />
          </radialGradient>
          <filter id="graph-soft-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={3} />
          </filter>
        </defs>

        <GraphBackground width={positioned.bounds.width} height={positioned.bounds.height} />

        <g
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            transformOrigin: '0 0',
            transition:
              viewportTransition.duration > 0
                ? `transform ${viewportTransition.duration}s ${
                    viewportTransition.ease ? `cubic-bezier(${viewportTransition.ease.join(',')})` : 'ease'
                  }`
                : 'none',
          }}
        >
          <g>
            {positioned.edges.map((edge) => {
              const targetNode = nodeById.get(edge.to);
              if (!targetNode) return null;
              const color = categoryColorForNode(targetNode) ?? '#5a5a5a';
              const edgeKey = `${edge.from}->${edge.to}`;
              return (
                <GraphEdgeLine
                  key={edgeKey}
                  edgeKey={edgeKey}
                  from={edge.fromPoint}
                  to={edge.toPoint}
                  color={color}
                  visualState={interaction.visualStateForEdge(edge.from, edge.to)}
                  dragEndpoint={dragEndpointFor(edge.from, 'from') ?? dragEndpointFor(edge.to, 'to')}
                  reduceMotion={reduceMotion}
                />
              );
            })}
          </g>

          <g>
            {leafNodes.map((node) => {
              const categoryPos = categoryPositionByKey.get(node.categoryKey) ?? positioned.center;
              const drag = interaction.dragState?.nodeId === node.id ? interaction.dragState : null;
              return (
                <GraphNode
                  key={node.id}
                  node={node}
                  labelDirection={{ x: node.x - categoryPos.x, y: node.y - categoryPos.y }}
                  visualState={interaction.visualStateForNode(node.id)}
                  isSelected={interaction.selectedId === node.id}
                  dragOffset={drag?.offset ?? { x: 0, y: 0 }}
                  isDragging={drag?.isDragging ?? false}
                  reduceMotion={reduceMotion}
                  onHoverStart={() => interaction.handleNodeHoverStart(node.id)}
                  onHoverEnd={() => interaction.handleNodeHoverEnd(node.id)}
                  onDragStart={(point) => interaction.startDrag(node.id, point)}
                />
              );
            })}
            {categoryNodes.map((node) => {
              const drag = interaction.dragState?.nodeId === node.id ? interaction.dragState : null;
              return (
                <GraphNode
                  key={node.id}
                  node={node}
                  labelDirection={categoryLabelDirectionByKey.get(node.key) ?? { x: 0, y: -1 }}
                  visualState={interaction.visualStateForNode(node.id)}
                  isSelected={interaction.selectedId === node.id}
                  dragOffset={drag?.offset ?? { x: 0, y: 0 }}
                  isDragging={drag?.isDragging ?? false}
                  reduceMotion={reduceMotion}
                  onHoverStart={() => interaction.handleNodeHoverStart(node.id)}
                  onHoverEnd={() => interaction.handleNodeHoverEnd(node.id)}
                  onDragStart={(point) => interaction.startDrag(node.id, point)}
                />
              );
            })}
            {rootNodes.map((node) => {
              const drag = interaction.dragState?.nodeId === node.id ? interaction.dragState : null;
              return (
                <GraphNode
                  key={node.id}
                  node={node}
                  labelDirection={{ x: 0, y: -1 }}
                  visualState={interaction.visualStateForNode(node.id)}
                  isSelected={interaction.selectedId === node.id}
                  dragOffset={drag?.offset ?? { x: 0, y: 0 }}
                  isDragging={drag?.isDragging ?? false}
                  reduceMotion={reduceMotion}
                  onHoverStart={() => interaction.handleNodeHoverStart(node.id)}
                  onHoverEnd={() => interaction.handleNodeHoverEnd(node.id)}
                  onDragStart={(point) => interaction.startDrag(node.id, point)}
                />
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
