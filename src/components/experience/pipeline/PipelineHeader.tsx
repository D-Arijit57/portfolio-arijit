import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { PipelineVisualizationModel, WorkExperience } from '../../../experience/types';
import { formatDuration } from '../../../experience/pipeline';
import { resolveCompanyLogo } from '../companyLogos';
import { ACCENT, CONTENT_DIM, DIM, MUTED, STRONG } from './tokens';

/**
 * Who, where, when — in two lines, because this is file metadata and the
 * work is the hero.
 *
 * It previously spent four lines and ~130px of a 463px canvas establishing
 * context, which is 28% of the screen on the least interesting facts on the
 * page. Company, role and location now share one line with the dates; the
 * workflow title owns the second and hands straight off to the axis.
 */
export function PipelineHeader({
  experience,
  visualization,
}: {
  experience: WorkExperience;
  visualization: PipelineVisualizationModel;
}) {
  const logo = resolveCompanyLogo(experience.company);

  return (
    <header>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {logo && (
            <img
              src={logo}
              alt=""
              className="h-[14px] w-auto max-w-[92px] shrink-0 translate-y-[2px] object-contain"
            />
          )}
          <h1 className="text-[14px] font-medium" style={{ color: STRONG }}>
            {experience.company}
          </h1>
          <span className="text-[12px]" style={{ color: DIM }}>
            ·
          </span>
          <span className="text-[12px]" style={{ color: ACCENT }}>
            {experience.role}
          </span>
          <span className="text-[12px]" style={{ color: DIM }}>
            ·
          </span>
          <span className="text-[12px]" style={{ color: MUTED }}>
            {experience.location}
          </span>
          <a
            href={experience.companyUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${experience.company}'s website`}
            className="shrink-0 translate-y-[2px] transition-colors hover:text-[#cccccc] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#4fc1ff]"
            style={{ color: CONTENT_DIM }}
          >
            <ExternalLink size={12} />
          </a>
        </div>

        <span className="shrink-0 font-mono text-[12px] tabular-nums" style={{ color: CONTENT_DIM }}>
          {experience.startDate} → {experience.endDate === 'Present' ? 'present' : experience.endDate}
          {/* The derived duration is content, not chrome, so it stays on
              CONTENT_DIM; only the separator glyph drops to DIM. */}
          <span style={{ color: DIM }}> · </span>
          {formatDuration(experience.startDate, experience.endDate)}
        </span>
      </div>

      {/* The workflow the axis below traces. No explanatory sentence — the
          axis states the workflow; describing it first would be the copy
          this page exists to make unnecessary. */}
      <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
        {experience.description}
        <span style={{ color: DIM }}> — </span>
        <span style={{ color: STRONG }}>{visualization.title}</span>
      </p>
    </header>
  );
}
