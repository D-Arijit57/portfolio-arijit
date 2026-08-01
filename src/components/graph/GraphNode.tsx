import type { FocusEvent as ReactFocusEvent, PointerEvent as ReactPointerEvent } from 'react';
import { memo } from 'react';
import type { NodeCursor, NodeVisualState } from '../../graph/interaction/types';
import type { Point, PositionedNode } from '../../graph/layout/types';
import { useGraphMotionTiming } from '../../hooks/useGraphMotion';
import { NODE_RADIUS, ROOT_FILL, categoryColorForNode } from './graphVisuals';

/**
 * A single node — root, category, or technology. Position is owned
 * entirely by `useGraphSimulation`'s continuous physics loop: this
 * component's OWN root `<g>` starts at the Layout Engine's static anchor
 * (`node.x`/`node.y`, for a correct first paint before the simulation's
 * first tick) and is handed to the caller via `nodeRef` — every frame
 * after that, the simulation writes a fresh `transform` attribute onto
 * that exact DOM node directly, bypassing React entirely.
 *
 * Visual STATE (hover/select/related/dimmed) is entirely resolved
 * upstream by the Interaction Resolver (`graph/interaction/
 * interactionResolver.ts`, via `useGraphInteraction`) — this component
 * never asks "is search active" or "is hover active," it only ever reads
 * a single `visualState` verdict and renders it. Wrapped in `React.memo`
 * so a hover/focus/selection change elsewhere in the graph only
 * re-renders the (typically few) nodes whose OWN resolved state actually
 * changed, not all ~44 — `nodeRef`/`onHoverStart`/etc. are all cached
 * per-node-id closures from `useGraphInteraction`/`useGraphSimulation`
 * specifically so this memoization isn't defeated by a fresh function
 * identity every render.
 *
 * Two remaining motion layers nest outermost-to-innermost inside the
 * simulation-driven root:
 *
 *   (simulation writes transform directly to the ref'd <g>)
 *     -> CSS keyframe: breathing        <- ambient scale, deterministic per id, cosmetic only
 *       -> CSS transition: emphasis grow (~8% on hover/focus)
 *         -> soft shadow / filled circle / brighten overlay (label stays OUTSIDE the scaled group)
 *
 * Visual language (frozen baseline, Obsidian-inspired): flat,
 * moderately-saturated category-colored filled circles with a subtle
 * dark outline and a restrained blurred-disc shadow — matte, not glowy;
 * no per-technology logos. Nothing about color/size/spacing changes in
 * this milestone — only the state VOCABULARY driving opacity/scale/glow
 * intensity was retuned (6 states, ~100/65/35 opacity tiers instead of
 * the old 4-state/2-tier system) per explicit instruction.
 */
export interface GraphNodeProps {
  node: PositionedNode;
  nodeRef: (el: SVGGElement | null) => void;
  labelDirection: Point;
  visualState: NodeVisualState;
  /** True only when hover/focus is landing on the already-selected node itself — see `interactionResolver.ts`'s `isPointerOnSelected`. Adds a tiny extra scale nudge on top of `selected`'s own baseline; never a competing state. */
  isPointerOnSelected: boolean;
  isDragging: boolean;
  cursor: NodeCursor;
  reduceMotion: boolean;
  /**
   * Milliseconds into the construction animation at which this node grows
   * in, or `null` to skip the reveal entirely (reduced motion). Consumed
   * purely as a CSS `animation-delay`, so the whole staggered construction
   * runs on the compositor with no timers and no React involvement.
   */
  revealDelayMs: number | null;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onFocus: () => void;
  onBlur: () => void;
  /** Same signature as `useGraphSimulation`'s own `beginDrag` — passed straight through by the scene (`onDragStart={simulation.beginDrag}`), no per-node wrapper needed, so this stays a stable reference for `React.memo`. */
  onDragStart: (nodeId: string, point: Point) => void;
}

const OUTLINE_COLOR = '#0b0d10';
const LABEL_GAP = 8;

// Target ratios per the approved brief: ~100% active / ~65% related /
// ~35% dimmed — a genuinely 3-tier readable system, replacing the old
// 4-state design's effectively-2-tier opacity (every "connected" node
// stayed at full opacity; only "dimmed" dropped, to 0.55).
const NODE_OPACITY: Record<NodeVisualState, number> = { default: 1, hovered: 1, selected: 1, related: 0.65, dimmed: 0.35, hidden: 0 };
const EMPHASIS_SCALE: Record<NodeVisualState, number> = { default: 1, hovered: 1.08, selected: 1, related: 1, dimmed: 1, hidden: 1 };
// A hovered-selected node gets a small EXTRA nudge on top of `selected`'s
// own (unbumped) baseline scale — "hover contributes: cursor, tiny scale
// adjustment" while selection styling otherwise stays fully dominant.
const POINTER_ON_SELECTED_SCALE_BONUS = 1.03;

// Restrained, blurred-disc shadow behind the node — a soft ambient bleed,
// not a stroked halo ring. Numerically identical to the frozen visual
// baseline's old active/connected/dimmed values, just relabeled onto the
// new state names (hovered and selected share the old "active" figure;
// related reuses "connected"; dimmed/default unchanged) — a rename, not a
// redesign, per the explicit freeze on visual styling this milestone.
// Reduced roughly a third from the Milestone 8 figures, alongside a
// tighter blur radius and smaller shadow discs — "reduce the bloom,
// prefer subtle ambient shadows over obvious glow." The intent is a node
// that reads as sitting slightly above the canvas, not one that emits
// light.
const CATEGORY_SHADOW_OPACITY: Record<NodeVisualState, number> = { default: 0.05, hovered: 0.15, selected: 0.15, related: 0.08, dimmed: 0.02, hidden: 0 };
const LEAF_SHADOW_OPACITY: Record<NodeVisualState, number> = { default: 0.025, hovered: 0.1, selected: 0.1, related: 0.045, dimmed: 0.012, hidden: 0 };
const ROOT_SHADOW_OPACITY: Record<NodeVisualState, number> = { default: 0.03, hovered: 0.11, selected: 0.11, related: 0.055, dimmed: 0.012, hidden: 0 };
// A `mix-blend-mode: screen` white overlay — "brighten fill" on hover
// without washing the fill out to flat white the way a plain alpha
// overlay would.
const BRIGHTEN_OPACITY: Record<NodeVisualState, number> = { default: 0, hovered: 0.14, selected: 0.14, related: 0.05, dimmed: 0, hidden: 0 };

/** Places a label along `direction` from the node's own origin, picking a horizontal anchor (and re-centering when the direction is mostly vertical) so text never defaults to a single fixed side regardless of where it actually has room. */
function placeLabel(radius: number, direction: Point) {
  const length = Math.hypot(direction.x, direction.y);
  const unit = length > 1e-6 ? { x: direction.x / length, y: direction.y / length } : { x: 0, y: -1 };
  const distance = radius + LABEL_GAP;
  const x = unit.x * distance;
  const y = unit.y * distance;
  const anchor: 'start' | 'middle' | 'end' = Math.abs(unit.x) < 0.35 ? 'middle' : unit.x > 0 ? 'start' : 'end';
  return { x, y, anchor };
}

function GraphNodeImpl({
  node,
  nodeRef,
  labelDirection,
  visualState,
  isPointerOnSelected,
  isDragging,
  cursor,
  reduceMotion,
  revealDelayMs,
  onHoverStart,
  onHoverEnd,
  onFocus,
  onBlur,
  onDragStart,
}: GraphNodeProps) {
  const radius = NODE_RADIUS[node.kind];
  const timing = useGraphMotionTiming(node.id);
  const isSelected = visualState === 'selected';
  const isHidden = visualState === 'hidden';

  const handlePointerDown = (event: ReactPointerEvent<SVGGElement>) => {
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    onDragStart(node.id, { x: event.clientX, y: event.clientY });
  };

  // Keyboard focus is wired identically to hover — "focus should produce
  // the same interaction state as hover." The browser's own default focus
  // outline is suppressed since the resolved visual state (brighten/
  // scale/opacity) IS the focus indicator here, not a native rectangle.
  const handleFocus = (event: ReactFocusEvent<SVGGElement>) => {
    event.stopPropagation();
    onFocus();
  };

  const breatheStyle = reduceMotion
    ? undefined
    : ({
        transformBox: 'fill-box',
        transformOrigin: 'center',
        animation: `graph-node-breathe ${timing.breatheDurationS}s ease-in-out infinite`,
        animationDelay: `${timing.breatheDelayS}s`,
        '--breathe-scale': timing.breathePeakScale,
      } as React.CSSProperties);

  // The construction reveal is split across two elements on purpose. The
  // fade covers the whole node INCLUDING its label; the scale pop is
  // applied only to the circle stack, because scaling a group that also
  // contains an offset text label would scale about the combined bounding
  // box and visibly slide the node sideways as it grows.
  const revealFadeStyle: React.CSSProperties | undefined =
    revealDelayMs === null ? undefined : { animation: `graph-node-fade-in 400ms ease-out ${revealDelayMs}ms both` };
  const revealPopStyle: React.CSSProperties | undefined =
    revealDelayMs === null
      ? undefined
      : {
          transformBox: 'fill-box',
          transformOrigin: 'center',
          animation: `graph-node-pop 400ms cubic-bezier(0.22, 1, 0.36, 1) ${revealDelayMs}ms both`,
        };

  const emphasisScale = EMPHASIS_SCALE[visualState] * (isPointerOnSelected ? POINTER_ON_SELECTED_SCALE_BONUS : 1);
  const emphasisStyle: React.CSSProperties = {
    transformBox: 'fill-box',
    transformOrigin: 'center',
    transform: `scale(${emphasisScale})`,
    transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
    cursor,
  };

  const outerProps = {
    ref: nodeRef,
    transform: `translate(${node.x}, ${node.y})`,
    'data-graph-node': node.id,
    tabIndex: isHidden ? -1 : 0,
    role: 'button' as const,
    'aria-label': node.label,
    'aria-pressed': isSelected,
    style: { outline: 'none', pointerEvents: isHidden ? ('none' as const) : undefined },
    onPointerDown: isHidden ? undefined : handlePointerDown,
    onPointerEnter: isHidden ? undefined : onHoverStart,
    onPointerLeave: isHidden ? undefined : onHoverEnd,
    onFocus: isHidden ? undefined : handleFocus,
    onBlur: isHidden ? undefined : onBlur,
  };

  if (node.kind === 'root') {
    const shadowOpacity = ROOT_SHADOW_OPACITY[visualState];
    const brightenOpacity = BRIGHTEN_OPACITY[visualState];
    const label = placeLabel(radius, labelDirection);
    return (
      <g {...outerProps}>
        <g style={revealFadeStyle}>
          <g style={breatheStyle}>
            <g style={{ opacity: NODE_OPACITY[visualState], transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <g style={revealPopStyle}>
                <g style={emphasisStyle}>
                  <circle
                    r={radius * 1.2}
                    fill={ROOT_FILL}
                    filter="url(#graph-soft-glow)"
                    style={{ opacity: shadowOpacity, transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                  <circle r={radius} fill={ROOT_FILL} stroke={OUTLINE_COLOR} strokeOpacity={0.5} strokeWidth={1.5} />
                  <circle
                    r={radius}
                    fill="#ffffff"
                    style={{
                      opacity: brightenOpacity,
                      mixBlendMode: 'screen',
                      transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                  {isSelected && <circle r={radius + 4} fill="none" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1} />}
                </g>
              </g>
              <text
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={700}
                fill="#f2f2f2"
              >
                {node.label}
              </text>
            </g>
          </g>
        </g>
      </g>
    );
  }

  const color = categoryColorForNode(node) ?? '#8a8f98';
  const label = placeLabel(radius, labelDirection);
  const shadowOpacity = (node.kind === 'category' ? CATEGORY_SHADOW_OPACITY : LEAF_SHADOW_OPACITY)[visualState];
  const brightenOpacity = BRIGHTEN_OPACITY[visualState];

  return (
    <g {...outerProps}>
      <g style={revealFadeStyle}>
        <g style={breatheStyle}>
          <g style={{ opacity: NODE_OPACITY[visualState], transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <g style={revealPopStyle}>
              <g style={emphasisStyle}>
                <circle
                  r={radius * (node.kind === 'category' ? 1.15 : 1.25)}
                  fill={color}
                  filter="url(#graph-soft-glow)"
                  style={{ opacity: shadowOpacity, transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
                <circle r={radius} fill={color} stroke={OUTLINE_COLOR} strokeOpacity={0.5} strokeWidth={1.25} />
                <circle
                  r={radius}
                  fill="#ffffff"
                  style={{
                    opacity: brightenOpacity,
                    mixBlendMode: 'screen',
                    transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
                {isSelected && <circle r={radius + 3} fill="none" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1} />}
              </g>
            </g>
            <text
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              dominantBaseline="middle"
              fontSize={node.kind === 'category' ? 12.5 : 10.5}
              fontWeight={node.kind === 'category' ? 700 : 400}
              fill={node.kind === 'category' ? '#f2f2f2' : '#c9c9c9'}
            >
              {node.label}
            </text>
          </g>
        </g>
      </g>
    </g>
  );
}

export const GraphNode = memo(GraphNodeImpl);
