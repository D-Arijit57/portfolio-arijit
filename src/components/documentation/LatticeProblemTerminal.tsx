import React from 'react';
import { ProjectTerminalPanel, ACCENT, MUTED } from './ProjectTerminalPanel';

/** The value problem.sh emits and schema.sh's header echoes (`--constraint ↑`). */
export const LATTICE_CONSTRAINT = 'a content type is data, not schema';

// Copy paraphrased from the Problem Statement in LATTICE_DOC_MARKDOWN.
const PROBLEM_BLOCKS: string[][] = [
  ['New kind of content?', 'A model, a migration and a deploy.'],
  ['Whose data is this request allowed to touch?', 'The server decides — on every route.'],
];

function fadeUpStyle(visible: boolean, delayMs = 0): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(6px)',
    transition: `opacity 260ms ease-out ${delayMs}ms, transform 260ms ease-out ${delayMs}ms`,
  };
}

/** ./problem.sh — states the premise, then emits the constraint the wire carries. */
export function LatticeProblemTerminal({
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
      <ProjectTerminalPanel fileName="./problem.sh">
        <div className="flex flex-col gap-4">
          {PROBLEM_BLOCKS.map((block, i) => (
            <div key={i} className="flex flex-col gap-1">
              {block.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ))}
          <p style={skip ? undefined : fadeUpStyle(constraintVisible)}>
            <span style={{ color: MUTED }}>→ constraint: </span>
            <span style={{ color: ACCENT }}>{LATTICE_CONSTRAINT}</span>
          </p>
        </div>
      </ProjectTerminalPanel>
    </div>
  );
}
