import React from 'react';
import type { PipelineStage } from '../../../../experience/types';
import { isContributed } from '../../../../experience/pipeline';
import { ACCENT, CONTENT_DIM, FAINT, METRIC, MUTED, STRONG, TEXT } from '../tokens';

/**
 * One `[0N] label` stage of the pipeline.
 *
 * Three states, which together are what make the unlock sequence legible:
 *
 *   dormant   — the pipeline hasn't reached this stage yet. Present and
 *               positioned (so the architecture's shape is visible from
 *               the first frame and nothing reflows as it fills in) but
 *               clearly not yet run: heavily reduced opacity, and its
 *               measurement withheld until the stage that produces it has
 *               actually executed.
 *   active    — currently executing. Takes the accent and a cursor; it is
 *               deliberately the only stage carrying the strong accent at
 *               any moment, so "where the pipeline is" is unambiguous.
 *   settled   — executed. Full opacity, normal text, no cursor, no accent
 *               unless the reader has selected it.
 *
 * No `200 OK` here. Execution status belonged to the running sequence, not
 * to the finished architecture — the completed pipeline states system
 * structure (stage, what it does, what it measured), and stamping every
 * node with an HTTP-shaped status made four process steps read as four
 * network calls, which is not what the source describes.
 *
 * Field selection is unchanged from the axis this replaced:
 * `stage.claim ?? stage.description` (a stage he changed states its
 * outcome; one he didn't states what the stage *is* — never an invented
 * claim) and `stage.metrics?.[0]?.value` as the headline.
 */
export function PipelineStageOutput({
  stage,
  index,
  horizontal = true,
  dormant = false,
  active = false,
  shockwave = false,
  selected,
  dimmed,
  tabId,
  panelId,
  onSelect,
  onHover,
}: {
  stage: PipelineStage;
  index: number;
  /** Whether the stages sit side by side. */
  horizontal?: boolean;
  /** The pipeline hasn't unlocked this stage yet. */
  dormant?: boolean;
  /** This stage is the one currently executing. */
  active?: boolean;
  /** The unlock pulse just landed here — mount a brief impact ring. */
  shockwave?: boolean;
  selected: boolean;
  dimmed: boolean;
  tabId: string;
  panelId: string;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}) {
  const contributed = isContributed(stage);
  const headline = stage.metrics?.[0]?.value;
  const number = String(index + 1).padStart(2, '0');

  // `active` outranks `selected` for the accent: while the pipeline is
  // running, the accent means "executing here"; once it has settled,
  // nothing is active and the accent goes back to meaning "selected".
  const accented = active || selected;
  const numberColor = accented ? ACCENT : contributed ? FAINT : CONTENT_DIM;
  const labelColor = accented ? ACCENT : contributed ? STRONG : MUTED;
  const bodyColor = contributed ? TEXT : CONTENT_DIM;

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onFocus={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="relative block min-w-0 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#4fc1ff]"
      style={{
        ...(horizontal ? { flexGrow: 1, flexBasis: 0 } : {}),
        opacity: dormant ? 0.32 : dimmed ? 0.55 : 1,
        transition: 'opacity 250ms ease-out',
      }}
    >
      {/* The impact cue for this stage's own unlock — anchored on the
          `[0N]` marker, the exact point the incoming pulse arrives at. */}
      {shockwave && <span aria-hidden="true" className="pipeline-shockwave" />}

      <div className={horizontal ? 'truncate' : undefined}>
        <span style={{ color: numberColor }}>[{number}]</span>{' '}
        <span style={{ color: labelColor }}>{stage.label}</span>
        {active && (
          <span className="typing-reveal-cursor ml-1.5 inline-block h-[11px] w-[6px] bg-[#cccccc] align-baseline" />
        )}
      </div>

      {/* Two-line floor, horizontal only: at 12px/1.5 a claim occupies
          18px per line, so reserving 36px keeps every stage's metric on
          one shared baseline across the row — without it, a stage whose
          claim wraps to two lines pushes its own measurement below its
          neighbours' and four metrics that should read as one row of
          results read as scattered. Stacked vertically there is no shared
          baseline to hold, so the same floor would only open a dead gap. */}
      <div
        className={`mt-1.5 pr-3 text-[12px] leading-[1.5] ${horizontal ? 'min-h-[36px]' : ''}`}
        style={{ color: bodyColor }}
      >
        {stage.claim ?? stage.description}
      </div>

      {/* The measurement is a *result*, so it only exists once the stage
          that produced it has run. The row keeps its height either way
          (see the floor above), so nothing shifts when it lands. */}
      {headline && (
        <div
          className={`${horizontal ? 'mt-2' : 'mt-1'} text-[11px] tabular-nums`}
          style={{
            color: METRIC,
            opacity: dormant ? 0 : 1,
            transition: 'opacity 250ms ease-out',
          }}
        >
          {headline}
        </div>
      )}
    </button>
  );
}
