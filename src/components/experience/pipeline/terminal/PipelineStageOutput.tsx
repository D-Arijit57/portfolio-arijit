import React from 'react';
import type { PipelineStage } from '../../../../experience/types';
import { isContributed } from '../../../../experience/pipeline';
import { ACCENT, CONTENT_DIM, FAINT, METRIC, MUTED, STRONG, SUCCESS, TEXT } from '../tokens';

/**
 * A stage that has executed reports `200 OK`. This is a visual execution
 * metaphor for the pipeline stage completing, in the same register as the
 * `[0N]` numbering and the `./pipeline.sh` prompt — deliberately not a
 * claim of live instrumentation, which is why the page states
 * `visualization.derivedFrom` ("reconstructed from americanchase.yaml ·
 * not live instrumentation") in Terminal 1 above. No status is derived
 * from data, because none exists to derive: every stage that runs, runs.
 */
function StatusOk({ delayMs }: { delayMs?: number }) {
  return (
    <span
      className={delayMs === undefined ? undefined : 'animate-[fade-rise_320ms_ease-out_both]'}
      style={{ color: SUCCESS, animationDelay: delayMs === undefined ? undefined : `${delayMs}ms` }}
    >
      200 OK
    </span>
  );
}

/**
 * One `[0N] label` stage. Deliberately the same component in both of
 * Terminal 2's phases — during execution it prints as a line of output
 * (`variant="log"`), and in the settled system view it becomes a column
 * (`variant="column"`) — because they are the same stage showing the same
 * fields, not two different renderings of it. What changes between them
 * is only how the label/description/metric are arranged, which is exactly
 * what "recompose" should mean.
 *
 * Field selection is unchanged from the axis this replaced:
 * `stage.claim ?? stage.description` (a stage he changed states its
 * outcome; one he didn't states what the stage *is* — never an invented
 * claim) and `stage.metrics?.[0]?.value` as the headline. Emphasis is
 * graded rather than binary — a context-only stage reads one step quieter
 * instead of being dimmed to "disabled".
 */
export function PipelineStageOutput({
  stage,
  index,
  variant,
  horizontal = true,
  statusDelayMs,
  selected,
  dimmed,
  tabId,
  panelId,
  onSelect,
  onHover,
}: {
  stage: PipelineStage;
  index: number;
  variant: 'log' | 'column';
  /** Column variant only: whether the stages sit side by side. */
  horizontal?: boolean;
  /** Log variant only: how long after this line the `200 OK` lands. Undefined renders it immediately, with no animation. */
  statusDelayMs?: number;
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

  const numberColor = selected ? ACCENT : contributed ? FAINT : CONTENT_DIM;
  const labelColor = selected ? ACCENT : contributed ? STRONG : MUTED;
  const bodyColor = contributed ? TEXT : CONTENT_DIM;

  // Execution phase: a printed line of output. Not interactive — during
  // execution there is nothing to select yet, and making log lines
  // focusable would put four throwaway tab stops in front of the reader
  // before the real control even exists.
  if (variant === 'log') {
    return (
      <div>
        <span style={{ color: numberColor }}>[{number}]</span>{' '}
        <span style={{ color: labelColor }}>{stage.label}</span>
        {/* The status lands a beat after the line it belongs to, so it
            reads as the stage having *succeeded* rather than as part of
            the line announcing it started. */}
        <span className="ml-3">
          <StatusOk delayMs={statusDelayMs} />
        </span>
        <div className="pl-[38px] text-[12px]" style={{ color: bodyColor }}>
          {stage.claim ?? stage.description}
        </div>
      </div>
    );
  }

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
      className="block min-w-0 text-left transition-opacity duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#4fc1ff]"
      style={
        horizontal
          ? { flexGrow: 1, flexBasis: 0, opacity: dimmed ? 0.55 : 1 }
          : { opacity: dimmed ? 0.55 : 1 }
      }
    >
      <div className={horizontal ? 'truncate' : undefined}>
        <span style={{ color: numberColor }}>[{number}]</span>{' '}
        <span style={{ color: labelColor }}>{stage.label}</span>
        {/* Carried into the settled view too: the pipeline's final state is
            "all four stages executed successfully", and dropping the status
            the moment execution finishes would throw that away. No delay
            here — by this point every stage has already reported. */}
        <span className="ml-2.5 text-[11px]">
          <StatusOk />
        </span>
      </div>
      {/* Two-line floor, horizontal only: at 12px/1.5 a claim occupies
          18px per line, so reserving 36px keeps every stage's metric on
          one shared baseline across the row — without it, a stage whose
          claim wraps to two lines (extract's does at most widths) pushes
          its own measurement below its neighbours' and four metrics that
          should read as one row of results read as scattered. Same
          reasoning and same value as the axis this replaced. Stacked
          vertically there is no shared baseline to hold, so the same floor
          would only open a dead gap under every one-line claim. */}
      <div
        className={`mt-1.5 pr-3 text-[12px] leading-[1.5] ${horizontal ? 'min-h-[36px]' : ''}`}
        style={{ color: bodyColor }}
      >
        {stage.claim ?? stage.description}
      </div>
      {headline && (
        <div className={`${horizontal ? 'mt-2' : 'mt-1'} text-[11px] tabular-nums`} style={{ color: METRIC }}>
          {headline}
        </div>
      )}
    </button>
  );
}
