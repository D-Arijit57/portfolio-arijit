import React, { useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';

interface ResizeHandleProps {
  /** 'horizontal' drags left/right (a vertical divider bar); 'vertical' drags up/down (a horizontal divider bar). */
  direction: 'horizontal' | 'vertical';
  /** Called with the pointer's movement delta (px) since the last event. */
  onResize: (deltaPx: number) => void;
  className?: string;
}

/**
 * WA-06: one reusable drag-divider primitive, shared by the Explorer/editor
 * boundary, the split-editor divider, and the Terminal's top edge — the
 * only new UI primitive this sprint introduces. Reports raw pointer delta
 * only; clamping and what the delta means (width vs height, ratio vs px)
 * stays with each caller, which already owns that layout's constraints.
 */
export function ResizeHandle({ direction, onResize, className }: ResizeHandleProps) {
  const draggingRef = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!draggingRef.current) return;
        const delta = direction === 'horizontal' ? moveEvent.movementX : moveEvent.movementY;
        if (delta !== 0) onResize(delta);
      };

      const stopDragging = () => {
        draggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', stopDragging);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopDragging);
    },
    [direction, onResize]
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      role="separator"
      aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
      className={cn(
        'shrink-0 group relative z-10',
        direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
        className
      )}
    >
      <div
        className={cn(
          'absolute bg-transparent group-hover:bg-[#007acc] transition-colors',
          direction === 'horizontal' ? 'inset-y-0 -left-[1px] -right-[1px]' : 'inset-x-0 -top-[1px] -bottom-[1px]'
        )}
      />
    </div>
  );
}
