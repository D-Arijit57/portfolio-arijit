import React, { useEffect, useRef, useState } from 'react';
import { getFileById } from '../../content/fileSystem';
import { cn } from '../../lib/utils';
import { ResizeHandle } from '../shared/ResizeHandle';
import { workHistory } from '../../content/workHistory';
import { CareerRoadmap } from '../experience/CareerRoadmap';
import { WorkHistoryYamlBlock } from '../experience/WorkHistoryYamlBlock';

// WA-09: below this container width (not viewport width — this is what
// actually narrows inside a split pane) the two columns stack vertically
// instead of squeezing side-by-side into unreadable slivers.
const STACK_BREAKPOINT_PX = 640;

// Sprint 10C: minimum width (px) either side of the internal divider may be
// dragged to — mirrors the same min-pane-width guarantee setSplitRatio()
// gives the main editor's split.
const MIN_PANEL_PX = 240;

export function WorkHistoryViewer() {
  const file = getFileById('work_history');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  // Sprint 10C: draggable divider ratio (0-1, fraction given to the code
  // panel). Component-local — this viewer's internal layout doesn't need to
  // persist beyond its own mount, unlike the store-owned splitRatio which
  // spans the whole workspace.
  const [ratio, setRatio] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(width > 0 && width < STACK_BREAKPOINT_PX);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sprint 10C: same delta-to-ratio conversion setSplitRatio() uses for the
  // main editor — clamp so neither side can be dragged below MIN_PANEL_PX.
  const handleResize = (deltaPx: number) => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 0;
    if (containerWidth <= 0) return;
    const minRatio = Math.min(0.4, MIN_PANEL_PX / containerWidth);
    setRatio((prev) => {
      const next = prev + deltaPx / containerWidth;
      return Math.min(1 - minRatio, Math.max(minRatio, next));
    });
  };

  return (
    <div ref={containerRef} className={cn('flex h-full w-full min-h-0', isNarrow && 'flex-col')}>
      <div
        style={isNarrow ? undefined : { width: `${ratio * 100}%` }}
        className={cn(
          'overflow-y-auto overflow-x-hidden bg-[#1e1e1e] p-4 border-[#333333] relative min-w-0 min-h-0',
          isNarrow ? 'w-full h-1/2 border-b' : 'shrink-0 border-r'
        )}
      >
        {file && (
          <div className="pointer-events-none">
            <WorkHistoryYamlBlock
              code={file.content}
              lang={file.type === 'typescript' ? 'ts' : file.type}
            />
          </div>
        )}
      </div>

      {!isNarrow && <ResizeHandle direction="horizontal" onResize={handleResize} />}

      <div
        className={cn(
          'bg-[#252526] p-8 overflow-y-auto min-w-0 min-h-0',
          isNarrow ? 'w-full h-1/2' : 'flex-1'
        )}
      >
        <CareerRoadmap experiences={workHistory} />
      </div>
    </div>
  );
}
