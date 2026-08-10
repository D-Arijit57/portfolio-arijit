import React, { useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { PipelineVisualizationModel, WorkExperience } from '../../../../experience/types';
import { formatDuration } from '../../../../experience/pipeline';
import { useFileRevealSequence } from '../../../../hooks/useFileRevealSequence';
import { resolveCompanyLogo } from '../../companyLogos';
import { ACCENT, CONTENT_DIM, DIM, METRIC, STRONG, TEXT } from '../tokens';
import { ExperienceTerminalPanel } from './ExperienceTerminalPanel';

/** The tab's own title — a static label, not a live prompt re-typed as
 * body content (see ExperienceTerminalPanel's `title` doc comment). */
const TAB_TITLE = '$ cat ./americanchase.yaml';

/**
 * A rule drawn from literal hyphens, not a CSS border and not the `─`
 * box-drawing glyph the previous pass used — at terminal size that glyph
 * renders as one unbroken line, indistinguishable from `border-top`, which
 * is exactly the "dashboard card" read this pass is correcting. Plain `-`
 * characters leave a visible gap between each one, so the rule reads as
 * *drawn* output rather than UI chrome. Over-long on purpose and clipped by
 * the container, so it spans whatever width the panel has without
 * measuring anything.
 */
const DASH_CHARS = '-'.repeat(240);

function TerminalDashRule() {
  return (
    <div aria-hidden="true" className="select-none overflow-hidden whitespace-nowrap text-[11px]" style={{ color: DIM }}>
      {DASH_CHARS}
    </div>
  );
}

/**
 * Terminal 1 — "What was the work?" The output of `cat ./americanchase.yaml`,
 * compressed to four blocks — identity, description, metrics, provenance —
 * instead of one labelled vertical group per data field. The earlier
 * per-field layout (role / description / timeline / reliability / delivery,
 * each its own stacked block) read as a YAML document rather than terminal
 * output and pushed Terminal 2 far down the page; this pass keeps every
 * field but changes how much vertical space each one is allowed to claim.
 *
 * The identity block, logo, and website link are a restoration, not new
 * work: the now-removed `PipelineHeader.tsx` already solved this
 * exact "who/where/when in minimal height" problem, including sourcing the
 * real logo via `resolveCompanyLogo` and the real URL via
 * `experience.companyUrl` — both reused verbatim here rather than
 * reinvented. Nothing here names a fact the model doesn't already carry.
 *
 * The two spanning groups (reliability, delivery) sit as side-by-side
 * columns rather than stacked blocks — the horizontal read this pass asks
 * for — each showing its own label · value rows exactly as the data has
 * them. A third "impact" column doesn't exist in the model (`defects
 * resolved` is one of *reliability*'s two metrics, not its own group), so
 * it isn't invented here; splitting it out would be exactly the kind of
 * fact the data doesn't assert.
 *
 * Reveal is useFileRevealSequence, one unit per *block* (identity,
 * description, metrics, provenance) — four units instead of the previous
 * seven, which keeps the "command executed, structured output returned"
 * feel without adding time: totalDurationForUnitCount uses the same small
 * duration band either way, so fewer, larger steps just makes each one land
 * with more weight instead of stretching the sequence out.
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
   * line's own `animationend`, not a timer counted alongside it. The
   * execution chain downstream is released by this.
   */
  onRevealComplete?: () => void;
}) {
  const spanning = visualization.spanning ?? [];
  const logo = resolveCompanyLogo(experience.company);

  // identity, description, metrics, provenance.
  const unitCount = 4;
  const sequence = useFileRevealSequence({
    fileId: 'americanchase-terminal-one',
    unitCount,
  });

  // Already complete (reduced motion, or a repeat visit this session) means
  // no animation will ever run, so there is no `animationend` to wait for —
  // report completion immediately, or the chain downstream would stall
  // forever waiting on an event that can't fire.
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
   * Per-block reveal, as a CSS keyframe rather than a Motion variant.
   * index.css's `fade-rise` already ships a `prefers-reduced-motion`
   * override keyed to this exact class, so reduced motion is handled by
   * the stylesheet; and Motion's variant-level `transition` silently wins
   * over a component-level `transition={{ duration: 0 }}` override, which
   * is what previously left the last groups stuck at `opacity: 0` once the
   * sequence was already complete. `both` fill-mode holds each block
   * hidden until its own delay elapses, so they print in order.
   */
  const block = (index: number, className: string, style?: React.CSSProperties) => {
    if (sequence.isComplete) return { className, style };
    return {
      className: `${className} animate-[fade-rise_320ms_ease-out_both]`,
      style: { ...style, animationDelay: `${sequence.getUnitDelaySeconds(index)}s` },
    };
  };

  return (
    <ExperienceTerminalPanel title={TAB_TITLE}>
      <div ref={sequence.containerRef as React.RefObject<HTMLDivElement>}>
        {/* Identity — logo, name, role · location, website link, and the
            dates on the same row where the terminal has room for them.
            flex-wrap (not a media query) is what lets the date block drop
            below at narrow widths without ever forcing horizontal scroll. */}
        <div {...block(0, 'flex flex-wrap items-start justify-between gap-x-6 gap-y-1')}>
          <div className="flex min-w-0 items-start gap-2.5">
            {logo && (
              <img
                src={logo}
                alt=""
                className="h-[26px] w-auto max-w-[112px] shrink-0 translate-y-[1px] object-contain"
              />
            )}
            <div className="min-w-0">
              <div className="text-[14px] font-medium" style={{ color: STRONG }}>
                {experience.company}
              </div>
              <div className="mt-0.5 text-[12.5px]" style={{ color: TEXT }}>
                {experience.role}
                <span style={{ color: DIM }}> · </span>
                {experience.location}
              </div>
              <a
                href={experience.companyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${experience.company}'s website`}
                className="mt-1 inline-flex items-center gap-1 text-[11.5px] transition-colors hover:text-[#cccccc] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#4fc1ff]"
                style={{ color: CONTENT_DIM }}
              >
                <ArrowUpRight size={11} aria-hidden="true" />
                website
              </a>
            </div>
          </div>

          <div className="shrink-0 tabular-nums text-[12.5px]" style={{ color: TEXT }}>
            {experience.startDate} → {experience.endDate === 'Present' ? 'present' : experience.endDate}
            <span style={{ color: CONTENT_DIM }}> · {formatDuration(experience.startDate, experience.endDate)}</span>
          </div>
        </div>

        {/* Description — command output, not a labelled field. */}
        <div {...block(1, 'mt-3')}>
          <p className="max-w-[80ch] text-[13px] leading-[1.6]" style={{ color: TEXT }}>
            {experience.description}
          </p>
          <p className="text-[13px]" style={{ color: CONTENT_DIM }}>
            — {visualization.title}
          </p>
        </div>

        <div className="mt-4">
          <TerminalDashRule />
        </div>

        {/* Metrics — one column per spanning group, side by side. Each
            column keeps its own label · value rows exactly as the data has
            them, so a group with two metrics (reliability) is simply a
            taller column rather than two separate columns. */}
        <div {...block(2, 'mt-4 flex flex-wrap gap-x-10 gap-y-4')}>
          {spanning.map((group) => (
            <div key={group.id} className="min-w-[180px]">
              <div className="text-[12px]" style={{ color: ACCENT }}>
                {group.label}
              </div>
              <div className="mt-1.5 space-y-1">
                {(group.metrics ?? []).map((metric) => (
                  <div key={metric.id} className="flex items-baseline justify-between gap-4">
                    <span className="text-[12px]" style={{ color: TEXT }}>
                      {metric.label}
                    </span>
                    <span className="tabular-nums text-[12px] font-medium" style={{ color: METRIC }}>
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div {...block(3, 'mt-4')} onAnimationEnd={handleLastLineAnimationEnd}>
          <TerminalDashRule />
          <p className="mt-1 text-[12px]" style={{ color: TEXT }}>
            {visualization.derivedFrom}
          </p>
        </div>
      </div>
    </ExperienceTerminalPanel>
  );
}
