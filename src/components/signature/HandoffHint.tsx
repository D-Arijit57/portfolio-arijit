import React from 'react';
import { CYAN, GRAY } from './palette';

/**
 * The last line startup.log ever prints: a one-time pointer down to the real
 * interactive terminal, shown at the moment this pane stops being the surface
 * that looks live.
 *
 * Phase 9C originally handed the cursor over silently — the blink simply
 * moved from this pane to the terminal panel. That is correct but easy to
 * miss: nothing *said* the shell below accepts typing, so the handoff read as
 * the sequence merely finishing. This line is the visible half of that same
 * event, and it is deliberately the log's own closing statement rather than
 * UI chrome: it uses the pane's existing palette, sits in the log's own
 * column, and names a real command the terminal below actually implements.
 *
 * Rendered *after* the prompt, not before it, for two reasons: inserting a
 * line above an already-settled prompt would shove it down at the exact
 * moment the visitor's eye is resting on it, and being the pane's bottom-most
 * line puts the `↓` physically nearest the panel it points at.
 *
 * The arrival is the whole cue — a single quiet fade-rise timed to land with
 * the handoff, not a looping animation. `discovery-arrow-float` was the
 * obvious reuse for a downward arrow and is deliberately *not* used: it
 * floats forever, and a finished log that keeps waving at the reader is the
 * opposite of the "startup.log should look finished" premise this whole
 * handoff exists to serve. Reduced motion is covered by index.css's existing
 * `fade-rise` guard, and `instant` (a repeat visit this session) skips the
 * animation entirely so a remount shows the settled end state with no replay.
 */
export function HandoffHint({ instant }: { instant?: boolean }) {
  return (
    <p
      className={`mt-3 ${instant ? '' : 'animate-[fade-rise_320ms_ease-out_both]'}`}
      style={{ color: GRAY }}
    >
      ↓ try <span style={{ color: CYAN }}>help</span> in the terminal below
    </p>
  );
}
