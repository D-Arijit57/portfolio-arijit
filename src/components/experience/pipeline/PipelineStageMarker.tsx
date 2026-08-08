import React from 'react';
import type { PipelineStage } from '../../../experience/types';
import { isContributed } from '../../../experience/pipeline';
import { ACCENT, CONTENT_DIM, FAINT, METRIC, MUTED, RULE, STRONG, SURFACE, TEXT } from './tokens';

/**
 * One column on the axis — a tick sitting on the baseline, then the stage's
 * name, its outcome in a line, and its headline measurement.
 *
 * The column carries content rather than only marking a position: that's
 * what lets all four stages read at rest, and it's why the axis stops
 * looking like a progress stepper with 250px of empty track between dots.
 *
 * Emphasis is graded, not binary. A contributed stage gets a filled tick,
 * a bright name and body-weight prose; a context stage gets a hollow tick
 * and one step quieter type. Deliberately *not* reduced opacity — dimming
 * a whole column reads as "disabled", and intake isn't disabled, it's
 * simply a part of the system he didn't change.
 */
export function PipelineStageMarker({
  stage,
  selected,
  dimmed,
  stacked,
  tabId,
  panelId,
  onSelect,
  onHover,
}: {
  stage: PipelineStage;
  selected: boolean;
  /** Another column is hovered — recede, but stay legible. */
  dimmed: boolean;
  /** Narrow canvas: the axis has rotated to vertical rows. */
  stacked: boolean;
  tabId: string;
  panelId: string;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}) {
  const contributed = isContributed(stage);
  const headline = stage.metrics?.[0]?.value;

  const tickBorder = selected ? ACCENT : contributed ? FAINT : RULE;
  const tickFill = selected ? ACCENT : contributed ? FAINT : SURFACE;
  const labelColor = selected ? ACCENT : contributed ? STRONG : CONTENT_DIM;

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
      className={
        stacked
          ? 'group relative flex w-full items-baseline gap-3 py-2 pl-3 pr-2 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#4fc1ff]'
          : 'group relative flex flex-1 flex-col items-start px-3 pb-1 pt-3 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#4fc1ff]'
      }
      style={{
        backgroundColor: selected ? 'rgba(255,255,255,0.03)' : 'transparent',
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      {/* The tick, seated on the axis the track draws behind it. The
          surface-coloured ring lets the axis pass through rather than
          stop, so the document keeps flowing through stages he never
          touched. */}
      <span
        aria-hidden="true"
        className={stacked ? 'mt-[5px] h-[7px] w-[7px] shrink-0 transition-colors duration-150' : 'h-[7px] w-[7px] transition-colors duration-150'}
        style={{
          backgroundColor: tickFill,
          border: `1px solid ${tickBorder}`,
          boxShadow: `0 0 0 3px ${SURFACE}`,
        }}
      />

      <span
        className={
          stacked
            ? 'w-[62px] shrink-0 font-mono text-[11px] transition-colors duration-150'
            : 'mt-4 font-mono text-[11px] transition-colors duration-150'
        }
        style={{ color: labelColor }}
      >
        {stage.label}
      </span>

      {/* Stacked, the claim and its measurement share a column so a long
          value ("5 min → under 2 min") can't crush the claim beside it into
          one word per line. In column mode they're already stacked. */}
      <span className={stacked ? 'flex min-w-0 flex-1 flex-col gap-1' : 'contents'}>
        {/* A stage he changed states its outcome; one he didn't states what
            the stage is. Never an invented claim.

            The two-line floor in column mode is what keeps the metric rows
            across all four stages on one baseline once a claim wraps —
            without it, a stage whose claim runs to two lines pushes its
            measurement below its neighbours'. */}
        <span
          className={stacked ? 'text-[12px] leading-[1.5]' : 'mt-1.5 min-h-[36px] text-[12px] leading-[1.5]'}
          style={{ color: contributed ? TEXT : MUTED }}
        >
          {stage.claim ?? stage.description}
        </span>

        {headline && (
          <span
            className={
              stacked
                ? 'font-mono text-[11px] tabular-nums'
                : 'mt-2 font-mono text-[11px] tabular-nums'
            }
            style={{ color: METRIC }}
          >
            {headline}
          </span>
        )}
      </span>
    </button>
  );
}
