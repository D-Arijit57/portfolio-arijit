import React, { useState } from 'react';
import type { SpanningContribution } from '../../../experience/types';
import { StageMetrics, TechnologyRow } from './StageMetrics';
import { CONTENT_DIM, RULE, STRONG, TEXT } from './tokens';

/**
 * Work that isn't a stage because nothing flows through it — reliability
 * across the whole backend, and how the work was delivered.
 *
 * Rendered as a band *underneath* the axis, running its full width, because
 * that is structurally what it is: a layer the pipeline sits on rather than
 * another position along it. Two hairlines bracket it, and it deliberately
 * has no ticks, no columns and no selected state, so it can never be
 * mistaken for a fifth stage.
 *
 * These exist because the alternative was worse: forcing "resolved 5+
 * production defects" or "collaborated with US stakeholders" into the
 * pipeline would have meant inventing a stage the source never describes.
 */
export function SpanningContributions({ items }: { items: SpanningContribution[] | undefined }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (!items || items.length === 0) return null;

  return (
    <section
      aria-label="Contributions spanning the system"
      className="border-y py-3"
      style={{ borderColor: RULE }}
    >
      <div className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
        <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: CONTENT_DIM }}>
          across the system
        </span>

        {items.map((item) => {
          const expanded = expandedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpandedId(expanded ? null : item.id)}
              className="flex items-baseline gap-3 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#4fc1ff]"
            >
              <span className="font-mono text-[12px]" style={{ color: STRONG }}>
                {item.label}
              </span>
              {/* One headline measurement at rest; the rest, the prose and
                  the provenance arrive on expand. The band advertises, the
                  expansion explains. */}
              <StageMetrics metrics={item.metrics} limit={1} />
            </button>
          );
        })}
      </div>

      {items
        .filter((item) => item.id === expandedId)
        .map((item) => (
          <div key={item.id} className="mt-3">
            <p className="max-w-[68ch] text-[13px] leading-[1.65]" style={{ color: TEXT }}>
              {item.contribution}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-8 gap-y-1">
              <TechnologyRow technologies={item.technologies} />
              <span className="font-mono text-[11px]" style={{ color: CONTENT_DIM }}>
                work_history.yaml · highlight{item.sourceHighlights.length > 1 ? 's' : ''}{' '}
                {item.sourceHighlights.map((index) => index + 1).join(', ')}
              </span>
            </div>
          </div>
        ))}
    </section>
  );
}
