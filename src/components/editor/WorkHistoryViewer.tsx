import React, { useEffect, useRef, useState } from 'react';
import { getFileById } from '../../content/fileSystem';
import { cn } from '../../lib/utils';
import { workHistory } from '../../content/workHistory';
import { CareerRoadmap } from '../experience/CareerRoadmap';
import { WorkHistoryYamlBlock } from '../experience/WorkHistoryYamlBlock';

// WA-09: below this container width (not viewport width — this is what
// actually narrows inside a split pane) the two columns stack vertically
// instead of squeezing side-by-side into unreadable slivers.
const STACK_BREAKPOINT_PX = 640;

export function WorkHistoryViewer() {
  const file = getFileById('work_history');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

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

  return (
    <div ref={containerRef} className={cn('flex h-full w-full min-h-0', isNarrow && 'flex-col')}>
      <div
        className={cn(
          'no-scrollbar overflow-y-auto overflow-x-hidden bg-[#1e1e1e] p-4 border-[#333333] relative min-w-0 min-h-0',
          isNarrow ? 'w-full h-1/2 border-b' : 'w-1/2 shrink-0 border-r'
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

      <div
        className={cn(
          'no-scrollbar bg-[#252526] p-8 overflow-y-auto min-w-0 min-h-0',
          isNarrow ? 'w-full h-1/2' : 'flex-1'
        )}
      >
        <CareerRoadmap experiences={workHistory} />
      </div>
    </div>
  );
}
