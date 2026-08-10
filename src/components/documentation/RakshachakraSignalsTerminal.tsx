import React, { useEffect, useRef, useState } from 'react';
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

/** `feature_extraction.description`'s own parenthetical — "behavioral
 * features (25+ signals)" — reused as the closing line, not a new figure. */
const FEATURE_COUNT_LINE = '25+ behavioral features extracted per session';

const ROW_STAGGER_MS = 70;
const POST_ROWS_PAUSE_MS = 260;

/**
 * ./signals.sh — the right half of the top row, answering "what does the
 * system observe?" with the real signals the canonical architecture model
 * names. Wired again (Connector Correction, corrected): `problem.sh` draws
 * a real wire into `./signals.sh` (the top row is a chain, not two
 * independent panels), and `./signals.sh`'s own completed reveal draws the
 * second wire into `./session.sh` below. Modeled on
 * `CortexaDecisionTerminal.tsx`'s shape (a compact staggered list under a
 * header/rule, a closing line gated on full reveal) rather than a literal
 * copy of it — that file's own content (the 4-column decision table) has no
 * equivalent here, since Rakshachakra has no chosen-vs-rejected data.
 *
 * Dual-gated the same way `RakshachakraSessionTerminal` is: `active` is
 * wire 1 (problem → signals) having landed, the self-managed
 * `IntersectionObserver` is the reader actually having scrolled here — the
 * row-reveal only starts once both are true. Its own completion (last row +
 * the closing feature-count line) is what `onComplete` reports upward, so
 * `RakshachakraDocFlow` can draw wire 2 (signals → session) once there's
 * something finished to draw it from.
 *
 * `--constraint ↑` in the header is static text, not the constraint value
 * itself — matching `CortexaDecisionTerminal`'s own explicit choice
 * (`problem.sh` states it directly above and the wire carries it here, so
 * repeating the text a third time would be the exact redundancy this page
 * removed).
 */
export function RakshachakraSignalsTerminal({
  signalsRef,
  active,
  skip,
  onComplete,
}: {
  signalsRef: React.RefObject<HTMLDivElement | null>;
  active: boolean;
  skip: boolean;
  onComplete?: () => void;
}) {
  const instant = skip;

  const [revealedCount, setRevealedCount] = useState(instant ? SIGNALS.length : 0);
  const [inView, setInView] = useState(false);
  const startedRef = useRef(false);
  const firedCompleteRef = useRef(false);

  const running = instant || inView;
  const allRevealed = instant || revealedCount >= SIGNALS.length;

  useEffect(() => {
    if (instant || inView) return undefined;
    const node = signalsRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [instant, inView, signalsRef]);

  const fireComplete = () => {
    if (firedCompleteRef.current) return;
    firedCompleteRef.current = true;
    onComplete?.();
  };

  useEffect(() => {
    if (instant) {
      fireComplete();
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant]);

  // Rows step in once the wire from problem.sh has landed and the panel is
  // on screen — same dual gate RakshachakraSessionTerminal uses for its own
  // reveal start.
  useEffect(() => {
    if (instant || !active || !running || startedRef.current) return undefined;
    startedRef.current = true;
    let timer = 0;
    let index = 0;
    const step = () => {
      index += 1;
      setRevealedCount(index);
      if (index < SIGNALS.length) {
        timer = window.setTimeout(step, ROW_STAGGER_MS);
      } else {
        timer = window.setTimeout(fireComplete, POST_ROWS_PAUSE_MS);
      }
    };
    timer = window.setTimeout(step, ROW_STAGGER_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant, active, running]);

  return (
    <div ref={signalsRef}>
      <ProjectTerminalPanel
        fileName="./signals.sh"
        dormant={!active}
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
            const revealed = instant || index < revealedCount;
            return (
              <div
                key={signal}
                className="-mx-2 px-2 py-[2px]"
                style={{
                  color: TEXT,
                  opacity: revealed ? 1 : 0,
                  transition: instant ? 'none' : `opacity 200ms ease-out ${index * ROW_STAGGER_MS}ms`,
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
