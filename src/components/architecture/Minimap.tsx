import React from 'react';
import type { LayoutResult } from './layout';
import { NODE_WIDTH, NODE_HEIGHT } from './layout';

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 110;
const MINIMAP_PADDING = 8;

interface MinimapProps {
  layout: LayoutResult;
  viewport: { x: number; y: number; scale: number };
  containerWidth: number;
  containerHeight: number;
  /** World-space coordinates of the point the user clicked — the canvas recenters on it. */
  onNavigate: (worldX: number, worldY: number) => void;
}

/**
 * A small, corner-anchored graph overview with a click-to-recenter viewport
 * indicator — the same navigational-aid role VS Code's own text editor
 * minimap plays, not a decorative thumbnail. Purely a rendering of
 * layout/viewport state it's handed; it never computes layout itself.
 */
export function Minimap({ layout, viewport, containerWidth, containerHeight, onNavigate }: MinimapProps) {
  if (layout.width === 0 || layout.height === 0) return null;

  const scale = Math.min(
    (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / layout.width,
    (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / layout.height,
  );
  const offsetX = (MINIMAP_WIDTH - layout.width * scale) / 2;
  const offsetY = (MINIMAP_HEIGHT - layout.height * scale) / 2;

  const worldX0 = -viewport.x / viewport.scale;
  const worldY0 = -viewport.y / viewport.scale;
  const worldX1 = (containerWidth - viewport.x) / viewport.scale;
  const worldY1 = (containerHeight - viewport.y) / viewport.scale;

  const indicator = {
    x: offsetX + worldX0 * scale,
    y: offsetY + worldY0 * scale,
    width: (worldX1 - worldX0) * scale,
    height: (worldY1 - worldY0) * scale,
  };

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    onNavigate((clickX - offsetX) / scale, (clickY - offsetY) / scale);
  };

  return (
    <svg
      width={MINIMAP_WIDTH}
      height={MINIMAP_HEIGHT}
      onClick={handleClick}
      className="cursor-pointer rounded border border-[#3c3c3c] bg-[#1e1e1e]"
      role="img"
      aria-label="Architecture overview"
    >
      {[...layout.positions.values()].map((position, index) => (
        <rect
          key={index}
          x={offsetX + position.x * scale}
          y={offsetY + position.y * scale}
          width={Math.max(2, NODE_WIDTH * scale)}
          height={Math.max(2, NODE_HEIGHT * scale)}
          rx={1}
          fill="#569cd6"
          opacity={0.55}
        />
      ))}
      <rect
        x={indicator.x}
        y={indicator.y}
        width={indicator.width}
        height={indicator.height}
        fill="rgba(255,255,255,0.08)"
        stroke="#cccccc"
        strokeWidth={1}
      />
    </svg>
  );
}
