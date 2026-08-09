import React, { useEffect, useId, useRef, useState } from 'react';
import type { PipelineStage, PipelineVisualizationModel } from '../../../../experience/types';
import { defaultStageId } from '../../../../experience/pipeline';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../../../lib/typingReveal';
import { CONTENT_DIM, DIM, SUCCESS, TEXT } from '../tokens';
import { StageDetail } from '../StageDetail';
import { ExperienceTerminalPanel } from './ExperienceTerminalPanel';
import { PipelineStageOutput } from './PipelineStageOutput';
import { PipelineArrow } from './PipelineArrow';

const SESSION_KEY = 'americanchase-terminal-two-sequence';
const TAB_TITLE = '$ ./pipeline.sh';

/**
 * The boot block prints one line at a time, at irregular gaps rather than
 * one uniform stagger — an even 70ms-apart cadence (the first attempt at
 * this) still read as a UI list revealing itself, not a process actually
 * running. Real boot/network output doesn't arrive on a metronome: sending
 * a request is instant, waiting for a response isn't. So the gap before
 * `establishing connection...` and especially before `HTTP/1.1 200 OK`
 * (the "waiting on the network" beat) are deliberately longer than the
 * others, which are near-back-to-back.
 */
const BOOT_LINE_DELAYS_MS = [0, 160, 240, 460, 560];
/** Matches `.boot-line-print`'s own animation-duration in index.css — kept
 * as a constant so BOOT_MS's math stays honest about where it comes from,
 * even though the class itself must stay a literal string (it's not a
 * Tailwind arbitrary value — `boot-line-print` is a plain index.css class —
 * but the same "can't read a JS variable" rule applies to keeping the two
 * in sync by hand). */
const BOOT_LINE_ANIM_MS = 70;
/** Read pause after the last line lands before PIPELINE appears. */
const BOOT_SETTLE_MS = 180;
/**
 * How long the boot block takes to fully print before the PIPELINE header
 * and stage row appear — the last line's own delay plus its animation plus
 * a short settle beat to actually read "pipeline ready".
 */
const BOOT_MS = BOOT_LINE_DELAYS_MS[BOOT_LINE_DELAYS_MS.length - 1] + BOOT_LINE_ANIM_MS + BOOT_SETTLE_MS;

/**
 * How long a stage stays "executing" before it hands off. Kept short and
 * overlapped with the 150ms pulse (index.css's `pipeline-pulse-x`/`-y`,
 * tightened twice now — 600ms, then 260ms, now 150ms, each pass watched at
 * real speed and still reading as a dot drifting rather than a packet
 * arriving) so the whole unlock reads as one fast, continuous process:
 * 3 × (150 + 150) ≈ 0.9s from first stage to last, which is the budget this
 * sequence has to live inside. Adding a per-stage status line or a longer
 * dwell would push it past the point where it stops feeling like execution
 * and starts feeling like waiting.
 */
const STAGE_DWELL_MS = 150;

/** How long the shockwave ring at a freshly-unlocked stage stays mounted —
 * matched to `.pipeline-shockwave`'s own animation-duration in index.css,
 * trimmed alongside the pulse so a slower ring doesn't outlast the faster
 * packet that triggers it. */
const SHOCKWAVE_MS = 260;

const WIDE_BREAKPOINT_PX = 860;
const MEDIUM_BREAKPOINT_PX = 560;

type Tier = 'wide' | 'medium' | 'narrow';

/**
 * Terminal 2 — "How did the system work?"
 *
 * The pipeline is not displayed, it is executed. The horizontal
 * architecture is laid out in full from the first frame — every stage in
 * its final position, every connector present — but only the first stage
 * has run. The rest sit dormant, visible enough to show the shape of the
 * system without pretending to have produced anything yet.
 *
 * Then it unlocks left to right: a stage executes, its connector carries a
 * packet to the next, that stage wakes, and so on. Each unlock is released
 * by the pulse's own `animationend`, never by a timer counted alongside it
 * — the same rule that governs the wire between Terminal 1 and Terminal 2,
 * and the same rule CortexaExecutionFlow's chain is built on.
 *
 * Reserving the final layout up front (rather than building vertically and
 * recomposing) is deliberate: nothing reflows during the sequence, the
 * reader's eye never has to re-find a stage, and the architecture is
 * legible from the first frame for anyone who doesn't want to watch.
 *
 * `instant` (reduced motion, or a repeat visit this session) mounts every
 * stage unlocked, every connector lit, nothing animating.
 *
 * `active` and `running` are deliberately separate gates. `active` wakes the
 * panel and prints its static shell — the exec line and the full four-stage
 * architecture, every stage dormant — which is cheap and safe to do even
 * off-screen, the same way a woken terminal in Cortexa brightens before it
 * has anything to print. `running` additionally requires the reader to have
 * actually scrolled the panel into view (see PipelineVisualization's
 * `pipelineMayRun`) before the stage-by-stage unlock cascade is allowed to
 * start: the part worth watching never runs somewhere nobody's watching it.
 */
export function ExperienceTerminalTwo({
  visualization,
  active = true,
  running = active,
}: {
  visualization: PipelineVisualizationModel;
  /** False until the wire from Terminal 1 has physically handed off. */
  active?: boolean;
  /** False until the reader has scrolled the panel meaningfully into view. */
  running?: boolean;
}) {
  const idPrefix = useId();
  const stages = visualization.stages;
  const reduceMotion = prefersReducedMotion();
  const instant = useRef(reduceMotion || hasAnimated(SESSION_KEY)).current;

  /** How many stages have executed. The stage at this index - 1 is the newest. */
  const [unlocked, setUnlocked] = useState(instant ? stages.length : 0);
  /** Index of the connector currently carrying a packet, if any. */
  const [pulsing, setPulsing] = useState<number | null>(null);
  /** The stage a pulse just landed on — mounts a brief shockwave ring, then
   * clears itself. Never set under `instant`: reduced motion / a repeat
   * visit renders the settled pipeline directly, with nothing to unlock. */
  const [justUnlockedIndex, setJustUnlockedIndex] = useState<number | null>(null);
  /** The boot block (below) has been on screen long enough to read — gates
   * the PIPELINE header/stage row appearing, independent of `running`'s
   * scroll gate, so a reader who scrolled early still sees the boot output
   * land before anything unlocks. */
  const [bootDone, setBootDone] = useState(instant);
  const [selectedId, setSelectedId] = useState(() => defaultStageId(visualization));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('wide');

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const complete = unlocked >= stages.length;
  const selected = stages.find((stage) => stage.id === selectedId);

  useEffect(() => {
    if (!instant) markAnimated(SESSION_KEY);
  }, [instant]);

  // The boot block reads for BOOT_MS, independent of scroll visibility —
  // like the static shell it follows, it's cheap enough to run off-screen.
  useEffect(() => {
    if (instant || !active || bootDone) return undefined;
    const timer = window.setTimeout(() => setBootDone(true), BOOT_MS);
    return () => window.clearTimeout(timer);
  }, [instant, active, bootDone]);

  // The first stage runs once this terminal has booted, is actually in
  // view, and has somewhere to print — the wire's packet has nowhere to
  // visibly land until all three are true.
  useEffect(() => {
    if (instant || !running || !bootDone || unlocked > 0) return;
    setUnlocked(1);
    setJustUnlockedIndex(0);
  }, [instant, running, bootDone, unlocked]);

  // A stage finishes executing → send its packet down the next connector.
  // The packet's own animationend is what unlocks the far side (below).
  useEffect(() => {
    if (instant || !active || unlocked === 0 || complete || pulsing !== null) return undefined;
    const timer = window.setTimeout(() => setPulsing(unlocked - 1), STAGE_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [instant, active, unlocked, complete, pulsing]);

  const handlePulseArrived = () => {
    setPulsing(null);
    setUnlocked((count) => {
      const next = Math.min(count + 1, stages.length);
      setJustUnlockedIndex(next - 1);
      return next;
    });
  };

  // The shockwave is a brief impact cue, not a persistent state — it clears
  // itself shortly after mounting rather than waiting on anything downstream.
  useEffect(() => {
    if (justUnlockedIndex === null) return undefined;
    const timer = window.setTimeout(() => setJustUnlockedIndex(null), SHOCKWAVE_MS);
    return () => window.clearTimeout(timer);
  }, [justUnlockedIndex]);

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

  // Roving tablist focus — ported unchanged from PipelineTrack.tsx.
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

  const horizontal = tier !== 'narrow';
  const arrowGrow = tier === 'wide' ? 0.5 : 0.16;

  /**
   * Per-line stagger for the boot block. Deliberately `.boot-line-print`
   * (index.css), not the `fade-rise` keyframe ExperienceTerminalOne's
   * `block` helper uses elsewhere on this page: fade-rise eases opacity
   * *and* slides the line up 6px, which reads as a UI element animating in.
   * Terminal output doesn't slide, it just appears — `.boot-line-print` is
   * a fast (70ms) linear opacity-only fade with no easing curve to soften
   * either end, close enough to a snap that it reads as "printed" rather
   * than "faded in". `instant` (reduced motion, or a repeat visit this
   * session) renders every line already in place.
   */
  const bootLine = (index: number, className: string, style?: React.CSSProperties) => {
    if (instant) return { className, style };
    return {
      className: `${className} boot-line-print`,
      style: { ...style, animationDelay: `${BOOT_LINE_DELAYS_MS[index] / 1000}s` },
    };
  };

  const renderStage = (stage: PipelineStage, i: number) => (
    <PipelineStageOutput
      key={stage.id}
      stage={stage}
      index={i}
      horizontal={horizontal}
      dormant={i >= unlocked}
      // The newest stage is "executing" until its packet leaves; once the
      // pipeline has settled nothing is active and the accent reverts to
      // marking the reader's own selection.
      active={!complete && i === unlocked - 1}
      shockwave={justUnlockedIndex === i}
      selected={complete && stage.id === selectedId}
      dimmed={complete && hoveredId !== null && hoveredId !== stage.id && stage.id !== selectedId}
      tabId={`${idPrefix}-tab-${stage.id}`}
      panelId={`${idPrefix}-panel`}
      onSelect={() => setSelectedId(stage.id)}
      onHover={(hovering) => setHoveredId(hovering ? stage.id : null)}
    />
  );

  return (
    <ExperienceTerminalPanel title={TAB_TITLE} dormant={!active}>
      <div ref={containerRef}>
        {!active ? (
          // Woken but not yet handed anything to run: a cursor, not a
          // blank body — the same way a real shell waits.
          <span className="typing-reveal-cursor inline-block h-[13px] w-[7px] bg-[#cccccc] align-text-bottom" />
        ) : (
          <>
            {/* Boot output — where `200 OK` actually belongs: a property of
                the process starting, not of every stage it later runs.
                Printed one line at a time (BOOT_LINE_STEP_MS apart) so it
                reads as quick succession rather than one block appearing or
                a slow typing demo. */}
            <div>
              <p {...bootLine(0, '', { color: CONTENT_DIM })}>
                <span style={{ color: DIM }}>&gt; </span>initializing document pipeline...
              </p>
              <p {...bootLine(1, '', { color: CONTENT_DIM })}>
                <span style={{ color: DIM }}>&gt; </span>establishing connection...
              </p>
              <p {...bootLine(2, '', { color: CONTENT_DIM })}>
                <span style={{ color: DIM }}>&gt; </span>GET /pipeline
              </p>
              <p {...bootLine(3, 'pl-4', { color: CONTENT_DIM })}>
                HTTP/1.1 <span style={{ color: SUCCESS, fontWeight: 500 }}>200 OK</span>
              </p>
            </div>
            <p {...bootLine(4, 'mt-2', { color: TEXT })}>pipeline ready</p>

            {bootDone && (
              <>
                <p className="mt-4 text-[11px] uppercase tracking-wide" style={{ color: DIM }}>
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
                      {renderStage(stage, i)}
                      {i < stages.length - 1 && (
                        <PipelineArrow
                          direction={horizontal ? 'right' : 'down'}
                          grow={arrowGrow}
                          lit={i < unlocked - 1}
                          pulsing={pulsing === i}
                          onPulseEnd={handlePulseArrived}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Evidence only once the pipeline has settled — opening a
                    panel underneath while stages are still unlocking would
                    pull the eye off the sequence it belongs to. */}
                {complete && selected && (
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
              </>
            )}
          </>
        )}
      </div>
    </ExperienceTerminalPanel>
  );
}
