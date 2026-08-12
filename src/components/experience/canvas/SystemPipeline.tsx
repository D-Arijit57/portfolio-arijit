import React, { useEffect, useId, useRef, useState } from 'react';
import type { PipelineStage } from '../../../experience/types';
import { isContributed } from '../../../experience/pipeline';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../../lib/typingReveal';
import { useInViewOnce } from '../../../hooks/useInViewOnce';
import { ExperienceTerminalPanel, PROMPT_ACCENT } from '../pipeline/terminal/ExperienceTerminalPanel';
import { PipelineStageOutput } from '../pipeline/terminal/PipelineStageOutput';
import { PipelineArrow } from '../pipeline/terminal/PipelineArrow';
import { StageDetail } from '../pipeline/StageDetail';
import { CONTENT_DIM, DIM, TEXT } from '../pipeline/tokens';

const SESSION_KEY = 'americanchase-canvas-pipeline';

/** How long a stage stays "executing" before handing off. ExperienceTerminalTwo's
 * own value, kept so the cascade runs at the speed this page already established. */
const STAGE_DWELL_MS = 150;

/** Enough of the column on screen to be worth watching unlock. */
const VISIBLE_THRESHOLD = 0.25;

/**
 * The engineering pipeline — the canvas's data-driven backbone.
 *
 * Vertical at every width, which is the one behavioural difference from
 * `ExperienceTerminalTwo`: that component switches orientation below 560px,
 * this one is always `horizontal={false}` and always `direction="down"`. Every
 * stage row is `PipelineStageOutput` and every connector `PipelineArrow`, both
 * unmodified — including the field rule that makes this artifact distinct from
 * architecture.ts: the row prints `claim ?? description` and the stage's
 * headline measurement, i.e. *what changed*, where the diagram prints
 * `description` and technologies, i.e. *what the system is*.
 *
 * The cascade is `ExperienceTerminalTwo`'s mechanic, ported rather than
 * reinvented: a stage settles, its connector carries a packet, and the
 * packet's own `animationend` unlocks the stage on the far side. No stage is
 * ever released by a timer counted alongside an animation. `instant` (reduced
 * motion, or a repeat visit this session) mounts everything settled.
 */
export function SystemPipeline({
  stages,
  activeStageId,
  onStageActiveChange,
  anchorRef,
  stageAnchorRef,
}: {
  stages: PipelineStage[];
  /** A stage highlighted from outside — e.g. an artifact being hovered. */
  activeStageId?: string | null;
  onStageActiveChange?: (stageId: string | null) => void;
  anchorRef?: (node: HTMLDivElement | null) => void;
  stageAnchorRef?: (stageId: string, node: HTMLDivElement | null) => void;
}) {
  const idPrefix = useId();
  const reduceMotion = prefersReducedMotion();
  const instant = useRef(reduceMotion || hasAnimated(SESSION_KEY)).current;

  const [unlocked, setUnlocked] = useState(instant ? stages.length : 0);
  const [pulsing, setPulsing] = useState<number | null>(null);
  // `defaultStageId()`'s own rule — the first stage worth opening is never a
  // context-only one — applied to the stage list directly, since this column
  // is handed stages rather than the whole visualization model.
  const [selectedId, setSelectedId] = useState(
    () => stages.find(isContributed)?.id ?? stages[0]?.id,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const { ref: inViewRef, inView } = useInViewOnce<HTMLDivElement>(VISIBLE_THRESHOLD);

  const complete = unlocked >= stages.length;
  const selected = stages.find((stage) => stage.id === selectedId);

  useEffect(() => {
    if (!instant) markAnimated(SESSION_KEY);
  }, [instant]);

  // First stage runs once the column is genuinely on screen.
  useEffect(() => {
    if (instant || !inView || unlocked > 0) return;
    setUnlocked(1);
  }, [instant, inView, unlocked]);

  // A stage settles → send its packet down the next connector.
  useEffect(() => {
    if (instant || unlocked === 0 || complete || pulsing !== null) return undefined;
    const timer = window.setTimeout(() => setPulsing(unlocked - 1), STAGE_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [instant, unlocked, complete, pulsing]);

  const handlePulseArrived = () => {
    setPulsing(null);
    setUnlocked((count) => Math.min(count + 1, stages.length));
  };

  // Roving tablist focus — ported unchanged from ExperienceTerminalTwo.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const forward = ['ArrowRight', 'ArrowDown'];
    const back = ['ArrowLeft', 'ArrowUp'];
    if (![...forward, ...back, 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const current = Math.max(0, stages.findIndex((stage) => stage.id === selectedId));
    const next = forward.includes(event.key)
      ? (current + 1) % stages.length
      : back.includes(event.key)
        ? (current - 1 + stages.length) % stages.length
        : event.key === 'Home'
          ? 0
          : stages.length - 1;

    setSelectedId(stages[next].id);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  if (stages.length === 0) return null;

  return (
    <div
      ref={(node) => {
        inViewRef.current = node;
        anchorRef?.(node);
      }}
    >
      <ExperienceTerminalPanel title="pipeline.sh">
        <div className="font-mono text-[12px]" style={{ color: TEXT }}>
          <span style={{ color: PROMPT_ACCENT }}>$</span> ./pipeline.sh
        </div>

        <div
          ref={listRef}
          role="tablist"
          aria-label="Pipeline stages"
          aria-orientation="vertical"
          onKeyDown={handleKeyDown}
          className="mt-4 flex w-full flex-col"
        >
          {stages.map((stage, index) => (
            <React.Fragment key={stage.id}>
              <div
                ref={(node) => stageAnchorRef?.(stage.id, node)}
                onMouseEnter={() => {
                  setHoveredId(stage.id);
                  onStageActiveChange?.(stage.id);
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  onStageActiveChange?.(null);
                }}
                // Keyboard parity. React's onFocus/onBlur are focusin/focusout
                // and so bubble from the tab button inside — without these,
                // arrowing through the stages moved selection but lit none of
                // the connectors that hovering the same row lights.
                onFocus={() => {
                  setHoveredId(stage.id);
                  onStageActiveChange?.(stage.id);
                }}
                onBlur={() => {
                  setHoveredId(null);
                  onStageActiveChange?.(null);
                }}
              >
                <PipelineStageOutput
                  stage={stage}
                  index={index}
                  horizontal={false}
                  dormant={index >= unlocked}
                  active={!complete && index === unlocked - 1}
                  selected={complete && stage.id === selectedId}
                  dimmed={
                    complete &&
                    hoveredId === null &&
                    activeStageId != null &&
                    activeStageId !== stage.id &&
                    stage.id !== selectedId
                  }
                  tabId={`${idPrefix}-tab-${stage.id}`}
                  panelId={`${idPrefix}-panel`}
                  onSelect={() => setSelectedId(stage.id)}
                  onHover={(hovering) => setHoveredId(hovering ? stage.id : null)}
                />

                {/* Contribution state as words, not only as the colour
                    PipelineStageOutput already varies — plus the highlight
                    indices this reading was interpreted from, so every row on
                    the column is traceable without opening anything. */}
                <div
                  className="mt-1 font-mono text-[10.5px]"
                  style={{ color: DIM, opacity: index >= unlocked ? 0 : 1, transition: 'opacity 250ms ease-out' }}
                >
                  {isContributed(stage) ? 'direct contribution' : 'context only'}
                  {stage.sourceHighlights.length > 0 && (
                    <> · {stage.sourceHighlights.map((i) => `h${i}`).join(' ')}</>
                  )}
                </div>
              </div>

              {index < stages.length - 1 && (
                <PipelineArrow
                  direction="down"
                  lit={index < unlocked - 1}
                  pulsing={pulsing === index}
                  onPulseEnd={handlePulseArrived}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {complete && selected && (
          <div
            key={selected.id}
            className={`mt-5 border-t pt-4 ${reduceMotion ? '' : 'animate-[fade-rise_320ms_ease-out_both]'}`}
            style={{ borderColor: '#333333' }}
          >
            <StageDetail
              stage={selected}
              panelId={`${idPrefix}-panel`}
              tabId={`${idPrefix}-tab-${selected.id}`}
            />
          </div>
        )}
      </ExperienceTerminalPanel>
    </div>
  );
}
