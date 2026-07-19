import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { EditorTabs } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';
import { EditorRenderer } from './EditorRenderer';
import { ResizeHandle } from '../shared/ResizeHandle';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

/**
 * WA-06/WA-07: the divider between panes is drag-resizable (via splitRatio,
 * store-owned per ARCHITECTURE.md's ownership conventions), and an empty
 * pane collapses to 0 width with an animated transition rather than showing
 * a permanent placeholder — the other pane stretches to fill the freed
 * space. A placeholder only ever renders in the rare both-panes-empty case.
 */
export function SplitEditorArea() {
  const { openedTabs, splitRatio, setSplitRatio } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const leftTabs = openedTabs.filter(t => t.pane === 'left');
  const rightTabs = openedTabs.filter(t => t.pane === 'right');
  const leftEmpty = leftTabs.length === 0;
  const rightEmpty = rightTabs.length === 0;
  const bothEmpty = leftEmpty && rightEmpty;
  const showDivider = !leftEmpty && !rightEmpty;

  const handleResize = (deltaPx: number) => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 0;
    setSplitRatio(deltaPx, containerWidth);
  };

  const leftWidth = bothEmpty ? '50%' : leftEmpty ? '0%' : rightEmpty ? '100%' : `${splitRatio * 100}%`;
  const rightWidth = bothEmpty ? '50%' : rightEmpty ? '0%' : leftEmpty ? '100%' : `${(1 - splitRatio) * 100}%`;

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 bg-[#1e1e1e] overflow-hidden">
      <motion.div
        animate={{ width: leftWidth }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'flex flex-col min-h-0 overflow-hidden',
          !leftEmpty && 'border-r border-[#3c3c3c]'
        )}
      >
        {!leftEmpty ? (
          <>
            <EditorTabs pane="left" />
            <Breadcrumbs pane="left" />
            <div className="flex-1 overflow-hidden">
              <EditorRenderer pane="left" />
            </div>
          </>
        ) : bothEmpty ? (
          <EmptyPanePlaceholder />
        ) : null}
      </motion.div>

      {showDivider && <ResizeHandle direction="horizontal" onResize={handleResize} />}

      <motion.div
        animate={{ width: rightWidth }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col min-h-0 overflow-hidden"
      >
        {!rightEmpty ? (
          <>
            <EditorTabs pane="right" />
            <Breadcrumbs pane="right" />
            <div className="flex-1 overflow-hidden">
              <EditorRenderer pane="right" />
            </div>
          </>
        ) : bothEmpty ? (
          <EmptyPanePlaceholder />
        ) : null}
      </motion.div>
    </div>
  );
}

function EmptyPanePlaceholder() {
  return (
    <div className="h-full w-full flex items-center justify-center text-[#333333]">
      <div className="text-9xl opacity-20">VS</div>
    </div>
  );
}
