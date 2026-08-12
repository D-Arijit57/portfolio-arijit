import React, { useEffect, useId, useRef, useState } from 'react';
import type { PipelineStage } from '../../../experience/types';
import { isContributed } from '../../../experience/pipeline';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../../lib/typingReveal';
import { useInViewOnce } from '../../../hooks/useInViewOnce';
import { PipelineStageOutput } from '../pipeline/terminal/PipelineStageOutput';
import { CONTENT_DIM, DIM, RULE } from '../pipeline/tokens';

const SESSION_KEY = 'americanchase-canvas-pipeline';

/**
 * The pulse's cycle, and the fraction of it the packet spends travelling.
 *
 * Both must stay in sync with `@keyframes pipeline-pulse` in index.css: the
 * keyframe moves the dash over the first 30% and then holds it invisible, and
 * delaying each segment by exactly that fraction is what hands the packet down
 * the rail as one continuous descent rather than lighting every segment at
 * once. A CSS keyframe can't read a JS constant, so this pair is kept honest by
 * name and by this comment — the same arrangement `BOOT_LINE_ANIM_MS` already
 * has with `.boot-line-print`.
 */
const PULSE_PERIOD_S = 3.6;
const PULSE_TRAVEL_FRACTION = 0.3;

/** Enough of the column on screen to be worth watching flow. */
const VISIBLE_THRESHOLD = 0.15;

/** The rail's own column width — dot plus breathing room before the stage text. */
const RAIL_PX = 22;
const DOT_PX = 9;

/**
 * The engineering pipeline — the system flow itself, not another artifact.
 *
 * Deliberately *not* wrapped in `ExperienceTerminalPanel`: it has no traffic
 * lights, no title bar, no `$ ./pipeline.sh`, and no heading. The four stages
 * down a lit rail say "pipeline" without a label, and framing them as a
 * terminal window would have demoted the page's one first-class visualization
 * to a fourth card. The terminal shell stays where it belongs — on the
 * artifacts, which really are files and sessions.
 *
 * Flow reveal, top to bottom. A stage settles, the rail segment beneath it
 * draws, and the segment's own `animationend` is what reveals the next stage —
 * the same event-driven rule the rest of this workspace's sequencing follows,
 * with no timer counted alongside an animation. The segment reuses
 * `.execution-wire-draw` verbatim (`pathLength={100}` + `strokeDasharray="100"`,
 * so a short gap and a tall one draw at the same apparent speed), which also
 * means its `prefers-reduced-motion` behaviour is inherited rather than
 * reimplemented.
 *
 * Under reduced motion — or on a repeat visit this session — `instant` mounts
 * every stage revealed and every segment solid. That path is load-bearing, not
 * a nicety: `.execution-wire-draw` resolves to `animation: none` under reduced
 * motion, so no `animationend` would ever fire and a chain waiting on one
 * would stall forever.
 */
export function SystemPipeline({
  stages,
  accents,
  activeStageId,
  onStageActiveChange,
  anchorRef,
  stageAnchorRef,
}: {
  stages: PipelineStage[];
  /** Stage id → identity colour (see canvas/stageAccents.ts). */
  accents: Map<string, string>;
  activeStageId?: string | null;
  onStageActiveChange?: (stageId: string | null) => void;
  anchorRef?: (node: HTMLDivElement | null) => void;
  stageAnchorRef?: (stageId: string, node: HTMLDivElement | null) => void;
}) {
  const idPrefix = useId();
  const reduceMotion = prefersReducedMotion();
  const instant = useRef(reduceMotion || hasAnimated(SESSION_KEY)).current;

  /** How many stages have been revealed. */
  const [revealed, setRevealed] = useState(instant ? stages.length : 0);
  /** Index of the rail segment currently drawing, if any. */
  const [drawing, setDrawing] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState(
    () => stages.find(isContributed)?.id ?? stages[0]?.id,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const { ref: inViewRef, inView } = useInViewOnce<HTMLDivElement>(VISIBLE_THRESHOLD);

  const complete = revealed >= stages.length;
  const selected = stages.find((stage) => stage.id === selectedId);

  useEffect(() => {
    if (!instant) markAnimated(SESSION_KEY);
  }, [instant]);

  // The first stage arrives once the column is genuinely on screen.
  useEffect(() => {
    if (instant || !inView || revealed > 0) return;
    setRevealed(1);
  }, [instant, inView, revealed]);

  // A stage has settled → start drawing the segment below it. The segment's
  // own animationend reveals the next stage.
  useEffect(() => {
    if (instant || revealed === 0 || complete || drawing !== null) return;
    setDrawing(revealed - 1);
  }, [instant, revealed, complete, drawing]);

  const handleSegmentDrawn = () => {
    setDrawing(null);
    setRevealed((count) => Math.min(count + 1, stages.length));
  };

  // Roving tablist focus — ported unchanged from the previous pipeline.
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
      className="flex h-full min-h-0 flex-col"
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label="Pipeline stages"
        aria-orientation="vertical"
        onKeyDown={handleKeyDown}
        className="flex min-h-0 flex-1 flex-col"
      >
        {stages.map((stage, index) => {
          const accent = accents.get(stage.id) ?? RULE;
          const isRevealed = index < revealed;
          const last = index === stages.length - 1;

          return (
            <React.Fragment key={stage.id}>
              <div
                ref={(node) => stageAnchorRef?.(stage.id, node)}
                className="grid"
                style={{ gridTemplateColumns: `${RAIL_PX}px minmax(0, 1fr)` }}
                onMouseEnter={() => {
                  setHoveredId(stage.id);
                  onStageActiveChange?.(stage.id);
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  onStageActiveChange?.(null);
                }}
                // Keyboard parity — React's onFocus/onBlur are focusin/focusout
                // and bubble from the tab button inside.
                onFocus={() => {
                  setHoveredId(stage.id);
                  onStageActiveChange?.(stage.id);
                }}
                onBlur={() => {
                  setHoveredId(null);
                  onStageActiveChange?.(null);
                }}
              >
                <StageDot accent={accent} revealed={isRevealed} reduceMotion={reduceMotion} />

                <div
                  style={{
                    opacity: isRevealed ? 1 : 0,
                    transition: reduceMotion ? 'none' : 'opacity 220ms ease-out',
                  }}
                >
                  <PipelineStageOutput
                    stage={stage}
                    index={index}
                    horizontal={false}
                    dormant={false}
                    active={false}
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

                  <div className="mt-1 font-mono text-[10.5px]" style={{ color: DIM }}>
                    {isContributed(stage) ? 'direct contribution' : 'context only'}
                    {stage.sourceHighlights.length > 0 && (
                      <> · {stage.sourceHighlights.map((i) => `h${i}`).join(' ')}</>
                    )}
                  </div>
                </div>
              </div>

              {/* The flowing segment. `flex-1` is what lets the pipeline fill
                  its column: the gaps absorb whatever height the artifacts
                  beside them happen to need, so the rail reads as one long
                  run rather than four rows clustered at the top. */}
              {!last && (
                <RailSegment
                  accent={accent}
                  state={instant ? 'solid' : drawing === index ? 'drawing' : index < revealed - 1 ? 'solid' : 'idle'}
                  index={index}
                  pulsing={complete}
                  reduceMotion={reduceMotion}
                  onDrawn={handleSegmentDrawn}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* The indicators are the end of the column.
​
          The stage's full evidence — contribution sentence, before/after diff,
          technologies, highlight provenance — used to render here as a
          `StageDetail` panel and no longer does. It was the tallest block on
          the page and it restated, at length, what the stage row directly above
          it had already said in one line. The column now terminates on the key.
​
          Selection state, the tablist roles and the roving-focus handler all
          stay exactly as they were: they are what makes the stages keyboard
          navigable, and `aria-controls` still names a live panel id. Only the
          large explanatory surface is gone from the default presentation. */}
      <div style={{ paddingLeft: RAIL_PX }}>
        <StageLegend stages={stages} accents={accents} visible={complete} reduceMotion={reduceMotion} />
      </div>

      {/* The tabs' `aria-controls` target. Empty by design — the stage row is
          its own label — but present so the relationship the roles assert is
          real rather than dangling. */}
      <div id={`${idPrefix}-panel`} role="tabpanel" aria-labelledby={selected ? `${idPrefix}-tab-${selected.id}` : undefined} />
    </div>
  );
}

/** The node on the rail. Its ring is the stage's own identity colour — the
 * same value its connector and its legend entry wear. */
function StageDot({
  accent,
  revealed,
  reduceMotion,
}: {
  accent: string;
  revealed: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div aria-hidden="true" className="flex justify-center pt-[7px]">
      <span
        className="block shrink-0 rounded-full"
        style={{
          width: DOT_PX,
          height: DOT_PX,
          border: `1.5px solid ${accent}`,
          backgroundColor: revealed ? accent : 'transparent',
          opacity: revealed ? 1 : 0.35,
          // One restrained ring, only while lit — no bloom, no pulse.
          boxShadow: revealed ? `0 0 5px ${accent}55` : 'none',
          transition: reduceMotion ? 'none' : 'opacity 220ms ease-out, background-color 220ms ease-out, box-shadow 220ms ease-out',
        }}
      />
    </div>
  );
}

/**
 * One run of rail between two stages.
 *
 * An SVG `line` rather than a bordered div specifically so it can reuse
 * `.execution-wire-draw` — the workspace's existing one-shot draw, including
 * its `pathLength` normalisation and its reduced-motion override — instead of
 * needing a new keyframe. `onAnimationEnd` is the signal that advances the
 * pipeline; nothing downstream is released on a guessed duration.
 */
function RailSegment({
  accent,
  state,
  index,
  pulsing,
  reduceMotion,
  onDrawn,
}: {
  accent: string;
  state: 'idle' | 'drawing' | 'solid';
  /** Position in the rail — sets when this segment's packet departs. */
  index: number;
  /**
   * Whether the steady-state flow is running.
   *
   * Gated on the *whole* pipeline having settled rather than on this segment
   * alone, and that is load-bearing: `animation-delay` counts from the moment
   * an element mounts, so segments mounted one at a time by the reveal cascade
   * would each start their own clock and the staggered handoff would drift into
   * three unrelated blips. Mounting every pulse in one commit gives them a
   * shared origin, which is what makes the delays add up to a single packet
   * descending the rail.
   */
  pulsing: boolean;
  reduceMotion: boolean;
  onDrawn: () => void;
}) {
  return (
    <div
      aria-hidden="true"
      className="grid min-h-[26px] flex-1"
      style={{ gridTemplateColumns: `${RAIL_PX}px minmax(0, 1fr)` }}
    >
      <div className="relative">
        {/* The channel exists before anything flows through it. */}
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke={RULE} strokeWidth={1} />
          {state !== 'idle' && (
            <line
              x1="50%"
              y1="0"
              x2="50%"
              y2="100%"
              stroke={accent}
              strokeWidth={1.5}
              strokeOpacity={state === 'solid' ? 0.55 : 0.9}
              pathLength={100}
              strokeDasharray="100"
              className={state === 'drawing' ? 'execution-wire-draw' : undefined}
              onAnimationEnd={state === 'drawing' ? onDrawn : undefined}
            />
          )}

          {/* The travelling packet. Mounted only once this segment has settled,
              so the reveal cascade and the steady-state flow never overlap and
              the reader is never watching two different signals on one rail.
              One short round-capped dash on a pathLength=100 track — a dot, not
              a trail — with a small drop-shadow so it reads as luminous without
              lighting the rail it runs on. */}
          {pulsing && !reduceMotion && (
            <line
              x1="50%"
              y1="0"
              x2="50%"
              y2="100%"
              stroke={accent}
              strokeWidth={3}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="2 98"
              className="pipeline-pulse"
              style={{
                animationDelay: `${index * PULSE_PERIOD_S * PULSE_TRAVEL_FRACTION}s`,
                filter: `drop-shadow(0 0 3px ${accent})`,
              }}
            />
          )}
        </svg>
      </div>
      <div />
    </div>
  );
}

/**
 * The key, attached to the foot of the rail rather than floating elsewhere.
 *
 * Every entry names a real stage and reads its state from `isContributed` —
 * so it can never describe a stage the pipeline doesn't have, and the dot
 * beside it is the same colour that stage wears on the rail and on its
 * connectors. Explanatory UI, not a fifth artifact.
 */
function StageLegend({
  stages,
  accents,
  visible,
  reduceMotion,
}: {
  stages: PipelineStage[];
  accents: Map<string, string>;
  visible: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div
      className="mt-4 border-t pt-3"
      style={{
        borderColor: RULE,
        opacity: visible ? 1 : 0,
        transition: reduceMotion ? 'none' : 'opacity 260ms ease-out',
      }}
    >
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {stages.map((stage) => (
          <li key={stage.id} className="flex items-center gap-2 font-mono text-[10.5px]">
            <span
              aria-hidden="true"
              className="block h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: accents.get(stage.id) ?? RULE }}
            />
            <span style={{ color: CONTENT_DIM }}>{stage.label}</span>
            <span style={{ color: DIM }}>
              {isContributed(stage) ? 'direct contribution' : 'context only'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
