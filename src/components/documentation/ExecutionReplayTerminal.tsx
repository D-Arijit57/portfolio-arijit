import React, { useEffect, useRef, useState } from 'react';
import {
  CAPABILITIES,
  CONSTRAINT,
  REPLAY_EVENTS,
  REPLAY_SUMMARY,
  type DecisionId,
} from '../../content/cortexaNarrative';
import type { DocumentationFrontmatter } from '../../documentation/types';

const ACCENT = '#38BDF8';
const MUTED = '#9CA3AF';
const TEXT = '#E5E7EB';
const SUCCESS = '#6EE7B7';

// The one moment on the page that should feel fast. Real logs print in
// bursts, so events land quickly and unevenly rather than on a metronome —
// this is the "46 minutes in 3 seconds" beat the summary line names.
const EVENT_STEP_MS = 240;
const POST_REPLAY_PAUSE_MS = 420;
// Used when the reader has scrolled past mid-sequence: the remaining events
// still print in order, just fast enough that the terminal is finished by
// the time they scroll back. The animation rewards attention; it never gates
// access to the content, and nobody should return to a half-built terminal.
const ACCELERATED_STEP_MS = 30;

type Phase = 'idle' | 'replaying' | 'record';

/**
 * run-cortexa — the proof, then the record, in one uninterrupted shell
 * session.
 *
 * The replay is a *recording being played back*, not a server booting.
 * That reframing is what makes it honest: real timestamps advancing across
 * ~47 minutes of a genuine interview lifecycle, each line carrying a
 * measurement, compressed into three seconds. Nothing here claims to be
 * provisioning anything live, and every line reports something the product
 * actually does.
 *
 * It then continues — same session, no new panel — into `cat cortexa.md`,
 * which prints the parts of the file the page's top line didn't: stack and
 * capabilities. The terminal stops performing and becomes the document,
 * then hands control back with an idle prompt.
 *
 * The panel is *constructed* rather than pre-sized. It carries no minimum
 * height, so it starts as chrome plus one line and grows downward as replay
 * events append — a terminal filling up, not a fixed container revealing
 * hidden content. The documentation block stays unmounted until the replay
 * finishes, so it expands the panel exactly once, as a single settled step,
 * and nothing resizes afterward. The connector is unaffected throughout:
 * it anchors a fixed distance below this panel's top edge (see
 * CortexaConnectors' EXECUTION_ANCHOR_OFFSET), which growth never moves.
 *
 * `activeDecision` dims every event except the ones the hovered decision
 * produced; hovering an event reports back up so the decision that caused
 * it can highlight in cortexa.sh. That two-way link is the page's only
 * interaction, and it's what makes the connector between the two terminals
 * mean something.
 */
export function ExecutionReplayTerminal({
  start,
  skip,
  accelerated,
  frontmatter,
  fileName,
  activeDecision,
  onHoverDecision,
  onReplayComplete,
}: {
  start: boolean;
  skip: boolean;
  /** The reader has scrolled past mid-sequence — finish quickly rather than
   * leaving a half-built terminal behind them. */
  accelerated: boolean;
  frontmatter: DocumentationFrontmatter;
  fileName: string;
  activeDecision: DecisionId | null;
  onHoverDecision: (id: DecisionId | null) => void;
  onReplayComplete?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(() => (skip ? 'record' : 'idle'));
  const [eventCount, setEventCount] = useState(() => (skip ? REPLAY_EVENTS.length : 0));
  const firedRef = useRef(false);
  const startedRef = useRef(false);
  // Read at each step rather than captured when the sequence starts, so
  // scrolling away mid-replay speeds up the events still to come.
  const acceleratedRef = useRef(accelerated);
  acceleratedRef.current = accelerated;

  useEffect(() => {
    if (skip || !start || startedRef.current) return undefined;
    startedRef.current = true;
    setPhase('replaying');

    let timer = 0;
    let index = 0;
    const delay = () => (acceleratedRef.current ? ACCELERATED_STEP_MS : EVENT_STEP_MS);

    const step = () => {
      index += 1;
      setEventCount(index);
      if (index < REPLAY_EVENTS.length) {
        timer = window.setTimeout(step, delay());
      } else {
        timer = window.setTimeout(
          () => setPhase('record'),
          acceleratedRef.current ? ACCELERATED_STEP_MS : POST_REPLAY_PAUSE_MS,
        );
      }
    };

    timer = window.setTimeout(step, delay());
    return () => window.clearTimeout(timer);
  }, [start, skip]);

  useEffect(() => {
    if (phase !== 'record' || firedRef.current) return;
    firedRef.current = true;
    onReplayComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === 'idle') return null;

  // Status is deliberately absent here — it moved up beside the page's
  // identity line, where a 30-second reader actually sees it. This block
  // prints what's left of the file: stack and capabilities.
  const badges = Array.isArray(frontmatter.badges) ? frontmatter.badges : [];
  const showRecord = phase === 'record';

  return (
    <div className="flex flex-col text-[13px] leading-[1.55]">
      {/* Unrevealed events aren't rendered at all rather than held at
          opacity 0 — that's what lets the panel actually grow line by line
          instead of standing at full height with invisible content. */}
      {REPLAY_EVENTS.map((event, index) => {
        const revealed = skip || index < eventCount;
        if (!revealed) return null;
        const isActive = activeDecision === event.decision;
        const isDimmed = activeDecision !== null && !isActive;

        return (
          <div
            key={`${event.time}-${event.event}`}
            onMouseEnter={() => onHoverDecision(event.decision)}
            onMouseLeave={() => onHoverDecision(null)}
            className="-mx-2 flex items-baseline gap-3 rounded px-2 py-[2px]"
            style={{
              opacity: isDimmed ? 0.35 : 1,
              backgroundColor: isActive ? 'rgba(56,189,248,.07)' : 'transparent',
              transition: 'opacity 180ms ease-out, background-color 150ms ease-out',
            }}
          >
            <span className="shrink-0 tabular-nums" style={{ color: MUTED }}>
              {event.time}
            </span>
            <span className="shrink-0" style={{ color: isActive ? ACCENT : TEXT }}>
              {event.event}
            </span>
            <span className="min-w-0 flex-1" style={{ color: MUTED }}>
              {event.detail}
            </span>
            {event.meta && (
              <span className="shrink-0 tabular-nums" style={{ color: MUTED }}>
                {event.meta}
              </span>
            )}
          </div>
        );
      })}

      {/* Both of the blocks below mount only once the replay has finished,
          so the panel expands exactly once — a single settled step at the
          end of growth — and never resizes again after the documentation
          is on screen. */}
      {showRecord && (
        <p className="mt-4" style={{ color: SUCCESS }}>
          {REPLAY_SUMMARY} · {CONSTRAINT}
        </p>
      )}

      {/* Same shell session — the terminal stops demonstrating and starts
          documenting. `cat` prints what the page's own `head -1` line
          didn't: everything below line one. */}
      {showRecord && (
      <div className="mt-6 animate-[fade-rise_320ms_ease-out_both]">
        <p className="flex items-center gap-2">
          <span style={{ color: ACCENT }}>$</span>
          <span style={{ color: TEXT }}>cat {fileName}</span>
        </p>

        {/* Two metadata rows, no capability block: the replay already
            demonstrated every one of these end to end, so they appear here
            as scannable keywords rather than as a second explanation. */}
        <div className="mt-3 flex flex-col gap-1">
          {badges.length > 0 && (
            <p className="flex items-baseline gap-3">
              <span className="w-[104px] shrink-0" style={{ color: MUTED }}>
                stack
              </span>
              <span className="min-w-0 flex-1" style={{ color: TEXT }}>
                {badges.join(' · ')}
              </span>
            </p>
          )}
          <p className="flex items-baseline gap-3">
            <span className="w-[104px] shrink-0" style={{ color: MUTED }}>
              capabilities
            </span>
            <span className="min-w-0 flex-1" style={{ color: TEXT }}>
              {CAPABILITIES.join(' · ')}
            </span>
          </p>
        </div>

        {/* Control handed back — the tree below is where exploration
            actually begins. */}
        <p className="mt-4 flex items-center gap-2">
          <span style={{ color: ACCENT }}>$</span>
          <span className="typing-reveal-cursor inline-block h-[15px] w-[7px]" style={{ backgroundColor: TEXT }} />
        </p>
      </div>
      )}
    </div>
  );
}
