import React from 'react';
import { CortexaTerminalPanel } from './CortexaTerminalPanel';
import { CONSTRAINT } from '../../content/cortexaNarrative';

const MUTED = '#9CA3AF';
const ACCENT = '#569cd6';

const PROBLEM_BLOCKS: string[][] = [
  ['Why does every interview still feel stitched together?'],
  ['One tool for scheduling.', 'Another for video.', 'Another for coding.'],
  ['The interview becomes fragmented before it even starts.'],
];

function fadeUpStyle(visible: boolean, delayMs = 0): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(6px)',
    transition: `opacity 260ms ease-out ${delayMs}ms, transform 260ms ease-out ${delayMs}ms`,
  };
}

/**
 * problem.sh — the failing state. No typing: the problem is a premise, not
 * a performance, so it's readable the instant the panel arrives.
 *
 * Its last line is the point of the redesign: the terminal *emits a
 * constraint* rather than just describing a complaint. That value is what
 * the connector carries downstream and what cortexa.sh literally runs
 * with, which is what makes the three terminals a chain instead of three
 * boxes that animate in order.
 */
export function CortexaProblemTerminal({
  problemRef,
  visible,
  constraintVisible,
  skip,
}: {
  problemRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
  constraintVisible: boolean;
  skip: boolean;
}) {
  return (
    <div ref={problemRef} style={skip ? undefined : fadeUpStyle(visible)}>
      <CortexaTerminalPanel fileName="./problem.sh">
        <div className="flex flex-col gap-4">
          {PROBLEM_BLOCKS.map((block, blockIndex) => (
            <div key={blockIndex} className="flex flex-col gap-1">
              {block.map((line, lineIndex) => (
                <p key={lineIndex}>{line}</p>
              ))}
            </div>
          ))}
          <p style={skip ? undefined : fadeUpStyle(constraintVisible)}>
            <span style={{ color: MUTED }}>→ constraint: </span>
            <span style={{ color: ACCENT }}>{CONSTRAINT}</span>
          </p>
        </div>
      </CortexaTerminalPanel>
    </div>
  );
}
