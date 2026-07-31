import type { PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'motion/react';
import type { Point, PositionedNode } from '../../graph/layout/types';
import { resolveTechLogo } from '../../documentation/techLogos';
import type { GraphVisualState } from '../../hooks/useGraphInteraction';
import { useGraphMotionTiming } from '../../hooks/useGraphMotion';
import { NODE_RADIUS, categoryColorForNode } from './graphVisuals';

/**
 * A single node — root, category, or technology — rendered purely from
 * `PositionedGraph`'s own `{x, y}`. This component never computes a
 * position, never mutates the node, and knows nothing about how the
 * coordinate was produced. Milestone 5 adds four independent motion
 * layers on top of the frozen Milestone 4 visual design, nested
 * outermost-to-innermost so each owns exactly one transform and none
 * fight each other:
 *
 *   translate(layout x,y)              <- static, from PositionedGraph
 *     -> Motion: drag offset (x, y)    <- spring on release, 1:1 while dragging
 *       -> CSS keyframe: idle float    <- ambient, deterministic per id
 *         -> CSS keyframe: breathing   <- ambient scale, deterministic per id
 *           -> CSS transition: hover grow (~8%)
 *             -> circle / glow / icon (label stays OUTSIDE the scaled group)
 *
 * Scale lives entirely in plain CSS (`transform-box: fill-box` +
 * `transform-origin: center`), not Motion — ConstellationScene's own
 * comment documents a real Motion+SVG bug where animating `scale`
 * resolves `transform-origin` to the element's content bounding box
 * instead of a specified origin, which would visibly throw off a
 * symmetric circle's hover-grow. Motion is used only for the one thing
 * it's actually needed for here: the drag offset's spring-back, which is
 * pure translation (origin-independent, so that bug can't apply) and
 * benefits from real spring physics a CSS transition can't provide.
 */
export interface GraphNodeProps {
  node: PositionedNode;
  labelDirection: Point;
  visualState: GraphVisualState;
  isSelected: boolean;
  dragOffset: Point;
  isDragging: boolean;
  reduceMotion: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onDragStart: (point: Point, event: ReactPointerEvent<SVGGElement>) => void;
}

const NODE_FILL = '#14161a';
const LABEL_GAP = 8;

const NODE_OPACITY: Record<GraphVisualState, number> = { default: 1, active: 1, connected: 1, dimmed: 0.55 };
const HOVER_SCALE: Record<GraphVisualState, number> = { default: 1, active: 1.08, connected: 1, dimmed: 1 };
const CATEGORY_GLOW_OPACITY: Record<GraphVisualState, number> = { default: 0.35, active: 0.6, connected: 0.45, dimmed: 0.18 };
const LEAF_GLOW_OPACITY: Record<GraphVisualState, number> = { default: 0, active: 0.45, connected: 0.22, dimmed: 0 };
const STATE_TRANSITION = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };
const DRAG_TRANSITION = { duration: 0 };
const SPRING_BACK_TRANSITION = { type: 'spring' as const, stiffness: 300, damping: 22 };

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
  labelDirection,
  visualState,
  isSelected,
  dragOffset,
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

  const floatStyle = reduceMotion
    ? undefined
    : ({
        transformBox: 'fill-box',
        transformOrigin: 'center',
        animation: `graph-node-float ${timing.floatDurationS}s ease-in-out infinite`,
        animationDelay: `${timing.floatDelayS}s`,
        '--float-x1': `${timing.floatWaypoints[0].x}px`,
        '--float-y1': `${timing.floatWaypoints[0].y}px`,
        '--float-x2': `${timing.floatWaypoints[1].x}px`,
        '--float-y2': `${timing.floatWaypoints[1].y}px`,
        '--float-x3': `${timing.floatWaypoints[2].x}px`,
        '--float-y3': `${timing.floatWaypoints[2].y}px`,
      } as React.CSSProperties);

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
    return (
      <g transform={`translate(${node.x}, ${node.y})`} data-graph-node={node.id}>
        <motion.g
          animate={{ x: dragOffset.x, y: dragOffset.y }}
          transition={isDragging ? DRAG_TRANSITION : SPRING_BACK_TRANSITION}
          onPointerDown={handlePointerDown}
        >
          <g style={floatStyle}>
            <g style={breatheStyle}>
              <g style={hoverScaleStyle}>
                <circle r={radius + 7} fill="none" stroke="#ffffff" strokeOpacity={0.16} strokeWidth={1} />
                <circle r={radius} fill={NODE_FILL} stroke="#eaeaea" strokeWidth={2} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill="#ffffff">
                  {node.label}
                </text>
              </g>
            </g>
          </g>
        </motion.g>
      </g>
    );
  }

  const color = categoryColorForNode(node) ?? '#8a8f98';
  const label = placeLabel(radius, labelDirection);
  const glowOpacity = (node.kind === 'category' ? CATEGORY_GLOW_OPACITY : LEAF_GLOW_OPACITY)[visualState];

  return (
    <g transform={`translate(${node.x}, ${node.y})`} data-graph-node={node.id}>
      <motion.g
        animate={{ x: dragOffset.x, y: dragOffset.y }}
        transition={isDragging ? DRAG_TRANSITION : SPRING_BACK_TRANSITION}
        onPointerDown={handlePointerDown}
        onPointerEnter={onHoverStart}
        onPointerLeave={onHoverEnd}
      >
        <g style={floatStyle}>
          <g style={breatheStyle}>
            <motion.g animate={{ opacity: NODE_OPACITY[visualState] }} transition={STATE_TRANSITION}>
              <g style={hoverScaleStyle}>
                {glowOpacity > 0 && (
                  <circle
                    r={radius + (node.kind === 'category' ? 4 : 5)}
                    fill="none"
                    stroke={color}
                    strokeOpacity={glowOpacity}
                    strokeWidth={node.kind === 'category' ? 4 : 3}
                    filter="url(#graph-soft-glow)"
                    style={{ transition: 'stroke-opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                )}
                <circle
                  r={radius}
                  fill={NODE_FILL}
                  stroke={color}
                  strokeOpacity={node.kind === 'leaf' ? 0.8 : 1}
                  strokeWidth={node.kind === 'category' ? 2 : 1.25}
                />
                {isSelected && (
                  <circle r={radius + 3} fill="none" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1} />
                )}
                {node.kind === 'leaf' &&
                  (() => {
                    const logo = resolveTechLogo(node.source.name);
                    if (!logo) return null;
                    const iconSize = radius * 1.15;
                    return (
                      <svg x={-iconSize / 2} y={-iconSize / 2} width={iconSize} height={iconSize} viewBox="0 0 24 24" aria-hidden="true">
                        <path d={logo.path} fill={logo.color} />
                      </svg>
                    );
                  })()}
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
            </motion.g>
          </g>
        </g>
      </motion.g>
    </g>
  );
}
