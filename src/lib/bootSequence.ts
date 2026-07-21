// Sprint 10E (Intelligent Workspace Boot Experience), refined in Sprint
// 10E.1: session-local bookkeeping for whether the boot terminal has
// already played on this page load, plus the boot log content itself.
// Mirrors lib/typingReveal.ts's module-level flag pattern exactly — a plain
// variable, not store state, since nothing outside EditorArea needs to
// react to it, and it must reset on a real page refresh (new module
// instance) but never on in-session navigation (switching tabs, reopening
// README, etc).

export { prefersReducedMotion } from './typingReveal';

let booted = false;

export function hasBooted(): boolean {
  return booted;
}

export function markBooted(): void {
  booted = true;
}

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Sprint 10E.4: splits a line's length into 3-8 character "flush" points —
 * a real terminal prints output in whatever chunks its buffer happened to
 * receive, not one character at a time. Returns cumulative prefix lengths
 * (e.g. [4, 11, 18, 22] for a 22-char line), so the caller reveals a
 * growing prefix of the text rather than re-deriving chunk boundaries.
 */
export function chunkBreakpoints(length: number): number[] {
  const points: number[] = [];
  let i = 0;
  while (i < length) {
    i = Math.min(length, i + Math.round(randomBetween(3, 8)));
    points.push(i);
  }
  return points.length > 0 ? points : [length];
}

export interface BootLine {
  /** Rendered verbatim, prefix (">"/"✓") included — plain terminal output. */
  text: string;
  /**
   * [min, max] ms to wait after the previous line finishes before this one
   * starts printing — simulates that line's own initialization step taking
   * however long it takes, not a fixed animation interval. A fresh value is
   * drawn from this range every time the sequence runs (see
   * useBootSequence.ts), so no two page loads look identical.
   */
  waitRange: [number, number];
  /** true only for the final success line, which renders in terminal green. */
  success?: boolean;
}

// Sprint 10E.1: intentionally plain, no portfolio/AI branding — a believable
// IDE/dev-environment startup log, not marketing copy. The repeated "Loading
// Workspace..." line is deliberate, not a bug — it's what makes it read as a
// real log rather than a scripted one. Exact wording/order per spec.
// Sprint 10E.4: per-line wait ranges replace 10E.3's fixed delays so timing
// varies run to run instead of repeating an identical rhythm. "Loading
// Extensions..." is deliberately the widest/slowest range — the one step
// meant to read as genuinely the longest-running. Line 8's wait range isn't
// specified by the brief (which only gives the post-success hold); [150,
// 220] pre-scaling was chosen to match the pace of the other short
// "Initializing..." steps rather than inventing a new tier.
//
// The brief's suggested ranges, combined with the chunked print bursts
// below, live-measured at ~3.0-3.5s total — well past the under-2s ceiling
// held across the three prior boot-timing sprints. Per explicit sign-off,
// every range here is ~55% of the brief's literal numbers (same relative
// shape/jitter/"Extensions is slowest" character, just compressed) rather
// than the values as originally suggested.
export const BOOT_SEQUENCE: BootLine[] = [
  { text: '> Loading Workspace...', waitRange: [120, 155] },
  { text: '> Launching Visual Studio Code...', waitRange: [100, 130] },
  { text: '> Loading Workspace...', waitRange: [65, 95] },
  { text: '> Loading Extensions...', waitRange: [165, 250] },
  { text: '> Initializing Git...', waitRange: [65, 100] },
  { text: '> Initializing TypeScript...', waitRange: [100, 145] },
  { text: '> Initializing Python...', waitRange: [75, 120] },
  { text: '✓ Workspace Ready.', waitRange: [85, 120], success: true },
];

// Cursor stays visible for a random pause in this range after "Workspace
// Ready." before handoff. Also scaled down from the brief's [300, 450] —
// see note above.
export const BOOT_HOLD_RANGE: [number, number] = [165, 250];
