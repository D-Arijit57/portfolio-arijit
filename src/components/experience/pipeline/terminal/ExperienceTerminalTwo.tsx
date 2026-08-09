import React, { useEffect, useId, useRef, useState } from 'react';
import type { PipelineStage, PipelineVisualizationModel } from '../../../../experience/types';
import { defaultStageId } from '../../../../experience/pipeline';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../../../lib/typingReveal';
import { CONTENT_DIM, DIM } from '../tokens';
import { StageDetail } from '../StageDetail';
import { ExperienceTerminalPanel } from './ExperienceTerminalPanel';
import { PipelineStageOutput } from './PipelineStageOutput';
import { PipelineArrow } from './PipelineArrow';

const SESSION_KEY = 'americanchase-terminal-two-sequence';
const TAB_TITLE = '$ ./pipeline.sh';
const BOOT_LINE = 'initializing document pipeline...';

// Execution timing. Sums to ~2.0s for four stages, inside the brief's
// 1.5–3s budget: boot line, then one stage per STAGE_MS, then a beat to
// read the finished log before it recomposes, then the crossfade itself.
const BOOT_MS = 260;
const STAGE_MS = 240;
const SETTLE_HOLD_MS = 480;
const CROSSFADE_MS = 200;
/** How long after a stage prints its `200 OK` lands — enough to read as the
 * stage having completed, short enough not to stall the next one. */
const STATUS_LAG_MS = 130;

/**
 * Container widths driving the pipeline's arrangement, measured against
 * the panel itself (not the viewport — this lives inside a resizable
 * editor pane, the same reasoning PipelineTrack's old breakpoint
 * documented).
 *
 * Above WIDE: four columns with generous connector lines. Between MEDIUM
 * and WIDE: still horizontal, but the arrows give up most of their length
 * to the columns first — the brief's "reduce gaps between stages rather
 * than immediately switching to vertical." Below MEDIUM: four columns
 * can't hold a two-line claim without wrapping to four or five lines
 * each, so it rotates to a vertical stack.
 */
const WIDE_BREAKPOINT_PX = 860;
const MEDIUM_BREAKPOINT_PX = 560;

type Tier = 'wide' | 'medium' | 'narrow';
type Phase = 'boot' | 'executing' | 'crossfade' | 'system';

/**
 * Terminal 2 — "How did the system work?" Two phases, and the transition
 * between them is the point of this component.
 *
 * PHASE A (`boot` → `executing`): `./pipeline.sh` prints a boot line, then
 * emits each stage as a line of terminal output, top to bottom, the way a
 * command actually reports progress.
 *
 * PHASE B (`crossfade` → `system`): once every stage has reported, the log
 * gives way to the finished horizontal pipeline — four columns joined by
 * drawn connectors, all four readable at rest, using the full width of the
 * terminal. The reading is "the command finished executing and is now
 * presenting the resulting system structure," which is why it's a
 * recompose rather than an append.
 *
 * The transition is a plain opacity crossfade with a few pixels of
 * translate — no FLIP, no measurement, no layout library. That's a
 * deliberate ceiling: a true position-interpolated morph would need
 * per-element measurement on a container whose height is changing anyway,
 * for a payoff the brief explicitly doesn't want ("no bouncing, no
 * excessive scaling, no dramatic zoom" — subtle translate + opacity "is
 * enough").
 *
 * Selection survives as a *secondary* interaction: all four stages read
 * without any clicking, and selecting one opens its fuller evidence
 * (StageDetail — the diff, remaining metrics, technologies and
 * `sourceHighlights` citation) below the flow. StageDetail is reused
 * completely unmodified.
 *
 * Reduced motion / a repeat visit this session (`instant`) mounts
 * straight into `system` — the complete final pipeline, no execution
 * sequence, nothing missing.
 */
export function ExperienceTerminalTwo({
  visualization,
  active = true,
}: {
  visualization: PipelineVisualizationModel;
  /**
   * False until the execution chain upstream has physically handed off to
   * this terminal (see PipelineVisualization). While false the panel is
   * dormant and — the part that matters — its execution sequence has not
   * started: the timer chain below is gated on this, so the pipeline can
   * never begin running before the pulse carrying that instruction has
   * actually arrived.
   */
  active?: boolean;
}) {
  const idPrefix = useId();
  const stages = visualization.stages;
  const reduceMotion = prefersReducedMotion();
  const instant = useRef(reduceMotion || hasAnimated(SESSION_KEY)).current;

  const [phase, setPhase] = useState<Phase>(instant ? 'system' : 'boot');
  const [loggedCount, setLoggedCount] = useState(instant ? stages.length : 0);
  const [selectedId, setSelectedId] = useState(() => defaultStageId(visualization));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('wide');

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = stages.find((stage) => stage.id === selectedId);

  useEffect(() => {
    if (!instant) markAnimated(SESSION_KEY);
  }, [instant]);

  // The execution sequence, as one chain of timers. Each step schedules
  // only the next one, so there is never more than a single pending timer
  // and unmounting mid-sequence cancels cleanly.
  useEffect(() => {
    // `!active` is the gate: nothing in this terminal starts until the
    // wire's pulse has landed and woken it.
    if (instant || !active) return undefined;

    let timer: number;
    if (phase === 'boot') {
      timer = window.setTimeout(() => setPhase('executing'), BOOT_MS);
    } else if (phase === 'executing' && loggedCount < stages.length) {
      timer = window.setTimeout(() => setLoggedCount((count) => count + 1), STAGE_MS);
    } else if (phase === 'executing') {
      timer = window.setTimeout(() => setPhase('crossfade'), SETTLE_HOLD_MS);
    } else if (phase === 'crossfade') {
      timer = window.setTimeout(() => setPhase('system'), CROSSFADE_MS);
    } else {
      return undefined;
    }
    return () => window.clearTimeout(timer);
  }, [instant, active, phase, loggedCount, stages.length]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width === 0) return;
      setTier(width >= WIDE_BREAKPOINT_PX ? 'wide' : width >= MEDIUM_BREAKPOINT_PX ? 'medium' : 'narrow');
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Roving tablist focus — ported unchanged from PipelineTrack.tsx: both
  // arrow pairs accepted so the control doesn't change under a reader
  // whose pane happens to be narrow (where the flow is vertical).
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

  const inSystemView = phase === 'system';
  const horizontal = tier !== 'narrow';
  const arrowGrow = tier === 'wide' ? 0.5 : 0.16;

  const renderColumn = (stage: PipelineStage, i: number) => (
    <PipelineStageOutput
      key={stage.id}
      stage={stage}
      index={i}
      variant="column"
      horizontal={horizontal}
      selected={stage.id === selectedId}
      dimmed={hoveredId !== null && hoveredId !== stage.id && stage.id !== selectedId}
      tabId={`${idPrefix}-tab-${stage.id}`}
      panelId={`${idPrefix}-panel`}
      onSelect={() => setSelectedId(stage.id)}
      onHover={(hovering) => setHoveredId(hovering ? stage.id : null)}
    />
  );

  return (
    <ExperienceTerminalPanel title={TAB_TITLE} dormant={!active}>
      <div ref={containerRef}>
        {/* Waiting for input: the terminal exists and is recognizable, it
            just hasn't been handed anything to run yet. A cursor rather
            than a blank body, the same way ExecutionReplayTerminal shows a
            woken-but-not-yet-producing shell. */}
        {!active && (
          <span className="typing-reveal-cursor inline-block h-[13px] w-[7px] bg-[#cccccc] align-text-bottom" />
        )}

        {/* PHASE A — execution log. Held in the DOM through `crossfade`
            so it can fade rather than pop out. */}
        {active && !inSystemView && (
          <div
            style={{
              opacity: phase === 'crossfade' ? 0 : 1,
              transform: phase === 'crossfade' ? 'translateY(-4px)' : 'none',
              transition: `opacity ${CROSSFADE_MS}ms ease-out, transform ${CROSSFADE_MS}ms ease-out`,
            }}
          >
            <p style={{ color: CONTENT_DIM }}>{BOOT_LINE}</p>
            <div className="mt-3 space-y-2">
              {stages.slice(0, loggedCount).map((stage, i) => (
                <PipelineStageOutput
                  key={stage.id}
                  stage={stage}
                  index={i}
                  variant="log"
                  statusDelayMs={STATUS_LAG_MS}
                  selected={false}
                  dimmed={false}
                  tabId={`${idPrefix}-log-${stage.id}`}
                  panelId={`${idPrefix}-panel`}
                  onSelect={() => undefined}
                  onHover={() => undefined}
                />
              ))}
              {loggedCount < stages.length && (
                <span className="typing-reveal-cursor inline-block h-[13px] w-[7px] bg-[#cccccc] align-text-bottom" />
              )}
            </div>
          </div>
        )}

        {/* PHASE B — the settled system view. CSS keyframe rather than a
            Motion animation: index.css's `fade-rise` already carries a
            prefers-reduced-motion override keyed to this exact class, and
            this is a one-shot fade that never needs an animation library
            (see ExperienceTerminalOne's `line` comment for the full
            reasoning). `instant` skips it outright. */}
        {inSystemView && (
          <div className={instant ? undefined : 'animate-[fade-rise_320ms_ease-out_both]'}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: DIM }}>
              pipeline
            </p>

            <div
              ref={listRef}
              role="tablist"
              aria-label="Pipeline stages"
              aria-orientation={horizontal ? 'horizontal' : 'vertical'}
              onKeyDown={handleKeyDown}
              className={horizontal ? 'mt-4 flex w-full items-start' : 'mt-4 flex w-full flex-col'}
            >
              {stages.map((stage, i) => (
                <React.Fragment key={stage.id}>
                  {renderColumn(stage, i)}
                  {i < stages.length - 1 && (
                    <PipelineArrow direction={horizontal ? 'right' : 'down'} grow={arrowGrow} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {selected && (
              // Keyed on the stage so switching crossfades the evidence
              // rather than swapping it instantly — the movement is what
              // reads as travelling along the same pipeline instead of
              // opening a different panel.
              <div
                key={selected.id}
                className={`mt-6 ${reduceMotion ? '' : 'animate-[fade-rise_320ms_ease-out_both]'}`}
              >
                <StageDetail
                  stage={selected}
                  panelId={`${idPrefix}-panel`}
                  tabId={`${idPrefix}-tab-${selected.id}`}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ExperienceTerminalPanel>
  );
}
