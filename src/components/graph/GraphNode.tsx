import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Point, PositionedNode } from '../../graph/layout/types';
import type { GraphVisualState } from '../../hooks/useGraphInteraction';
import { useGraphMotionTiming } from '../../hooks/useGraphMotion';
import { NODE_RADIUS, ROOT_FILL, categoryColorForNode } from './graphVisuals';

/**
 * A single node — root, category, or technology. Position is owned
 * entirely by `useGraphSimulation`'s continuous physics loop: this
 * component's OWN root `<g>` starts at the Layout Engine's static anchor
 * (`node.x`/`node.y`, for a correct first paint before the simulation's
 * first tick) and is handed to the caller via `nodeRef` — every frame
 * after that, the simulation writes a fresh `transform` attribute onto
 * that exact DOM node directly, bypassing React entirely. This component
 * never re-renders for ordinary ambient motion or dragging; it only
 * re-renders for discrete state changes (hover/select/reduced-motion).
 *
 * Two remaining motion layers nest outermost-to-innermost inside that
 * simulation-driven root:
 *
 *   (simulation writes transform directly to the ref'd <g>)
 *     -> CSS keyframe: breathing        <- ambient scale, deterministic per id, cosmetic only
 *       -> CSS transition: hover grow (~8%)
 *         -> soft shadow / filled circle / brighten overlay (label stays OUTSIDE the scaled group)
 *
 * Visual language (approved reference, Obsidian-inspired): flat,
 * moderately-saturated category-colored filled circles with a subtle
 * dark outline and a restrained blurred-disc shadow — matte, not glowy;
 * no per-technology logos. Color, size, and hierarchy alone communicate
 * identity.
 *
 * Scale lives entirely in plain CSS (`transform-box: fill-box` +
 * `transform-origin: center`) — ConstellationScene's own comment
 * documents a real Motion+SVG bug where animating `scale` resolves
 * `transform-origin` to the element's content bounding box instead of a
 * specified origin, which would visibly throw off a symmetric circle's
 * hover-grow. Nothing here needs Motion any more: the simulation's own
 * spring integration replaces what the old Motion-driven drag offset did.
 */
export interface GraphNodeProps {
  node: PositionedNode;
  nodeRef: (el: SVGGElement | null) => void;
  labelDirection: Point;
  visualState: GraphVisualState;
  isSelected: boolean;
  isDragging: boolean;
  reduceMotion: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onDragStart: (point: Point, event: ReactPointerEvent<SVGGElement>) => void;
}

const OUTLINE_COLOR = '#0b0d10';
const LABEL_GAP = 8;

const NODE_OPACITY: Record<GraphVisualState, number> = { default: 1, active: 1, connected: 1, dimmed: 0.55 };
const HOVER_SCALE: Record<GraphVisualState, number> = { default: 1, active: 1.08, connected: 1, dimmed: 1 };
// Restrained, blurred-disc shadow behind the node — a soft ambient bleed,
// not a stroked halo ring. Kept deliberately faint (matte, "minimal
// bloom/glow" per the approved reference) — category nodes carry only a
// touch more presence than leaves since they're the graph's visual hubs;
// root gets its own (colorless) record below.
const CATEGORY_SHADOW_OPACITY: Record<GraphVisualState, number> = { default: 0.08, active: 0.22, connected: 0.13, dimmed: 0.03 };
const LEAF_SHADOW_OPACITY: Record<GraphVisualState, number> = { default: 0.04, active: 0.14, connected: 0.07, dimmed: 0.02 };
const ROOT_SHADOW_OPACITY: Record<GraphVisualState, number> = { default: 0.05, active: 0.16, connected: 0.09, dimmed: 0.02 };
// A `mix-blend-mode: screen` white overlay — "brighten node" on hover
// without washing the fill out to flat white the way a plain alpha
// overlay would. Toned down alongside the shadow opacities above.
const BRIGHTEN_OPACITY: Record<GraphVisualState, number> = { default: 0, active: 0.14, connected: 0.05, dimmed: 0 };

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

export function GraphNode({
  node,
  nodeRef,
  labelDirection,
  visualState,
  isSelected,
  isDragging,
  reduceMotion,
  onHoverStart,
  onHoverEnd,
  onDragStart,
}: GraphNodeProps) {
  const radius = NODE_RADIUS[node.kind];
  const timing = useGraphMotionTiming(node.id);

  const handlePointerDown = (event: ReactPointerEvent<SVGGElement>) => {
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    onDragStart({ x: event.clientX, y: event.clientY }, event);
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

  const hoverScaleStyle: React.CSSProperties = {
    transformBox: 'fill-box',
    transformOrigin: 'center',
    transform: `scale(${HOVER_SCALE[visualState]})`,
    transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  if (node.kind === 'root') {
    const shadowOpacity = ROOT_SHADOW_OPACITY[visualState];
    const brightenOpacity = BRIGHTEN_OPACITY[visualState];
    const label = placeLabel(radius, labelDirection);
    return (
      <g
        ref={nodeRef}
        transform={`translate(${node.x}, ${node.y})`}
        data-graph-node={node.id}
        onPointerDown={handlePointerDown}
        onPointerEnter={onHoverStart}
        onPointerLeave={onHoverEnd}
      >
        <g style={breatheStyle}>
          <g style={{ opacity: NODE_OPACITY[visualState], transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <g style={hoverScaleStyle}>
              <circle
                r={radius * 1.25}
                fill={ROOT_FILL}
                filter="url(#graph-soft-glow)"
                style={{ opacity: shadowOpacity, transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
              <circle r={radius} fill={ROOT_FILL} stroke={OUTLINE_COLOR} strokeOpacity={0.45} strokeWidth={1.5} />
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
    );
  }

  const color = categoryColorForNode(node) ?? '#8a8f98';
  const label = placeLabel(radius, labelDirection);
  const shadowOpacity = (node.kind === 'category' ? CATEGORY_SHADOW_OPACITY : LEAF_SHADOW_OPACITY)[visualState];
  const brightenOpacity = BRIGHTEN_OPACITY[visualState];

  return (
    <g
      ref={nodeRef}
      transform={`translate(${node.x}, ${node.y})`}
      data-graph-node={node.id}
      onPointerDown={handlePointerDown}
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
    >
      <g style={breatheStyle}>
        <g style={{ opacity: NODE_OPACITY[visualState], transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <g style={hoverScaleStyle}>
            <circle
              r={radius * (node.kind === 'category' ? 1.2 : 1.35)}
              fill={color}
              filter="url(#graph-soft-glow)"
              style={{ opacity: shadowOpacity, transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
            <circle r={radius} fill={color} stroke={OUTLINE_COLOR} strokeOpacity={0.45} strokeWidth={1.25} />
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
  );
}
