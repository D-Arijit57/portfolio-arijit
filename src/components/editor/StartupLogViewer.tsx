import React from 'react';
import { motion } from 'motion/react';
import { useFileRevealSequence } from '../../hooks/useFileRevealSequence';
import { STARTUP_LOG_LINES, STARTUP_LOG_ASCII, STARTUP_LOG_FINAL_MESSAGE } from '../../lib/startupLog';
import type { VirtualFile } from '../../types';

const ASCII_UNIT_INDEX = STARTUP_LOG_LINES.length;
const FINAL_UNIT_INDEX = STARTUP_LOG_LINES.length + 1;
const UNIT_COUNT = STARTUP_LOG_LINES.length + 2;

/**
 * startup.log's right-pane viewer — a second, distinct boot layer from
 * BootTerminal (see lib/startupLog.ts's header comment): that one plays
 * once, app-wide, before the workspace renders at all; this one plays once
 * per session the first time this pane is opened, same as every other file
 * (useFileRevealSequence's own session gating), and only ever covers this
 * workspace's own content loading, never the machine/IDE beats BootTerminal
 * already owns. Each line simply fades/slides into place — no per-character
 * typing, no cursor, no loop once complete, matching the brief.
 */
export function StartupLogViewer({ file }: { file: VirtualFile }) {
  const sequence = useFileRevealSequence({ fileId: file.id, unitCount: UNIT_COUNT });

  const rowProps = (index: number) => ({
    initial: 'hidden' as const,
    animate: 'visible' as const,
    custom: index,
    variants: sequence.unitVariants,
    transition: sequence.isComplete ? { duration: 0 } : undefined,
    onAnimationComplete: sequence.isLastUnit(index) ? sequence.onLastUnitComplete : undefined,
  });

  return (
    <div
      ref={sequence.containerRef as React.RefObject<HTMLDivElement>}
      className="h-full overflow-y-auto bg-black p-4 font-mono text-[13px]"
    >
      {STARTUP_LOG_LINES.map((line, i) => (
        <motion.div key={line} className="text-[#cccccc]" {...rowProps(i)}>
          {line}
        </motion.div>
      ))}

      <motion.pre
        className="mt-2 text-[#6e7681] leading-tight"
        {...rowProps(ASCII_UNIT_INDEX)}
      >
        {STARTUP_LOG_ASCII}
      </motion.pre>

      <motion.div className="mt-2 text-[#8ae234]" {...rowProps(FINAL_UNIT_INDEX)}>
        {STARTUP_LOG_FINAL_MESSAGE}
      </motion.div>
    </div>
  );
}
