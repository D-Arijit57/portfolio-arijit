import React from 'react';
import { ProjectTerminalPanel, ACCENT, MUTED, TEXT } from './ProjectTerminalPanel';

// Same value as CortexaDecisionTerminal.tsx's own local DIM — that file
// defines it locally too rather than exporting it from the shared shell, so
// this mirrors the existing convention instead of introducing a new one.
const DIM = '#6B7280';

/**
 * The three real signals `sensor_capture.responsibilities` names
 * (`content/architecture/rakshachakra.ts`) — nothing invented, nothing
 * dropped, same order as the model. Short labels, not the model's own
 * "X capture" phrasing repeated three times, since the panel already
 * establishes what these are.
 */
const SIGNALS = ['touch / gesture', 'motion / orientation', 'device-state'];

/** So `RakshachakraDocFlow` can drive `revealedCount` up to the real row
 * count without a magic number duplicating `SIGNALS.length` at the call
 * site — the same reason `CortexaExecutionFlow` iterates `DECISIONS` itself
 * rather than hardcoding `5`. */
export const RAKSHACHAKRA_SIGNALS_COUNT = SIGNALS.length;

/** `feature_extraction.description`'s own parenthetical — "behavioral
 * features (25+ signals)" — reused as the closing line, not a new figure. */
const FEATURE_COUNT_LINE = '25+ behavioral features extracted per session';

const ROW_STAGGER_MS = 70;

/**
 * ./signals.sh — the right half of the top row, answering the question
 * `problem.sh`'s own last line raises ("Behavior provides another
 * signal.") with the real signals the canonical architecture model
 * actually names. Modeled on `CortexaDecisionTerminal.tsx`'s shape (a
 * compact staggered list under a header/rule, a closing line gated on full
 * reveal, `--constraint ↑` in the header) rather than a literal copy of
 * it — that file's own content (the 4-column decision table) has no
 * equivalent here, since Rakshachakra has no chosen-vs-rejected data.
 *
 * No hover interaction: Cortexa's decision↔evidence hover link exists
 * because two terminals share data (a decision and the events it produced).
 * `./signals.sh` doesn't feed anything downstream that would make hovering
 * mean something, so it doesn't invent an interaction to match the shape.
 *
 * `--constraint ↑` in the header is static text, not the constraint value
 * itself — matching `CortexaDecisionTerminal`'s own explicit choice
 * ("problem.sh states it directly above and the wire carries it here, so
 * repeating the text a third time would be the exact redundancy this page
 * removed").
 */
export function RakshachakraSignalsTerminal({
  signalsRef,
  revealedCount,
  skip,
  dormant,
}: {
  signalsRef: React.RefObject<HTMLDivElement | null>;
  revealedCount: number;
  skip: boolean;
  dormant: boolean;
}) {
  const allRevealed = skip || revealedCount >= SIGNALS.length;

  return (
    <div ref={signalsRef}>
      <ProjectTerminalPanel
        fileName="./signals.sh"
        dormant={dormant}
        bodyPadding="p-5"
        headerExtra={
          <span className="hidden font-mono text-[11px] sm:inline" style={{ color: DIM }}>
            --constraint ↑
          </span>
        }
      >
        <div className="flex flex-col text-[13px] leading-[1.55]">
          <div style={{ color: DIM }}>signal</div>
          <div className="my-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,.08)' }} />

          {SIGNALS.map((signal, index) => {
            const revealed = skip || index < revealedCount;
            return (
              <div
                key={signal}
                className="-mx-2 px-2 py-[2px]"
                style={{
                  color: TEXT,
                  opacity: revealed ? 1 : 0,
                  transition: skip ? 'none' : `opacity 200ms ease-out ${index * ROW_STAGGER_MS}ms`,
                }}
              >
                {signal}
              </div>
            );
          })}

          <div
            className="mt-3 text-[12px] leading-[1.4]"
            style={{
              color: MUTED,
              opacity: allRevealed ? 1 : 0,
              transition: 'opacity 260ms ease-out 120ms',
            }}
          >
            <span style={{ color: ACCENT }}>→ </span>
            {FEATURE_COUNT_LINE}
          </div>
        </div>
      </ProjectTerminalPanel>
    </div>
  );
}
