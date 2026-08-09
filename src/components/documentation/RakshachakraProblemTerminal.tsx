import React from 'react';
import { ProjectTerminalPanel, ACCENT, MUTED } from './ProjectTerminalPanel';

/**
 * The value `problem.sh` emits and `./signals.sh`'s header echoes
 * (`--constraint ↑`) — the same "wire carries a real value" relationship
 * `cortexaNarrative.ts`'s own `CONSTRAINT` has with `cortexa.sh`. Exported
 * so `RakshachakraDocFlow` can pass it to the header of the terminal that's
 * justified against it, without a second copy of the string.
 */
export const RAKSHACHAKRA_CONSTRAINT = 'continuously verify the user';

/** User-approved copy, verbatim — do not edit without a new explicit
 * approval. No additions, no explanatory prose, no "AI/ML/biometric/
 * real-time" language here; those belong to ./signals.sh and ./pipeline.sh,
 * which answer the question this terminal only asks. */
const PROBLEM_BLOCKS: string[][] = [
  ['Why trust a session indefinitely?'],
  ['Login establishes identity.', 'Behavior provides another signal.'],
];

function fadeUpStyle(visible: boolean, delayMs = 0): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(6px)',
    transition: `opacity 260ms ease-out ${delayMs}ms, transform 260ms ease-out ${delayMs}ms`,
  };
}

/**
 * ./problem.sh — Rakshachakra's own, modeled on `CortexaProblemTerminal.tsx`
 * exactly (same fade-up mechanics, same "state the premise, then emit a
 * constraint" shape), not a refactor of it: that file's copy is Cortexa's
 * own and stays untouched. No typing effect — the problem is a premise, not
 * a performance, so it's readable the instant the panel arrives, same
 * reasoning as Cortexa's own.
 *
 * The last line is the point of the whole top row: this terminal *emits a
 * constraint* rather than just posing a question, and that value is what
 * `./signals.sh` is justified against (its header shows `--constraint ↑`)
 * and what the wire between them carries — the same mechanism that makes
 * Cortexa's own top row a chain instead of two boxes that animate in order.
 */
export function RakshachakraProblemTerminal({
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
          {PROBLEM_BLOCKS.map((block, blockIndex) => (
            <div key={blockIndex} className="flex flex-col gap-1">
              {block.map((line, lineIndex) => (
                <p key={lineIndex}>{line}</p>
              ))}
            </div>
          ))}
          <p style={skip ? undefined : fadeUpStyle(constraintVisible)}>
            <span style={{ color: MUTED }}>→ constraint: </span>
            <span style={{ color: ACCENT }}>{RAKSHACHAKRA_CONSTRAINT}</span>
          </p>
        </div>
      </ProjectTerminalPanel>
    </div>
  );
}
