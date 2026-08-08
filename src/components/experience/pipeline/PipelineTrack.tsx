import React, { useRef, useState } from 'react';
import type { PipelineStage } from '../../../experience/types';
import { prefersReducedMotion } from '../../../lib/typingReveal';
import { PipelineStageMarker } from './PipelineStageMarker';
import { ACCENT, RULE } from './tokens';

/**
 * Where a tick's centre sits inside its own column/row: the button's own
 * leading padding (px-3 / pl-3 = 12px) plus half the 7px tick. The axis is
 * inset by this at both ends so it runs *from the first tick to the last*
 * and stops there. An axis that overshoots its final mark reads as a
 * workflow that continues past `retrieve` — it doesn't, and 237px of empty
 * rule was quietly implying stages that don't exist.
 */
const TICK_CENTRE_OFFSET_PX = 15.5;

/**
 * The spatial structure: an axis, not a stepper.
 *
 * A single line runs the length of the canvas with a tick seated on it per
 * stage, and each stage carries its own name, outcome and measurement. Two
 * things follow. The space is *used* rather than spanned — what was empty
 * track now holds the content it was leaving out — and the whole workflow
 * is readable at rest, so interaction adds depth instead of being the price
 * of comprehension.
 *
 * Stages are equal-sized, deliberately: the axis encodes **sequence, not
 * duration**. This dataset has exactly one commensurable before/after pair
 * (pipeline.ts's `comparisonGeometry`), so sizing by time would mean
 * inventing three of the four measurements. Proportional marks live inside
 * a stage's evidence, where real comparison data justifies them.
 *
 * The selected stage is marked by an accent rule along its leading edge —
 * the same affordance the editor tabs above use for the active tab. It's
 * borrowed from the workspace rather than invented, which is also what
 * makes it discoverable without instructions.
 *
 * `stacked` rotates the whole thing to vertical rows. That isn't a
 * cosmetic reflow: measured on the real shell, four columns hold up to a
 * ~630px pane, start overflowing vertically at ~500px as claims wrap to
 * three and four lines, and hit a hard ~80px column floor below ~330px
 * where the pane begins scrolling sideways. Rotating keeps
 * stage → claim → evidence intact at any width.
 */
export function PipelineTrack({
  stages,
  selectedId,
  idPrefix,
  stacked,
  onSelect,
}: {
  stages: PipelineStage[];
  selectedId: string | undefined;
  idPrefix: string;
  stacked: boolean;
  onSelect: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useRef(prefersReducedMotion()).current;

  if (stages.length === 0) return null;

  const selectedIndex = stages.findIndex((stage) => stage.id === selectedId);
  const share = 100 / stages.length;
  const spanToLastTick = `calc(${share * (stages.length - 1)}%)`;

  // Roving focus across the axis: the whole pipeline is one tab stop and
  // arrows move along it — the behaviour a tablist is expected to have, and
  // the reason this is a tablist rather than four loose buttons. Both key
  // pairs are accepted so the control doesn't change under a reader whose
  // window happens to be narrow.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const forward = ['ArrowRight', 'ArrowDown'];
    const back = ['ArrowLeft', 'ArrowUp'];
    if (![...forward, ...back, 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const current = Math.max(0, selectedIndex);
    const next = forward.includes(event.key)
      ? (current + 1) % stages.length
      : back.includes(event.key)
        ? (current - 1 + stages.length) % stages.length
        : event.key === 'Home'
          ? 0
          : stages.length - 1;

    onSelect(stages[next].id);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div className="relative">
      {/* The axis, drawn behind the ticks, spanning first tick to last. */}
      <div
        aria-hidden="true"
        className="absolute"
        style={
          stacked
            ? {
                left: TICK_CENTRE_OFFSET_PX,
                top: TICK_CENTRE_OFFSET_PX,
                height: spanToLastTick,
                width: 1,
                backgroundColor: RULE,
              }
            : {
                top: TICK_CENTRE_OFFSET_PX,
                left: TICK_CENTRE_OFFSET_PX,
                width: spanToLastTick,
                height: 1,
                backgroundColor: RULE,
              }
        }
      />

      {/* The selected-stage indicator: one element that slides between
          stages rather than four that switch on and off. The movement is
          what tells the reader they travelled along the same axis instead
          of opening a different panel. */}
      {selectedIndex >= 0 && (
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            backgroundColor: ACCENT,
            ...(stacked
              ? {
                  left: 0,
                  top: `${selectedIndex * share}%`,
                  height: `${share}%`,
                  width: 2,
                  transition: reduceMotion ? 'none' : 'top 180ms cubic-bezier(.22,1,.36,1)',
                }
              : {
                  top: 0,
                  left: `${selectedIndex * share}%`,
                  width: `${share}%`,
                  height: 2,
                  transition: reduceMotion ? 'none' : 'left 180ms cubic-bezier(.22,1,.36,1)',
                }),
          }}
        />
      )}

      <div
        ref={listRef}
        role="tablist"
        aria-label="Pipeline stages"
        aria-orientation={stacked ? 'vertical' : 'horizontal'}
        onKeyDown={handleKeyDown}
        className={stacked ? 'relative flex flex-col' : 'relative flex items-start'}
      >
        {stages.map((stage) => (
          <PipelineStageMarker
            key={stage.id}
            stage={stage}
            selected={stage.id === selectedId}
            stacked={stacked}
            // The selected stage never recedes: the evidence below belongs
            // to it, and dimming it while the reader points at a different
            // stage severs that link at exactly the moment they're
            // comparing the two.
            dimmed={hoveredId !== null && hoveredId !== stage.id && stage.id !== selectedId}
            tabId={`${idPrefix}-tab-${stage.id}`}
            panelId={`${idPrefix}-panel`}
            onSelect={() => onSelect(stage.id)}
            onHover={(hovering) => setHoveredId(hovering ? stage.id : null)}
          />
        ))}
      </div>
    </div>
  );
}
