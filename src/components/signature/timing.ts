// Shared animation constants for the right pane's terminal-story sequence
// (TerminalRunner and its phase components). Centralized so timing stays
// consistent across phases without each component inventing its own
// numbers — matches the brief's recommended ranges.

export const CHAR_MS_RANGE: [number, number] = [20, 35];
export const LINE_GAP_MS = 100;
export const ASCII_ROW_STAGGER_MS = 70;
// Startup Timing Reduction: 500 -> ~180ms. This was pure dead air between
// the banner landing and the profile's own first content — the bars
// starting immediately after already reads as "activity," the pause
// added nothing the reader could use.
export const STATUS_PAUSE_MS = 180;

// The deliberate beat between the identity block being readable and the
// workspace reporting ready. This is the sequence's one intentionally *slow*
// constant: the four profile lines used to be followed by ~945ms of animating
// trait bars, and removing those (see EngineeringProfile) would otherwise have
// collapsed the whole startup to ~1.5s and fired the campfire ignition before
// anyone had read the name. Holds the measured critical path at ~2.2s, where
// the arc reads short → intentional → ready → payoff.
export const PROFILE_HOLD_MS = 400;

// Startup Timing Reduction: Phase 2's analysis lines are disposable — the
// whole block unmounts the instant the phase advances (TerminalRunner's own
// comment), so nothing here needs to read at the deliberate, "watch me type"
// pace `./signature.sh` (CHAR_MS_RANGE above) still uses. A much faster,
// separate rate keeps the "system is doing something" beat without making
// the reader wait through 7 lines of text they'll never get to finish
// reading anyway. Combined with 3 lines instead of 7 (TerminalRunner.tsx's
// own ANALYSIS_LINES), this phase now completes in under 1s instead of the
// ~5.6s it averaged before.
export const ANALYSIS_CHAR_MS_RANGE: [number, number] = [8, 12];
export const ANALYSIS_LINE_GAP_MS = 60;

/**
 * Phase 9C (cursor handoff): the quiet beat between the campfire finishing
 * its reveal and the shell being handed from startup.log's idle prompt down
 * to the real interactive Terminal.
 *
 * This is the *only* new timing constant the handoff needs, and it is
 * deliberately measured from the campfire's own `REVEAL_MS` rather than from
 * `ready` — igniting, revealing and handing off are three separate beats, and
 * the campfire is the climax of the two that precede it. The handoff waits
 * out the full reveal (CampfireScene's REVEAL_MS) and then this much longer,
 * so it reads as an epilogue to a scene that has already landed rather than
 * as a fourth thing competing inside it. Short on purpose: long enough to be
 * a separate event, short enough that a visitor still connects the cursor
 * leaving one pane with the cursor arriving in the other.
 */
export const HANDOFF_CODA_MS = 700;

/**
 * Phase 9C (visible handoff): the beat between HandoffHint.tsx appearing and
 * this pane's cursor actually stopping.
 *
 * The two are deliberately not simultaneous. The hint has to arrive while
 * the cursor is still blinking, so the reader sees *this* shell say one last
 * thing and only then go quiet — cause, then effect. Fire them together and
 * the line and the stopped cursor land as one undifferentiated state change,
 * which reads as the sequence merely ending rather than as a handoff.
 *
 * Sized at just under one 1s blink period: long enough for the hint's
 * 320ms fade-rise to finish and be read against a still-live cursor, short
 * enough that the cursor stopping here and the cursor starting in the
 * terminal below still register as the same event.
 */
export const HINT_SETTLE_MS = 900;
