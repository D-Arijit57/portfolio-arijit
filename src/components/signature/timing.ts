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
