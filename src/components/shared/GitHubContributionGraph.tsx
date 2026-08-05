import React, { useEffect, useState } from 'react';
import { useContributionCalendar } from '../../hooks/useContributionCalendar';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import { useInViewOnce } from '../../hooks/useInViewOnce';

// Brighter and more saturated than GitHub's own dark-mode scale — round 2
// of this reveal's feedback asked for the contribution greens to "pop"
// rather than read as GitHub's slightly muted default. Level 0 stays a
// VS Code-neutral tone (not GitHub's near-black) so it doesn't read as
// "missing data" against the editor chrome.
const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: '#20242c',
  1: '#0f5c33',
  2: '#00a844',
  3: '#2ecc55',
  4: '#4dff8f',
};

// Soft glow on only the two brightest levels — matches level 3/4's own
// color so it reads as the cell itself glowing, not an unrelated accent.
// Levels 0-2 stay glow-free; a glow on every colored cell would wash out
// the effect until nothing looks distinctly "bright" anymore.
const GLOW_BY_LEVEL: Partial<Record<0 | 1 | 2 | 3 | 4, string>> = {
  3: '0 0 4px rgba(46, 204, 85, 0.35)',
  4: '0 0 7px rgba(77, 255, 143, 0.55)',
};

function glowForLevel(level: 0 | 1 | 2 | 3 | 4): string {
  return GLOW_BY_LEVEL[level] ?? 'none';
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GitHub's own convention: label only Mon/Wed/Fri (index 1/3/5) to avoid
// crowding a 7-row grid this small; Sun/Tue/Thu/Sat stay blank but still
// occupy a row so the column height matches the day grid exactly.
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// Exported so ContributionsTerminal can check/gate the *same* "has this
// played this session" flag for its own command-line + container-clip
// staging — one sequence, one key, instead of two independently-timed
// gates that could drift out of sync on a repeat visit.
export const CONTRIBUTION_REVEAL_SESSION_KEY = 'github-contribution-graph';

// The reveal is two deliberately distinct left-to-right sweeps, not one —
// round 1's single opacity+color+scale pass read as "a carpet being
// unrolled" rather than individual contributions appearing. Phase A places
// the empty (level-0) grid plainly; a beat later, Phase B sweeps through
// again turning cells their real color with a pop + glow. Both phases are
// deterministic, left-to-right — a randomized step order (round 1's first
// attempt) can't produce a "reconstructing left to right" effect, and this
// codebase's own convention (see graph/motion/revealSchedule.ts) is to
// never use Math.random for motion timing anyway.
const PLACE_COLUMN_STAGGER_MS = 8;
const PLACE_TRANSITION_MS = 150;
// Pause between the last Phase A column landing and Phase B starting — long
// enough that the color pop reads as a distinct second pass, not a
// continuation of the same motion.
const PHASE_PAUSE_MS = 200;
// Round 3: slowed down and given a real spring bounce — round 2's snappy
// 9ms/160ms pop (single overshoot, no oscillation) read as a flat "snap"
// rather than cells physically settling into place one by one. The bounce
// shape itself now lives entirely in the `contribution-pop` keyframes
// (index.css) — rise past 1.0, dip under, small second overshoot, land —
// so the timing function here is a plain ease rather than a custom curve
// that would fight the keyframes' own oscillation.
const POP_COLUMN_STAGGER_MS = 22;
const POP_TRANSITION_MS = 480;
const POP_EASING = 'ease';
// How long the container's own left-to-right clip reveal takes before Phase
// A starts — only used by the standalone 'card' variant, which owns its
// own bordered box. ContributionsTerminal's 'bare' usage plays no separate
// container reveal: Phase A's own left-to-right placement already *is* the
// "structure appearing" motion, so a second overlapping directional reveal
// there would be redundant.
const CONTAINER_REVEAL_MS = 220;
// Buffer after Phase B's last column settles before the one-shot pulse on
// today's cell — long enough to read as "after", not "during".
const PULSE_DELAY_MS = 150;

interface GitHubContributionGraphProps {
  /** Defaults to the generated GitHub provider's contributions file — override only for reuse against a different source. */
  sourceFileId?: string;
  /**
   * 'card' (default): the original, self-contained bordered card with its
   * own "N contributions in the last year" heading — unchanged.
   * 'bare': just the labeled grid + legend, no wrapper chrome or heading,
   * for embedding inside a parent surface that owns its own chrome (see
   * ContributionsTerminal.tsx, which supplies the terminal window and the
   * stats footer instead).
   */
  variant?: 'card' | 'bare';
  /** Cell + gap size in px. Defaults match the original 'card' proportions; ContributionsTerminal passes larger values so the grid actually fills its wider surface instead of floating in unused space. */
  cellSize?: number;
  gap?: number;
  /**
   * Controlled trigger for the reveal sequence. Omit for standalone usage
   * (the 'card' widget dropped directly into markdown) — the graph then
   * drives itself off its own one-shot viewport intersection. Pass this
   * from ContributionsTerminal instead, which needs the reveal to start
   * only *after* its own command-line + container-clip stages finish, not
   * the moment the grid itself scrolls into view.
   */
  active?: boolean;
  /**
   * Fires once, after every column has visually settled into its final
   * state — ContributionsTerminal uses this to time its stats footer's
   * reveal so it never appears before (or on top of) the graph it's
   * describing.
   */
  onRevealComplete?: () => void;
}

/**
 * Reusable GitHub-style contribution heatmap. Reads real, already-hydrated
 * VFS content (VFS_DESIGN.md §11.5's `github:contributions` file) — no
 * network call of its own, no separate cache: the reconciled tree already
 * is the cache, and this re-renders automatically whenever a provider
 * refresh updates that file's content, since it subscribes to the store
 * directly rather than reading a point-in-time snapshot.
 */
export function GitHubContributionGraph({
  sourceFileId = 'github:contributions',
  variant = 'card',
  cellSize = 10,
  gap = 3,
  active,
  onRevealComplete,
}: GitHubContributionGraphProps) {
  const { file, calendar } = useContributionCalendar(sourceFileId);

  // Captured once at mount, not recomputed every render: markAnimated() is
  // called mid-sequence below, and if `skip` were a plain derived const it
  // would flip true on the very next re-render those state updates cause —
  // silently disabling the transitions the sequence just started.
  const [skip] = useState(() => !calendar || hasAnimated(CONTRIBUTION_REVEAL_SESSION_KEY) || prefersReducedMotion());
  const isControlled = active !== undefined;

  // Only used in standalone/uncontrolled usage — when ContributionsTerminal
  // drives `active` itself, this observer still attaches (harmless) but its
  // result is ignored in favor of the parent's own sequencing.
  const { ref: ownViewRef, inView: ownInView } = useInViewOnce<HTMLDivElement>(0.15);
  const trigger = isControlled ? (active as boolean) : ownInView;

  const [containerRevealed, setContainerRevealed] = useState(skip);
  const [placed, setPlaced] = useState(skip);
  const [colored, setColored] = useState(skip);
  const [pulsed, setPulsed] = useState(false);

  const totalWeeks = calendar?.weeks.length ?? 0;

  // Trigger → (card variant's own container clip) → Phase A (empty grid
  // placed left-to-right).
  useEffect(() => {
    if (skip || !trigger) return;
    markAnimated(CONTRIBUTION_REVEAL_SESSION_KEY);
    setContainerRevealed(true);

    // 'card' variant owns its own bordered box, so it plays the container
    // clip itself before Phase A starts. 'bare' variant has no box of its
    // own — Phase A's own placement sweep is the only structural reveal.
    const containerDelay = variant === 'card' ? CONTAINER_REVEAL_MS : 0;
    const placeTimeout = window.setTimeout(() => setPlaced(true), containerDelay);
    return () => clearTimeout(placeTimeout);
  }, [skip, trigger, variant]);

  // Phase A settles → beat → Phase B (color pop + glow, left-to-right).
  useEffect(() => {
    if (skip || !placed) return;
    const placeSettleMs = totalWeeks > 0 ? (totalWeeks - 1) * PLACE_COLUMN_STAGGER_MS + PLACE_TRANSITION_MS : 0;
    const colorTimeout = window.setTimeout(() => setColored(true), placeSettleMs + PHASE_PAUSE_MS);
    return () => clearTimeout(colorTimeout);
  }, [skip, placed, totalWeeks]);

  // Phase B settles → onRevealComplete (ContributionsTerminal's stats cue)
  // → one-shot pulse on today's cell.
  useEffect(() => {
    if (skip) {
      onRevealComplete?.();
      return;
    }
    if (!colored) return;

    const popSettleMs = totalWeeks > 0 ? (totalWeeks - 1) * POP_COLUMN_STAGGER_MS + POP_TRANSITION_MS : 0;
    const completeTimeout = window.setTimeout(() => onRevealComplete?.(), popSettleMs);

    let pulseTimeout: number | undefined;
    if (!prefersReducedMotion()) {
      pulseTimeout = window.setTimeout(() => setPulsed(true), popSettleMs + PULSE_DELAY_MS);
    }
    return () => {
      clearTimeout(completeTimeout);
      if (pulseTimeout !== undefined) clearTimeout(pulseTimeout);
    };
    // onRevealComplete is a parent-owned callback, not reactive state this
    // effect should re-run for — only `colored` flipping matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, colored, totalWeeks]);

  if (!file) {
    return (
      <div className="text-[13px] text-[#858585] italic py-2">
        GitHub contribution data isn't available yet.
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="text-[13px] text-[#858585] italic py-2">
        Contribution calendar unavailable this cycle.
      </div>
    );
  }

  const monthMarkers: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;
  calendar.weeks.forEach((week, weekIndex) => {
    const firstDay = week.days[0];
    if (!firstDay) return;
    const month = new Date(firstDay.date).getMonth();
    if (month !== lastMonth) {
      monthMarkers.push({ weekIndex, label: MONTH_LABELS[month] });
      lastMonth = month;
    }
  });

  const columnWidth = cellSize + gap;
  const todayIso = new Date().toISOString().slice(0, 10);

  const grid = (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1">
        <div className="flex flex-col pt-[18px]" style={{ gap }}>
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="text-[9px] leading-[10px] text-[#858585]" style={{ height: cellSize }}>
              {label}
            </span>
          ))}
        </div>

        <div className="relative inline-block">
          <div className="relative mb-1 h-[14px]" style={{ width: totalWeeks * columnWidth }}>
            {monthMarkers.map(({ weekIndex, label }) => (
              <span
                key={weekIndex}
                className="absolute top-0 text-[10px] text-[#858585]"
                style={{ left: weekIndex * columnWidth }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex" style={{ gap }}>
            {calendar.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col" style={{ gap }}>
                {week.days.map((day) => {
                  const isPlaced = skip || placed;
                  const isColored = skip || colored;
                  const color = isColored ? LEVEL_COLORS[day.level] : LEVEL_COLORS[0];
                  const glow = isColored ? glowForLevel(day.level) : 'none';
                  const isToday = pulsed && day.date === todayIso;
                  // Phase A (opacity) and Phase B (color/glow/pop) land in
                  // separate renders, so only one of these delays is ever
                  // "live" for a given value change — safe to share one
                  // transitionDelay across both phases' properties.
                  const delayMs = colored ? weekIndex * POP_COLUMN_STAGGER_MS : weekIndex * PLACE_COLUMN_STAGGER_MS;
                  return (
                    <div
                      key={day.date}
                      role="gridcell"
                      tabIndex={0}
                      aria-label={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}
                      title={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}
                      className={`rounded-[2px] outline-none focus-visible:ring-1 focus-visible:ring-[#007acc] ${isToday ? 'contribution-pulse' : ''}`}
                      style={{
                        backgroundColor: color,
                        boxShadow: glow,
                        height: cellSize,
                        width: cellSize,
                        opacity: isPlaced ? 1 : 0,
                        transition: skip
                          ? 'none'
                          : `opacity ${PLACE_TRANSITION_MS}ms ease-out, background-color ${POP_TRANSITION_MS}ms ${POP_EASING}, box-shadow ${POP_TRANSITION_MS}ms ${POP_EASING}`,
                        transitionDelay: skip ? '0ms' : `${delayMs}ms`,
                        animation:
                          !skip && colored
                            ? `contribution-pop ${POP_TRANSITION_MS}ms ${POP_EASING} ${weekIndex * POP_COLUMN_STAGGER_MS}ms`
                            : 'none',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const legend = (
    <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[#858585]">
      <span>Less</span>
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <div key={level} className="h-[10px] w-[10px] rounded-[2px]" style={{ backgroundColor: LEVEL_COLORS[level] }} />
      ))}
      <span>More</span>
    </div>
  );

  if (variant === 'bare') {
    return (
      <div
        ref={ownViewRef}
        className="font-mono text-[12px]"
        role="img"
        aria-label={`GitHub contribution calendar, ${calendar.totalContributions} contributions in the last year`}
      >
        {grid}
        {legend}
      </div>
    );
  }

  return (
    <div
      ref={ownViewRef}
      className="my-4 overflow-hidden rounded-md border border-[#333333] bg-[#1e1e1e] p-4 font-mono text-[12px]"
      role="img"
      aria-label={`GitHub contribution calendar, ${calendar.totalContributions} contributions in the last year`}
      style={{
        clipPath: containerRevealed ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
        transition: skip ? 'none' : `clip-path ${CONTAINER_REVEAL_MS}ms ease-out`,
      }}
    >
      <div className="mb-2 text-[#cccccc]">{calendar.totalContributions} contributions in the last year</div>
      {grid}
      {legend}
    </div>
  );
}
