import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Maximize, RotateCcw, Component, X, ChevronDown, Boxes, Waypoints, LayoutGrid, FolderGit2 } from 'lucide-react';
import type { ManifestModel } from '../../manifest/types';
import {
  buildConstellationGraph,
  type ConstellationGraph,
  type ConstellationNode,
  type ConstellationTier,
} from '../../manifest/constellationGraph';
import { layoutConstellation, TIER_RADIUS } from '../../manifest/constellationLayout';
import { buildConstellationRevealOrder } from '../../manifest/constellationReveal';
import { hashStringToIndex } from '../../manifest/colorHash';
import { resolveTechLogo } from '../../documentation/techLogos';
import { useFileRevealSequence } from '../../hooks/useFileRevealSequence';
import { prefersReducedMotion } from '../../lib/typingReveal';

/**
 * The Tech Stack Constellation — manifest.yaml's renderer. Independent of
 * src/architecture/'s Architecture Canvas by design.
 *
 * This is not a network diagram: it's meant to feel like a premium,
 * living constellation, not a rendered graph. Every visual decision below
 * exists to serve that — a curated star layout with category-clustered
 * branches (constellationLayout.ts), a real depth-first "neurons
 * connecting" construction (constellationReveal.ts), path-drawing edges
 * with perpetual traveling particles, layered bloom + a breathing pulse on
 * every node, tiered node sizing (primary/secondary/supporting), staged
 * label reveal, an ambient twinkling star field, a dependency-chain hover
 * highlight with a hover "lift," a click-to-focus camera, and a
 * dissolve-then-rebuild transition on project switch. Entirely data-driven
 * off ConstellationGraph — nothing here is Cortexa-specific; a different
 * project's manifest produces a different constellation with zero renderer
 * changes.
 */

// The right-edge panel (w-72 in the Tailwind scale = 18rem) is always
// present — either the Legend/Summary default or a node's detail — never
// hidden. Every centering calculation below must treat it as permanently
// occupying the container's right edge, or the constellation visually
// sits right-of-center in the space that's actually free to show it in.
const SIDEBAR_WIDTH = 288;
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
const FIT_PADDING_RATIO = 0.12;
const CLICK_DRAG_THRESHOLD = 4;
const STAR_COUNT = 70;

type VisualState = 'default' | 'active' | 'connected' | 'dimmed';

const NODE_OPACITY: Record<VisualState, number> = { default: 1, active: 1, connected: 1, dimmed: 0.15 };
const EDGE_OPACITY: Record<VisualState, number> = { default: 0.5, active: 0.5, connected: 0.6, dimmed: 0.08 };
const RING_OPACITY: Record<VisualState, number> = { default: 0.6, active: 1, connected: 0.9, dimmed: 0.4 };
const RING_WIDTH: Record<VisualState, number> = { default: 1.25, active: 2, connected: 1.6, dimmed: 1.25 };
const STATE_TRANSITION = { duration: 0.2, ease: 'easeInOut' as const };
// Tier-driven visual hierarchy — "the user should immediately understand
// what powers the project": primary (the center) reads clearly larger and
// brighter than secondary (each category's own anchor), which in turn
// reads larger than supporting technologies.
const RING_EXTRA: Record<ConstellationTier, number> = { primary: 18, secondary: 12, supporting: 8 };
const ICON_SIZE: Record<ConstellationTier, number> = { primary: 22, secondary: 16, supporting: 12 };
const TITLE_FONT: Record<ConstellationTier, number> = { primary: 13, secondary: 11.5, supporting: 10 };
const INSTANT_TRANSITION = { duration: 0 };
const FOCUS_TRANSITION = { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
const HEARTBEAT_MIN_S = 3.5;
const HEARTBEAT_MAX_S = 6;
const HEARTBEAT_DELAY_WINDOW_S = 6;
const DISSOLVE_DURATION_S = 0.6;

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

function jitter(seed: string, mod: number): number {
  return hashStringToIndex(seed, mod) / mod;
}

export function ManifestConstellation({ model, fileId }: { model: ManifestModel; fileId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [viewportTransition, setViewportTransition] = useState<
    { duration: number; ease?: [number, number, number, number] }
  >(INSTANT_TRANSITION);
  const panState = useRef<{ pointerId: number; startX: number; startY: number; lastX: number; lastY: number } | null>(
    null,
  );
  const hasInteractedRef = useRef(false);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const graph = useMemo(() => buildConstellationGraph(model), [model]);
  const layout = useMemo(() => layoutConstellation(graph), [graph]);
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

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

  const revealOrder = useMemo(() => buildConstellationRevealOrder(graph), [graph]);
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
  // 1-based rank among nodes only (skipping edge units) — the small
  // numbered badge on each star, matching the reference's construction-
  // order numbering.
  const nodeRankById = useMemo(() => {
    const map = new Map<string, number>();
    let rank = 0;
    for (const unit of revealOrder) {
      if (unit.type === 'node') map.set(unit.id, ++rank);
    }
    return map;
  }, [revealOrder]);

  // Keyed on fileId *and* project — a project switch must always replay
  // construction (the whole point of the dissolve-then-rebuild below),
  // never silently skip it the way reopening the same file/project does.
  const revealSequence = useFileRevealSequence({
    fileId: `${fileId}:${graph.project}`,
    unitCount: revealOrder.length,
    containerRef,
    enabled: revealOrder.length > 0,
  });

  useEffect(() => {
    setSelectedId(null);
    setHoveredId(null);
    hasInteractedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  const fitToScreen = () => {
    const container = containerRef.current;
    if (!container || layout.width === 0 || layout.height === 0) return;
    const visibleWidth = Math.max(container.clientWidth - SIDEBAR_WIDTH, 0);
    const availableWidth = visibleWidth * (1 - FIT_PADDING_RATIO * 2);
    const availableHeight = container.clientHeight * (1 - FIT_PADDING_RATIO * 2);
    const scale = Math.min(MAX_SCALE, availableWidth / layout.width, availableHeight / layout.height);
    // Layout positions are already shifted so (0,0)-(width,height) is the
    // bounding box — center that box within the visible (sidebar-free)
    // region, which starts at the container's own left edge.
    setViewportTransition(INSTANT_TRANSITION);
    setViewport({
      scale,
      x: (visibleWidth - layout.width * scale) / 2,
      y: (container.clientHeight - layout.height * scale) / 2,
    });
  };

  const fitToScreenManual = () => {
    hasInteractedRef.current = false;
    fitToScreen();
  };

  const resetView = () => {
    const container = containerRef.current;
    if (!container) return;
    hasInteractedRef.current = false;
    const visibleWidth = Math.max(container.clientWidth - SIDEBAR_WIDTH, 0);
    setViewportTransition(INSTANT_TRANSITION);
    setViewport({
      scale: 1,
      x: (visibleWidth - layout.width) / 2,
      y: (container.clientHeight - layout.height) / 2,
    });
  };

  const focusOnNode = (nodeId: string) => {
    const container = containerRef.current;
    const pos = layout.positions.get(nodeId);
    if (!container || !pos) return;
    hasInteractedRef.current = true;
    const visibleWidth = Math.max(container.clientWidth - SIDEBAR_WIDTH, 0);
    const scale = Math.max(viewport.scale, 1.15);
    setViewportTransition(FOCUS_TRANSITION);
    setViewport({
      scale,
      x: visibleWidth / 2 - pos.x * scale,
      y: container.clientHeight / 2 - pos.y * scale,
    });
  };

  useEffect(() => {
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (!hasInteractedRef.current) fitToScreen();
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
    setViewportTransition(INSTANT_TRANSITION);
    setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const pan = panState.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const movedDistance = Math.hypot(event.clientX - pan.startX, event.clientY - pan.startY);
    const clickedNode = (event.target as Element).closest('[data-constellation-node]');
    if (movedDistance < CLICK_DRAG_THRESHOLD && !clickedNode) {
      setSelectedId(null);
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
    setViewportTransition(INSTANT_TRANSITION);
    setViewport((v) => {
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * zoomFactor));
      const worldX = (cursorX - v.x) / v.scale;
      const worldY = (cursorY - v.y) / v.scale;
      return { scale: nextScale, x: cursorX - worldX * nextScale, y: cursorY - worldY * nextScale };
    });
  };

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

  const stateForId = (id: string): VisualState => {
    if (!activeId || !highlightSet) return 'default';
    if (id === activeId) return 'active';
    return highlightSet.has(id) ? 'connected' : 'dimmed';
  };

  const stateForEdge = (from: string, to: string): VisualState => {
    if (!activeId || !highlightSet) return 'default';
    if (from === activeId || to === activeId) return 'active';
    return highlightSet.has(from) && highlightSet.has(to) ? 'connected' : 'dimmed';
  };

  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => {
        // Roughly 1 in 8 stars reads as a brighter, more prominent
        // "feature" star — occasional variety in an otherwise uniform
        // field, echoing the reference's mix of tiny and larger points.
        const isBright = jitter(`star:${i}:bright`, 811) < 0.12;
        return {
          cx: `${jitter(`star:${i}:x`, 9973) * 100}%`,
          cy: `${jitter(`star:${i}:y`, 9967) * 100}%`,
          r: isBright ? 1.7 + jitter(`star:${i}:r`, 991) * 1.1 : 0.5 + jitter(`star:${i}:r`, 991) * 0.8,
          delay: jitter(`star:${i}:delay`, 977) * 7,
          duration: 3.5 + jitter(`star:${i}:dur`, 967) * 4.5,
          isBright,
        };
      }),
    [],
  );

  const selectedNode = selectedId ? nodeById.get(selectedId) : undefined;

  return (
    <div className="flex h-full w-full flex-col bg-[#020304]">
      <div className="flex items-start justify-between gap-4 border-b border-[#3c3c3c] bg-[#1e1e1e]/80 px-6 py-4 backdrop-blur-sm">
        <div className="min-w-0">
          <h1 className="flex items-baseline gap-1.5 text-[16px] font-semibold text-white">
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

      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden" tabIndex={-1} onKeyDown={handleKeyDown}>
        {graph.nodes.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-sm font-mono text-[#858585]">
            No technologies to display.
          </div>
        ) : (
          <>
            <svg
              className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
            >
              <defs>
                <style>
                  {`
                    @keyframes constellation-heartbeat { 0%, 100% { opacity: 0; transform: scale(0.94); } 50% { opacity: 0.5; transform: scale(1.06); } }
                    @keyframes constellation-twinkle { 0%, 100% { opacity: 0; } 50% { opacity: 0.55; } }
                  `}
                </style>
                <radialGradient id="constellation-space-bg" cx="50%" cy="34%" r="80%">
                  <stop offset="0%" stopColor="#0a0f16" />
                  <stop offset="60%" stopColor="#050708" />
                  <stop offset="100%" stopColor="#010102" />
                </radialGradient>
                <filter id="constellation-node-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="7" />
                </filter>
                <filter id="constellation-bloom-mid" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="11" />
                </filter>
                <filter id="constellation-edge-glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="2.5" />
                </filter>
              </defs>

              <rect x={0} y={0} width="100%" height="100%" fill="url(#constellation-space-bg)" />

              {/* Ambient star field — fixed to the viewport, not the
                  pan/zoom transform, so it reads as distant background
                  rather than part of the graph itself. */}
              {!reduceMotion && (
                <g aria-hidden="true">
                  {stars.map((star, i) => (
                    <g key={i}>
                      {star.isBright && (
                        <circle
                          cx={star.cx}
                          cy={star.cy}
                          r={star.r * 3.5}
                          fill="#ffffff"
                          opacity={0}
                          filter="url(#constellation-edge-glow)"
                          style={{
                            animation: `constellation-twinkle ${star.duration}s ease-in-out infinite`,
                            animationDelay: `${star.delay}s`,
                          }}
                        />
                      )}
                      <circle
                        cx={star.cx}
                        cy={star.cy}
                        r={star.r}
                        fill="#ffffff"
                        opacity={0}
                        style={{
                          animation: `constellation-twinkle ${star.duration}s ease-in-out infinite`,
                          animationDelay: `${star.delay}s`,
                        }}
                      />
                    </g>
                  ))}
                </g>
              )}

              <motion.g
                animate={{ x: viewport.x, y: viewport.y, scale: viewport.scale }}
                transition={viewportTransition}
              >
                <AnimatePresence mode="wait">
                  <motion.g
                    key={graph.project}
                    exit={
                      reduceMotion
                        ? undefined
                        : { opacity: 0, scale: 0.85, transition: { duration: DISSOLVE_DURATION_S, ease: 'easeIn' } }
                    }
                    style={{ transformOrigin: `${layout.width / 2}px ${layout.height / 2}px` }}
                  >
                    {graph.edges.map((edge) => {
                      const from = layout.positions.get(edge.from);
                      const to = layout.positions.get(edge.to);
                      if (!from || !to) return null;
                      const targetNode = nodeById.get(edge.to);
                      const color = targetNode?.color ?? '#5a5a5a';
                      const state = stateForEdge(edge.from, edge.to);
                      const edgeKeyStr = `${edge.from}->${edge.to}`;
                      const pathId = `constellation-edge-${edgeKeyStr}`;
                      // A gentle quadratic bow rather than a straight
                      // segment — reads as a hand-drawn constellation link.
                      // Deterministic per edge (hashed from its own key,
                      // never Math.random()) so the shape is stable across
                      // renders; the bow direction alternates so a cluster
                      // of edges doesn't all curve the same way.
                      const dx = to.x - from.x;
                      const dy = to.y - from.y;
                      const dist = Math.hypot(dx, dy) || 1;
                      const midX = (from.x + to.x) / 2;
                      const midY = (from.y + to.y) / 2;
                      const nx = -dy / dist;
                      const ny = dx / dist;
                      const curveSign = jitter(`${edgeKeyStr}:curve`, 5003) < 0.5 ? -1 : 1;
                      const curveMagnitude = dist * (0.05 + jitter(`${edgeKeyStr}:mag`, 4999) * 0.06);
                      const controlX = midX + nx * curveMagnitude * curveSign;
                      const controlY = midY + ny * curveMagnitude * curveSign;
                      const pathD = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
                      const unitIndex = unitIndexByEdgeKey.get(edgeKeyStr) ?? 0;
                      const edgeDelay = revealSequence.isComplete ? 0 : revealSequence.getUnitTransition(unitIndex).delay;
                      const edgeDuration = revealSequence.isComplete
                        ? 0.2
                        : revealSequence.getUnitTransition(unitIndex).duration;

                      return (
                        <g key={edgeKeyStr}>
                          {!reduceMotion && (
                            <motion.path
                              d={pathD}
                              stroke={color}
                              strokeWidth={5}
                              strokeLinecap="round"
                              filter="url(#constellation-edge-glow)"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: EDGE_OPACITY[state] * 0.8 }}
                              transition={{ duration: edgeDuration, delay: edgeDelay, ease: 'easeOut' }}
                            />
                          )}
                          <motion.path
                            id={pathId}
                            d={pathD}
                            stroke={color}
                            strokeWidth={1.4}
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: EDGE_OPACITY[state] }}
                            transition={{ duration: edgeDuration, delay: edgeDelay, ease: 'easeOut' }}
                          />
                          {!reduceMotion && !revealSequence.isComplete && (
                            <circle r={3} fill="#ffffff" opacity={0.9}>
                              <animateMotion
                                dur={`${edgeDuration}s`}
                                begin={`${edgeDelay}s`}
                                fill="freeze"
                                calcMode="linear"
                              >
                                <mpath href={`#${pathId}`} />
                              </animateMotion>
                            </circle>
                          )}
                          {!reduceMotion && (
                            <circle r={2} fill={color}>
                              <animateMotion
                                dur="3.6s"
                                begin={`${edgeDelay + edgeDuration + 0.15}s`}
                                repeatCount="indefinite"
                                calcMode="linear"
                              >
                                <mpath href={`#${pathId}`} />
                              </animateMotion>
                            </circle>
                          )}
                        </g>
                      );
                    })}

                    {graph.nodes.map((node) => {
                      const position = layout.positions.get(node.id);
                      if (!position) return null;
                      const isRoot = node.id === graph.rootId;
                      const radius = TIER_RADIUS[node.tier];
                      const ringExtra = RING_EXTRA[node.tier];
                      const iconSize = ICON_SIZE[node.tier];
                      const state = stateForId(node.id);
                      const unitIndex = unitIndexByNodeId.get(node.id) ?? 0;
                      const nodeDelay = revealSequence.isComplete ? 0 : revealSequence.getUnitTransition(unitIndex).delay;
                      const nodeDuration = revealSequence.isComplete
                        ? 0.2
                        : revealSequence.getUnitTransition(unitIndex).duration;
                      const logo = resolveTechLogo(node.technology);
                      const heartbeatDelayS = jitter(`${node.id}:hb-delay`, 4703) * HEARTBEAT_DELAY_WINDOW_S;
                      const heartbeatDurationS =
                        HEARTBEAT_MIN_S + jitter(`${node.id}:hb-dur`, 4691) * (HEARTBEAT_MAX_S - HEARTBEAT_MIN_S);
                      const isLast = unitIndex === revealOrder.length - 1;

                      const titleDelay = nodeDelay + nodeDuration + 0.05;
                      const subtitleDelay = titleDelay + 0.2;
                      const titleTransition = revealSequence.isComplete
                        ? STATE_TRANSITION
                        : { duration: 0.35, delay: titleDelay, ease: 'easeOut' as const };
                      const subtitleTransition = revealSequence.isComplete
                        ? STATE_TRANSITION
                        : { duration: 0.3, delay: subtitleDelay, ease: 'easeOut' as const };

                      return (
                        <motion.g
                          key={node.id}
                          transform={`translate(${position.x}, ${position.y})`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: NODE_OPACITY[state] }}
                          transition={{ duration: nodeDuration, delay: nodeDelay, ease: 'easeOut' }}
                          onAnimationComplete={isLast ? revealSequence.onLastUnitComplete : undefined}
                        >
                          <motion.g
                            initial={reduceMotion ? false : { scale: 0 }}
                            animate={{ scale: state === 'active' ? 1.1 : 1 }}
                            transition={
                              !revealSequence.isComplete
                                ? { type: 'spring' as const, bounce: 0.22, duration: 0.5, delay: nodeDelay }
                                : { type: 'spring' as const, stiffness: 320, damping: 18 }
                            }
                          >
                            {!reduceMotion && (
                              <>
                                <circle r={radius * 1.8} fill={node.color} opacity={0.12} filter="url(#constellation-bloom-mid)" />
                                <circle
                                  r={radius + ringExtra}
                                  fill="none"
                                  stroke={node.color}
                                  strokeWidth={isRoot ? 3 : 1.5}
                                  opacity={0}
                                  filter="url(#constellation-node-glow)"
                                  style={{
                                    animation: `constellation-heartbeat ${heartbeatDurationS}s ease-in-out infinite`,
                                    animationDelay: `${heartbeatDelayS}s`,
                                  }}
                                />
                              </>
                            )}
                            <circle r={radius} fill="#04060a" />
                            <circle r={radius} fill={node.color} opacity={0.18} />
                            <circle
                              r={radius}
                              fill="none"
                              stroke={node.color}
                              strokeOpacity={RING_OPACITY[state]}
                              strokeWidth={RING_WIDTH[state] + (isRoot ? 1 : 0)}
                            />
                            {isRoot && !reduceMotion && (
                              <>
                                <SparkleGlyph x={radius * 0.82} y={-radius * 0.88} size={7} color="#ffffff" />
                                <SparkleGlyph x={-radius * 1.02} y={radius * 0.5} size={4.5} color={node.color} />
                              </>
                            )}
                            <foreignObject x={-radius} y={-radius} width={radius * 2} height={radius * 2}>
                              <button
                                type="button"
                                data-constellation-node={node.id}
                                className="flex h-full w-full items-center justify-center focus:outline-none"
                                onMouseEnter={() => setHoveredId(node.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onFocus={() => setHoveredId(node.id)}
                                onBlur={() => setHoveredId(null)}
                                onClick={() => {
                                  setSelectedId(node.id);
                                  focusOnNode(node.id);
                                }}
                              >
                                {logo ? (
                                  <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill={logo.color} aria-hidden="true">
                                    <path d={logo.path} />
                                  </svg>
                                ) : (
                                  <Component size={iconSize * 0.8} color={node.color} />
                                )}
                              </button>
                            </foreignObject>
                          </motion.g>

                          {!reduceMotion && nodeRankById.has(node.id) && (
                            <g transform={`translate(${radius * 0.76}, ${-radius * 0.88})`}>
                              <circle r={8.5} fill="#0b0e14" stroke={node.color} strokeWidth={1.2} />
                              <text
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={8.5}
                                fontWeight={600}
                                fill={node.color}
                              >
                                {nodeRankById.get(node.id)}
                              </text>
                            </g>
                          )}

                          <motion.text
                            y={radius + 17}
                            textAnchor="middle"
                            fontSize={TITLE_FONT[node.tier]}
                            fontWeight={600}
                            fill="#f0f0f0"
                            initial={reduceMotion ? false : { opacity: 0 }}
                            animate={{ opacity: NODE_OPACITY[state] }}
                            transition={titleTransition}
                          >
                            {node.technology}
                          </motion.text>
                          <motion.text
                            y={radius + 31}
                            textAnchor="middle"
                            fontSize={9.5}
                            fill="#8a8f98"
                            initial={reduceMotion ? false : { opacity: 0 }}
                            animate={{ opacity: NODE_OPACITY[state] * 0.9 }}
                            transition={subtitleTransition}
                          >
                            {node.role}
                          </motion.text>
                        </motion.g>
                      );
                    })}
                  </motion.g>
                </AnimatePresence>
              </motion.g>
            </svg>

            <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded border border-[#3c3c3c] bg-[#252526]/80 p-0.5 text-[#cccccc] backdrop-blur-sm">
              <button type="button" onClick={fitToScreenManual} title="Fit to screen" className="rounded p-1.5 hover:bg-[#2d2d2d]">
                <Maximize size={13} />
              </button>
              <button type="button" onClick={resetView} title="Reset view" className="rounded p-1.5 hover:bg-[#2d2d2d]">
                <RotateCcw size={13} />
              </button>
            </div>

            <ConstellationSidePanel graph={graph} selectedNode={selectedNode} onClose={() => setSelectedId(null)} />
          </>
        )}
      </div>
    </div>
  );
}

/** A small 4-point sparkle accent — decorative flourish on the root node only, echoing the "igniting star" flavor from the reference. */
function SparkleGlyph({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const inner = size * 0.32;
  const d = `M 0,${-size} L ${inner},${-inner} L ${size},0 L ${inner},${inner} L 0,${size} L ${-inner},${inner} L ${-size},0 L ${-inner},${-inner} Z`;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path d={d} fill={color} opacity={0.85} />
    </g>
  );
}

function ConstellationSidePanel({
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
      <div className="absolute right-0 top-0 z-10 h-full w-72 overflow-y-auto border-l border-[#3c3c3c] bg-[#1e1e1e]/85 shadow-lg backdrop-blur-sm">
        <div className="sticky top-0 flex items-center gap-2 border-b border-[#3c3c3c] bg-[#1e1e1e]/85 px-3 py-2 backdrop-blur-sm">
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

  const technologyCount = graph.nodes.length;
  const connectionCount = graph.edges.length;
  const categoryCount = graph.categories.length;

  return (
    <div className="absolute right-0 top-0 z-10 h-full w-72 overflow-y-auto border-l border-[#3c3c3c] bg-[#1e1e1e]/85 shadow-lg backdrop-blur-sm">
      <div className="border-b border-[#3c3c3c] px-3 py-3">
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

      <div className="border-b border-[#3c3c3c] px-3 py-3">
        <div className="mb-2 text-[10px] uppercase tracking-wide text-[#858585]">Summary</div>
        <ul className="space-y-2">
          <SummaryRow icon={<Boxes size={13} />} value={technologyCount} label="Technologies" />
          <SummaryRow icon={<Waypoints size={13} />} value={connectionCount} label="Connections" />
          <SummaryRow icon={<LayoutGrid size={13} />} value={categoryCount} label="Categories" />
          <SummaryRow icon={<FolderGit2 size={13} />} value={1} label="Active Project" />
        </ul>
      </div>

      <div className="border-b border-[#3c3c3c] px-3 py-3">
        <div className="mb-2 text-[10px] uppercase tracking-wide text-[#858585]">Architecture Flow</div>
        <ul>
          {graph.categories.map((cat, index) => {
            const anchor = graph.nodes.find((n) => n.categoryIndex === index && n.tier !== 'supporting');
            return (
              <li key={cat.key}>
                <div className="flex items-center gap-2 text-[11px] text-[#cccccc]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.label}
                  {anchor && <span className="text-[#6b7280]">— {anchor.technology}</span>}
                </div>
                {index < graph.categories.length - 1 && (
                  <div className="pl-[3px] text-[#5a5a5a]">
                    <ChevronDown size={11} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-2 px-3 py-3 text-[10px] text-[#858585]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ec9b0] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ec9b0]" />
        </span>
        Data flows are animated
      </div>
    </div>
  );
}

function SummaryRow({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <li className="flex items-center gap-2 text-[11px] text-[#cccccc]">
      <span className="text-[#858585]">{icon}</span>
      <span className="font-semibold text-white">{value}</span>
      <span className="text-[#9d9d9d]">{label}</span>
    </li>
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
