import { useEffect, useMemo, useRef, useState } from 'react';
import type { Point, PositionedGraph, PositionedNode } from '../../graph/layout/types';
import { buildRevealSchedule } from '../../graph/motion/revealSchedule';
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
 *     -> useGraphInteraction (Interaction Resolver glue — hover/focus/
 *        selection, discrete React state)
 *     -> useGraphSimulation  (continuous physics: drift, breathing's
 *        position counterpart, dragging — imperative, never re-renders)
 *
 * GraphNode/GraphEdgeLine receive plain state/handler props and a DOM
 * ref callback each; they never reach back into either hook themselves,
 * and never ask "is hover active"/"is search active" — they only ever
 * read the single `visualState` verdict `useGraphInteraction` hands them.
 * Both are `React.memo`'d, and every handler/ref prop passed down is a
 * per-node-id CACHED closure (from `useGraphInteraction`/
 * `useGraphSimulation`), so a hover/focus/selection change only
 * re-renders the (typically few) nodes/edges whose own resolved state
 * actually changed.
 *
 * Renders ONLY `positioned.edges` — the real graph topology. No sibling
 * helper lines, declaration-order paths, or other diagnostic overlays.
 */

/** A single stable object reference reused for every root-node/no-data label direction — a fresh `{x:0,y:-1}` literal on every render would defeat GraphNode's React.memo despite the VALUE never changing. */
const UP_DIRECTION: Point = { x: 0, y: -1 };

/** How long after the graph finishes growing to re-fit the camera. The network needs a moment to relax out of the layout's coordinates into its own force equilibrium (which is slightly roomier — see `useGraphSimulation`'s header); fitting before that settles would frame a composition that no longer exists a second later. */
const POST_CONSTRUCTION_FIT_DELAY_MS = 2200;

export function KnowledgeGraphScene({ positioned }: { positioned: PositionedGraph }) {
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

  // Exactly one nondeterministic value in the whole construction
  // animation, drawn once per mount: the brief requires the reveal order
  // to differ between page loads while staying fixed within a single run.
  // Everything downstream of this seed is derived deterministically — see
  // `revealSchedule.ts`.
  const [revealSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
  const schedule = useMemo(() => buildRevealSchedule(positioned, revealSeed), [positioned, revealSeed]);

  // The construction animation and the physics simulation are two separate
  // stages that never overlap: while this is false the graph is growing
  // and every node holds its layout coordinate; when it flips, the network
  // takes over. Reduced motion skips the growth entirely.
  const [constructionDone, setConstructionDone] = useState(reduceMotion);
  useEffect(() => {
    if (reduceMotion) {
      setConstructionDone(true);
      return;
    }
    setConstructionDone(false);
    const timer = window.setTimeout(() => setConstructionDone(true), schedule.totalMs);
    return () => window.clearTimeout(timer);
  }, [schedule, reduceMotion]);

  const nodeById = useMemo(() => new Map(positioned.nodes.map((node) => [node.id, node])), [positioned]);

  const leafNodes = useMemo(() => positioned.nodes.filter((node) => node.kind === 'leaf'), [positioned]);
  const categoryNodes = useMemo(() => positioned.nodes.filter((node) => node.kind === 'category'), [positioned]);
  const rootNodes = useMemo(() => positioned.nodes.filter((node) => node.kind === 'root'), [positioned]);

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

  // Precomputed ONCE (not recreated every render) so every node's
  // `labelDirection` prop stays a stable object reference — a plain
  // `{x, y}` literal created inline in JSX would defeat GraphNode's
  // React.memo every single render regardless of whether the VALUE
  // actually changed, since object props compare by reference.
  const labelDirectionById = useMemo(() => {
    const map = new Map<string, Point>();
    for (const node of leafNodes) {
      const categoryPos = categoryPositionByKey.get(node.categoryKey) ?? positioned.center;
      map.set(node.id, { x: node.x - categoryPos.x, y: node.y - categoryPos.y });
    }
    for (const node of categoryNodes) {
      map.set(node.id, categoryLabelDirectionByKey.get(node.key) ?? UP_DIRECTION);
    }
    for (const node of rootNodes) {
      map.set(node.id, UP_DIRECTION);
    }
    return map;
  }, [leafNodes, categoryNodes, rootNodes, categoryPositionByKey, categoryLabelDirectionByKey, positioned.center]);

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
    // A contain fit, not a cover. The previous value of 4 asked for an
    // aggressive cover that deliberately crops, and it only ever looked
    // reasonable because a second, unintended viewBox scale (see the <svg>
    // comment below) was halving it. With the transform chain corrected,
    // that boost crops ~170px off both the top and the bottom. This graph
    // is roughly square while its panel is wide and short, so nothing can
    // fill both axes at once — and Phase 5 asks for "never clipped,
    // perfectly centered, equal margins" rather than maximum coverage, so
    // the spare width is left as margin.
    coverBoost: 0.12,
    // Spec: "On window resize: recalculate, smoothly animate to the new
    // fit, do not snap" — opt-in only, so Constellation's own resize
    // behavior (an intentional instant snap) is unaffected.
    animateResizeFit: true,
    // Milestone 8 ("Camera: buttery smooth, no abrupt stopping") — both
    // opt-in, both default off, so Constellation's own instant-stop pan
    // and instant wheel-zoom stay byte-identical.
    panInertia: true,
    wheelZoomTransitionMs: 120,
    reduceMotion,
  });

  const interaction = useGraphInteraction(positioned);
  const simulation = useGraphSimulation(positioned, viewport.scale, reduceMotion, constructionDone);

  // Phase 5's "fit calculated after construction completes." The mount fit
  // already framed the layout instantly (so the graph never flies in), and
  // this eases to the final framing once the relaxed equilibrium has
  // settled. Skipped under reduced motion, where nothing moved and the
  // mount fit is still exactly correct.
  useEffect(() => {
    if (!constructionDone || reduceMotion) return;
    const timer = window.setTimeout(() => fitToScreenAnimated(), POST_CONSTRUCTION_FIT_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constructionDone, reduceMotion]);

  // "Raise z-index" on hover/focus/selection: SVG has no z-index, paint
  // order IS stacking order, so the node currently driving emphasis
  // (`emphasizedNodeId` — selection, else hover, else focus, same
  // precedence the resolver itself uses) is moved to the END of the
  // render list, painting on top of every other node regardless of kind.
  // Stable `key={node.id}` means React MOVES the existing DOM node rather
  // than unmounting/remounting it, so this never disrupts the physics
  // simulation's own ref or in-flight CSS transitions.
  // Frozen while a drag is in progress: reordering the DOM mid-drag was
  // measured live to disrupt the dragged node's own pointer capture (the
  // browser drops/reinterprets capture when its element gets moved via
  // `insertBefore`/`appendChild`, which is what a keyed-array reorder does
  // under the hood) — a real regression caught via the existing physics
  // regression test, not assumed. Dragging already has its own visual
  // prominence (scale/shadow/brighten) and is explicitly out of scope to
  // touch this milestone, so z-order simply defers to whatever the base
  // order already is for the drag's own duration.
  const orderedNodes = useMemo<PositionedNode[]>(() => {
    const base = [...leafNodes, ...categoryNodes, ...rootNodes];
    const anchorId = simulation.draggedNodeId ? null : interaction.emphasizedNodeId;
    if (!anchorId) return base;
    const anchorIndex = base.findIndex((node) => node.id === anchorId);
    if (anchorIndex === -1) return base;
    const rest = base.filter((node) => node.id !== anchorId);
    return [...rest, base[anchorIndex]];
  }, [leafNodes, categoryNodes, rootNodes, interaction.emphasizedNodeId, simulation.draggedNodeId]);

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

      {/*
        Deliberately carries NO `viewBox`. `useConstellationViewport`
        computes its `x`/`y`/`scale` in CONTAINER PIXELS — it measures the
        container, derives a usable box from it, and centers the layout
        inside that box. A `viewBox` would establish a second, independent
        user-space scale (here 0.489, from fitting a 1209x1252 box into a
        1170x613 element) that silently multiplies the transform below,
        halving every translation the hook produced. Horizontally the
        viewBox's own letterboxing happened to absorb most of the error;
        vertically there was no letterbox, so the graph sat ~150px too high
        and was clipped off the top edge while 223px went unused at the
        bottom. Without a viewBox the SVG's user units ARE CSS pixels, which
        is the coordinate system the hook was written against, and world
        coordinates reach the screen through exactly one transform.
      */}
      <svg
        ref={svgRef}
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
                0%, 100% { opacity: 0.88; }
                50% { opacity: 1; }
              }
              /* --- Construction ("growth") animation, Phase 1 --- */
              @keyframes graph-node-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes graph-node-pop {
                0% { transform: scale(0.7); }
                62% { transform: scale(1.05); }
                100% { transform: scale(1); }
              }
              /* Draws the line on from its parent end toward its child end.
                 Against pathLength="1" the dash pattern is normalized to
                 the line's own length, so this stays correct even once the
                 simulation starts rewriting both endpoints every frame. */
              @keyframes graph-edge-reveal {
                from { stroke-dashoffset: 1; }
                to { stroke-dashoffset: 0; }
              }
            `}
          </style>
          {/* Tightened from stdDeviation 2.5 — a close ambient shadow that
              seats the node against the canvas, rather than a halo that
              reads as emitted light. */}
          <filter id="graph-soft-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation={1.6} />
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
                  revealDelayMs={reduceMotion ? null : (schedule.edgeDelayMs.get(edgeKey) ?? 0)}
                />
              );
            })}
          </g>

          <g>
            {orderedNodes.map((node) => {
              const isDragging = simulation.draggedNodeId === node.id;
              return (
                <GraphNode
                  key={node.id}
                  node={node}
                  nodeRef={simulation.registerNodeEl(node.id)}
                  labelDirection={labelDirectionById.get(node.id) ?? UP_DIRECTION}
                  visualState={interaction.visualStateForNode(node.id)}
                  isPointerOnSelected={interaction.isPointerOnSelected(node.id)}
                  isDragging={isDragging}
                  cursor={interaction.cursorForNode(isDragging)}
                  reduceMotion={reduceMotion}
                  revealDelayMs={reduceMotion ? null : (schedule.nodeDelayMs.get(node.id) ?? 0)}
                  onHoverStart={interaction.getHoverStartHandler(node.id)}
                  onHoverEnd={interaction.getHoverEndHandler(node.id)}
                  onFocus={interaction.getFocusHandler(node.id)}
                  onBlur={interaction.getBlurHandler(node.id)}
                  onDragStart={simulation.beginDrag}
                />
              );
            })}
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
