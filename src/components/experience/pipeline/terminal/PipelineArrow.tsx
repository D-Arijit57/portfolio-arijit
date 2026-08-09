import React from 'react';
import { DIM, RULE } from '../tokens';

/**
 * A connector between two stages. Horizontally it's a real drawn line
 * ending in an arrowhead — the flow/dependency between stages is the one
 * thing on this page that genuinely is a diagram, so it gets an actual
 * rule rather than a text glyph floating in a gap. Vertically (narrow
 * canvas) it collapses to a short stem + glyph, since a full-height rule
 * between stacked rows would read as a left gutter rather than a flow.
 *
 * `grow` lets the caller trade arrow length for stage width at medium
 * widths (see ExperienceTerminalTwo's tier logic) — the brief's "reduce
 * gaps between stages rather than immediately switching to vertical."
 *
 * Purely decorative: sequence is already carried by DOM order and each
 * stage's own `[0N]`, so a screen reader has no reason to announce this
 * four times.
 */
export function PipelineArrow({ direction, grow = 0.45 }: { direction: 'right' | 'down'; grow?: number }) {
  if (direction === 'down') {
    // items-start + a left inset, not items-center: stacked vertically the
    // stage rows are full-width blocks, so a centred connector would float
    // out in the middle of the panel with nothing under it. Inset ~15px
    // puts the stem under the `[0N]` marker it descends from, which is
    // what makes it read as flow rather than as a divider.
    return (
      <div aria-hidden="true" className="flex flex-col items-start py-1" style={{ paddingLeft: 15 }}>
        <div className="h-3 w-px" style={{ backgroundColor: RULE }} />
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
      <div className="h-px min-w-[12px] flex-1" style={{ backgroundColor: RULE }} />
      <span className="shrink-0 text-[11px] leading-none" style={{ color: DIM }}>
        ▶
      </span>
    </div>
  );
}
