import React from 'react';
import { CYAN, GRAY } from './palette';

const LABEL_COLUMN_WIDTH = 12;

/**
 * `visitors      1,284` — MOTD placement (Visitor Count requirements
 * iteration §11): a real Unix login banner's own "N users logged in"
 * register, not a widget. Same field-label alignment
 * `EngineeringProfile.tsx` already uses (`label.padEnd(N)`), same GRAY
 * label / accent-value contrast — CYAN specifically, since
 * `palette.ts`'s own comment already names it this pane's color for
 * "numbers, deltas, throughput," which a visitor count plainly is.
 *
 * Purely presentational — `count` is only ever passed once a real number
 * has come back from `visitorClient.recordVisit()` (see `TerminalRunner`'s
 * own fetch, started on mount so it's had the whole boot sequence to
 * resolve by the time this can render). No loading state, no "—" 0
 * placeholder: if there's no real number yet, nothing renders, matching
 * this line's own "genuine system information" framing — a fabricated
 * placeholder would be exactly the "marketing metric" the brief rejected.
 */
export function VisitorLine({ count }: { count: number }) {
  return (
    <p>
      <span style={{ color: GRAY }}>{'visitors'.padEnd(LABEL_COLUMN_WIDTH)}</span>
      <span style={{ color: CYAN }}>{count.toLocaleString()}</span>
    </p>
  );
}
