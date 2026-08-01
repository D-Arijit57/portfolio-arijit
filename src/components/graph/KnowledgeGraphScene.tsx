import { useMemo, useRef } from 'react';
import type { Point, PositionedGraph } from '../../graph/layout/types';
import { useConstellationViewport } from '../../hooks/useConstellationViewport';
import { useGraphInteraction } from '../../hooks/useGraphInteraction';
import { useGraphSimulation } from '../../hooks/useGraphSimulation';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { GraphBackground } from './GraphBackground';
import { GraphEdgeLine } from './GraphEdgeLine';
import { GraphNode } from './GraphNode';
import { InspectorPanel } from './InspectorPanel';
import { NEUTRAL_EDGE_COLOR, categoryColorForNode } from './graphVisuals';

/**
 * The Knowledge Graph's scene — composes the deterministic renderer with
 * two independent runtime layers on top, neither of which ever touches
 * the Layout Engine's own `{x, y}`:
 *
 *   Graph Loader -> Graph Builder -> Layout Engine -> Renderer
 *     -> useGraphInteraction (hover/selection, discrete React state)
 *     -> useGraphSimulation  (continuous physics: drift, breathing's
 *        position counterpart, dragging — imperative, never re-renders)
 *
 * GraphNode/GraphEdgeLine receive plain state/handler props and a DOM
 * ref callback each; they never reach back into either hook themselves.
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

  // The Inspector Panel's own ref (see useConstellationViewport's
  // `reservedChromeRefs`) — same pattern ConstellationScene's info card
  // already established: a selected node focuses within whatever area the
  // panel ISN'T currently covering, rather than centering underneath it.
  // Only ever non-null while a node is selected (the panel unmounts
  // otherwise), so this has zero effect on the initial, nothing-selected
  // fit.
  const inspectorPanelRef = useRef<HTMLDivElement>(null);

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
  } = useConstellationViewport(positioned.bounds, {
    nodeSelector: '[data-graph-node]',
    reservedChromeRefs: [inspectorPanelRef],
    // Spec: "Duration: 400-600ms. Ease In Out" — distinct from the
    // Constellation's own frozen 800ms ease-out default (see
    // useConstellationViewport's `focusTransition` option), reusing the
    // same standard ease-in-out curve GraphNode/GraphEdgeLine's own
    // hover/selection transitions already use.
    focusTransition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
    // The graph should read as "automatically fit and centered, no large
    // empty regions" — a tighter padding ratio and a much higher cover
    // boost than Constellation's own (still capped by MAX_SCALE) so the
    // fit is effectively a full "cover" rather than a conservative
    // "contain" with a small boost. RadialLayout's own `viewportPadding`
    // is already baked into `positioned.bounds` specifically as
    // crop-tolerance for exactly this kind of fit. Deterministic bounds
    // in, deterministic fit out — the graph opens in the exact same spot
    // every time.
    fitPaddingRatio: 0.06,
    coverBoost: 4,
    // Spec: "On window resize: recalculate, smoothly animate to the new
    // fit, do not snap" — opt-in only, so Constellation's own resize
    // behavior (an intentional instant snap) is unaffected.
    animateResizeFit: true,
  });

  const interaction = useGraphInteraction(positioned);
  const simulation = useGraphSimulation(positioned, viewport.scale, reduceMotion);

  const selectAndFocus = (nodeId: string) => {
    interaction.handleNodeSelect(nodeId);
    const node = nodeById.get(nodeId);
    if (node) focusOnNode({ x: node.x, y: node.y });
  };

  // Shared by every "deselect" trigger — clicking empty canvas, the
  // Inspector Panel's own close button, and Escape — so all three behave
  // identically (clear selection, ease back to the full-graph fit).
  const deselectAndRefit = () => {
    interaction.clearSelection();
    fitToScreenAnimated();
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    viewportPointerMove(event);
    simulation.updateDragPointer({ x: event.clientX, y: event.clientY });
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const draggedId = simulation.draggedNodeId;
    if (draggedId) selectAndFocus(draggedId);
    simulation.endDrag();
    viewportPointerUp(event, deselectAndRefit);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') deselectAndRefit();
  };

  const selectedNode = interaction.selectedId ? nodeById.get(interaction.selectedId) : undefined;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#1e1e1e] font-sans"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <GraphBackground />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${positioned.bounds.width} ${positioned.bounds.height}`}
        className="relative h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={viewportPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <style>
            {`
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
          <filter id="graph-soft-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation={2.5} />
          </filter>
        </defs>

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
              // Root -> category edges stay neutral chrome; only
              // category -> leaf edges carry the category's color — per
              // the approved reference, color marks "this is a specific
              // technology," not "this connects to the hub."
              const color = targetNode.kind === 'leaf' ? (categoryColorForNode(targetNode) ?? NEUTRAL_EDGE_COLOR) : NEUTRAL_EDGE_COLOR;
              const edgeKey = `${edge.from}->${edge.to}`;
              return (
                <GraphEdgeLine
                  key={edgeKey}
                  edgeKey={edgeKey}
                  edgeRef={simulation.registerEdgeEl(edgeKey)}
                  from={edge.fromPoint}
                  to={edge.toPoint}
                  color={color}
                  visualState={interaction.visualStateForEdge(edge.from, edge.to)}
                  reduceMotion={reduceMotion}
                />
              );
            })}
          </g>

          <g>
            {leafNodes.map((node) => {
              const categoryPos = categoryPositionByKey.get(node.categoryKey) ?? positioned.center;
              return (
                <GraphNode
                  key={node.id}
                  node={node}
                  nodeRef={simulation.registerNodeEl(node.id)}
                  labelDirection={{ x: node.x - categoryPos.x, y: node.y - categoryPos.y }}
                  visualState={interaction.visualStateForNode(node.id)}
                  isSelected={interaction.selectedId === node.id}
                  isDragging={simulation.draggedNodeId === node.id}
                  reduceMotion={reduceMotion}
                  onHoverStart={() => interaction.handleNodeHoverStart(node.id)}
                  onHoverEnd={() => interaction.handleNodeHoverEnd(node.id)}
                  onDragStart={(point) => simulation.beginDrag(node.id, point)}
                />
              );
            })}
            {categoryNodes.map((node) => (
              <GraphNode
                key={node.id}
                node={node}
                nodeRef={simulation.registerNodeEl(node.id)}
                labelDirection={categoryLabelDirectionByKey.get(node.key) ?? { x: 0, y: -1 }}
                visualState={interaction.visualStateForNode(node.id)}
                isSelected={interaction.selectedId === node.id}
                isDragging={simulation.draggedNodeId === node.id}
                reduceMotion={reduceMotion}
                onHoverStart={() => interaction.handleNodeHoverStart(node.id)}
                onHoverEnd={() => interaction.handleNodeHoverEnd(node.id)}
                onDragStart={(point) => simulation.beginDrag(node.id, point)}
              />
            ))}
            {rootNodes.map((node) => (
              <GraphNode
                key={node.id}
                node={node}
                nodeRef={simulation.registerNodeEl(node.id)}
                labelDirection={{ x: 0, y: -1 }}
                visualState={interaction.visualStateForNode(node.id)}
                isSelected={interaction.selectedId === node.id}
                isDragging={simulation.draggedNodeId === node.id}
                reduceMotion={reduceMotion}
                onHoverStart={() => interaction.handleNodeHoverStart(node.id)}
                onHoverEnd={() => interaction.handleNodeHoverEnd(node.id)}
                onDragStart={(point) => simulation.beginDrag(node.id, point)}
              />
            ))}
          </g>
        </g>
      </svg>

      <InspectorPanel
        panelRef={inspectorPanelRef}
        positioned={positioned}
        selectedNode={selectedNode}
        onClose={deselectAndRefit}
        onSelectNode={selectAndFocus}
      />
    </div>
  );
}
