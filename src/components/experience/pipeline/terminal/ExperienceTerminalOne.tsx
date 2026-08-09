import React, { useEffect, useRef } from 'react';
import type { PipelineVisualizationModel, WorkExperience } from '../../../../experience/types';
import { formatDuration } from '../../../../experience/pipeline';
import { useFileRevealSequence } from '../../../../hooks/useFileRevealSequence';
import { CONTENT_DIM, METRIC, MUTED, STRONG, TEXT } from '../tokens';
import { ExperienceTerminalPanel } from './ExperienceTerminalPanel';

/** The tab's own title — a static label, not a live prompt re-typed as
 * body content (see ExperienceTerminalPanel's `title` doc comment). */
const TAB_TITLE = '$ cat ./americanchase.yaml';

/** Label column width for the metric rows — wide enough for the longest
 * label this dataset actually has ("AI-assisted features"), so values
 * align in a single column the way real command output does. */
const METRIC_LABEL_WIDTH_PX = 176;

/**
 * Terminal 1 — "What was the work?" americanchase.yaml's own facts,
 * printed as terminal output: company, role · location, description +
 * workflow title, dates · duration, then the spanning contributions
 * (reliability, delivery) as grouped metric rows, then the provenance
 * line. Every value is read straight off `experience`/`visualization` —
 * nothing here is a second copy of a fact that already lives in
 * workHistory.ts, and no metric is shown that the data doesn't carry.
 *
 * Reveal is useFileRevealSequence — the workspace's shared engine, which
 * already owns session-gating (hasAnimated/markAnimated), reduced-motion,
 * timing and interruption. One unit per printed line, so the output
 * appears the way a command actually emits it (line after line) rather
 * than as three blocks fading in together. Six units lands in the hook's
 * own SMALL_BAND (~0.8–1.2s), comfortably inside the brief's budget and
 * concurrent with Terminal 2's own longer execution sequence.
 */
export function ExperienceTerminalOne({
  experience,
  visualization,
  onRevealComplete,
}: {
  experience: WorkExperience;
  visualization: PipelineVisualizationModel;
  /**
   * Fires when this terminal has genuinely finished printing — the last
   * line's own `animationend`, not a timer counted alongside it. Cortexa's
   * chain is built on exactly this rule ("the wire only starts once its
   * upstream terminal has genuinely completed"), and honouring it here is
   * what keeps the handoff correct if the reveal timing ever changes.
   */
  onRevealComplete?: () => void;
}) {
  const spanning = visualization.spanning ?? [];

  // One unit per printed line: company, role·location, description,
  // dates, the metrics block, the provenance line.
  const sequence = useFileRevealSequence({
    fileId: 'americanchase-terminal-one',
    unitCount: 6,
  });

  // Already complete (reduced motion, or a repeat visit this session) means
  // no animation will ever run, so there is no `animationend` to wait for —
  // report completion immediately instead, or the chain downstream would
  // stall forever waiting on an event that can't fire.
  const completeRef = useRef(false);
  useEffect(() => {
    if (!sequence.isComplete || completeRef.current) return;
    completeRef.current = true;
    onRevealComplete?.();
  }, [sequence.isComplete, onRevealComplete]);

  const handleLastLineAnimationEnd = () => {
    if (completeRef.current) return;
    completeRef.current = true;
    onRevealComplete?.();
  };

  /**
   * Per-line reveal, as a CSS keyframe rather than a Motion variant.
   *
   * The sequence hook still owns the *timing* (getUnitDelaySeconds, its
   * session gating, its reduced-motion check) — only the animation itself
   * moved to CSS, for three reasons. It's the lighter mechanism for what
   * is just a fade+rise; index.css's `fade-rise` already ships a
   * `prefers-reduced-motion` override keyed to this exact class, so
   * reduced motion is handled by the stylesheet rather than by remembering
   * to branch here; and Motion's variant-level `transition` (which
   * `unitVariants.visible` carries, via its per-index delay) silently wins
   * over a component-level `transition={{ duration: 0 }}` override, which
   * is what left these lines stuck at `opacity: 0` in the DOM when the
   * sequence was already complete — verified, not theorised.
   *
   * `both` fill-mode is what holds each line at opacity 0 until its own
   * delay elapses, so the lines genuinely print one after another instead
   * of all fading together.
   */
  const line = (index: number): React.HTMLAttributes<HTMLElement> =>
    sequence.isComplete
      ? {}
      : {
          className: 'animate-[fade-rise_320ms_ease-out_both]',
          style: { animationDelay: `${sequence.getUnitDelaySeconds(index)}s` },
        };

  /** Merges the reveal props above with a line's own layout classes. */
  const withLine = (index: number, className: string, style?: React.CSSProperties) => {
    const reveal = line(index);
    return {
      className: [className, reveal.className].filter(Boolean).join(' '),
      style: { ...style, ...reveal.style },
    };
  };

  return (
    <ExperienceTerminalPanel title={TAB_TITLE}>
      <div ref={sequence.containerRef as React.RefObject<HTMLDivElement>}>
        <p {...withLine(0, 'text-[14px] font-medium', { color: STRONG })}>{experience.company}</p>

        <p {...withLine(1, 'mt-0.5', { color: MUTED })}>
          {experience.role} · {experience.location}
        </p>

        <p {...withLine(2, 'mt-4 max-w-[72ch] leading-[1.65]', { color: TEXT })}>
          {experience.description}
          <br />
          <span style={{ color: CONTENT_DIM }}>— {visualization.title}</span>
        </p>

        <p {...withLine(3, 'mt-4 tabular-nums', { color: CONTENT_DIM })}>
          {experience.startDate} → {experience.endDate === 'Present' ? 'present' : experience.endDate}
          <span> · {formatDuration(experience.startDate, experience.endDate)}</span>
        </p>

        {spanning.length > 0 && (
          <div {...withLine(4, 'mt-5 flex flex-wrap gap-x-16 gap-y-4')}>
            {spanning.map((item) => (
              <div key={item.id}>
                <div style={{ color: MUTED }}>{item.label}</div>
                {(item.metrics ?? []).map((metric) => (
                  <div key={metric.id} className="mt-0.5 flex gap-2">
                    <span className="shrink-0" style={{ color: CONTENT_DIM, width: METRIC_LABEL_WIDTH_PX }}>
                      {metric.label}
                    </span>
                    <span className="tabular-nums" style={{ color: METRIC }}>
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* No rule above this — one continuous session, not stacked
            cards. Vertical space alone separates the blocks. */}
        <p
          {...withLine(5, 'mt-5 text-[12px]', { color: CONTENT_DIM })}
          onAnimationEnd={handleLastLineAnimationEnd}
        >
          {visualization.derivedFrom}
        </p>
      </div>
    </ExperienceTerminalPanel>
  );
}
