import React from 'react';
import { DIM, RULE } from '../tokens';
import { PROMPT_ACCENT } from './ExperienceTerminalPanel';

/** The travelling packet — small, crisp, one soft ring of glow, nothing more. */
function PulseDot({ axis, onEnd }: { axis: 'x' | 'y'; onEnd?: () => void }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute h-[5px] w-[5px] rounded-full ${axis === 'x' ? 'pipeline-pulse-x top-1/2 -translate-y-1/2' : 'pipeline-pulse-y left-1/2 -translate-x-1/2'}`}
      style={{ backgroundColor: PROMPT_ACCENT, boxShadow: `0 0 4px ${PROMPT_ACCENT}` }}
      onAnimationEnd={onEnd}
    />
  );
}

/**
 * A connector between two pipeline stages, and the channel the unlock
 * travels down.
 *
 * The track is always present — the architecture exists before it has been
 * executed, which is what lets the not-yet-reached stages read as dormant
 * rather than absent. `lit` marks a connector the pipeline has already
 * passed through; `pulsing` mounts the packet, and its `animationend` is
 * what unlocks the stage on the far side, so nothing downstream is ever
 * released on a guessed duration (the same rule the terminal-to-terminal
 * wire follows).
 *
 * `grow` lets the caller trade connector length for stage width at medium
 * widths — "reduce gaps between stages rather than immediately switching
 * to vertical."
 */
export function PipelineArrow({
  direction,
  grow = 0.45,
  lit = false,
  pulsing = false,
  onPulseEnd,
}: {
  direction: 'right' | 'down';
  grow?: number;
  lit?: boolean;
  pulsing?: boolean;
  onPulseEnd?: () => void;
}) {
  const trackColor = lit ? PROMPT_ACCENT : RULE;
  const trackOpacity = lit ? 0.45 : 1;

  if (direction === 'down') {
    // items-start + a left inset, not items-center: stacked vertically the
    // stage rows are full-width blocks, so a centred connector would float
    // out in the middle of the panel with nothing under it. Inset ~15px
    // puts the stem under the `[0N]` marker it descends from.
    return (
      <div aria-hidden="true" className="flex flex-col items-start py-1" style={{ paddingLeft: 15 }}>
        <div className="relative w-px" style={{ height: 22, backgroundColor: trackColor, opacity: trackOpacity }}>
          {pulsing && <PulseDot axis="y" onEnd={onPulseEnd} />}
        </div>
        <span className="-ml-[3px] -mt-[4px] text-[9px] leading-none" style={{ color: DIM }}>
          ▼
        </span>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      // pr-2: without it the arrowhead butts straight up against the next
      // stage's `[0N]` bracket, which reads as one glyph rather than as an
      // arrow pointing at a stage.
      className="flex min-w-0 items-center gap-1 pr-2 pt-[9px]"
      style={{ flexGrow: grow, flexBasis: 0, flexShrink: 1 }}
    >
      <div
        className="relative h-px min-w-[12px] flex-1"
        style={{ backgroundColor: trackColor, opacity: trackOpacity, transition: 'background-color 250ms ease-out' }}
      >
        {pulsing && <PulseDot axis="x" onEnd={onPulseEnd} />}
      </div>
      <span className="shrink-0 text-[11px] leading-none" style={{ color: DIM }}>
        ▶
      </span>
    </div>
  );
}
