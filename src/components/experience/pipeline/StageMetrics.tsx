import React from 'react';
import type { Metric } from '../../../experience/types';
import { comparisonGeometry } from '../../../experience/pipeline';
import { CONTENT_DIM, METRIC, MUTED } from './tokens';

/**
 * Metrics as inline annotations — label and value on one line, value in
 * monospace and tabular. No fixed label column: a 180px gutter between
 * "operations time saved" and "2 hrs/week" was an arbitrary trench that
 * made two words look like a table.
 *
 * Two suppressions keep a measurement from being stated twice in two forms:
 * `omitDrawn` skips whatever StageDiff has already rendered as bars, and
 * `omitFirst` skips the headline value already shown in the stage's own
 * column on the axis.
 */
export function StageMetrics({
  metrics,
  omitDrawn = false,
  omitFirst = false,
  limit,
}: {
  metrics: Metric[] | undefined;
  omitDrawn?: boolean;
  omitFirst?: boolean;
  /** Show at most this many — the spanning band advertises one headline
   * measurement per contribution and keeps the rest for its expansion. */
  limit?: number;
}) {
  const all = metrics ?? [];
  const visible = all
    .filter((metric, index) => !(omitFirst && index === 0))
    .filter((metric) => !(omitDrawn && comparisonGeometry(metric)))
    .slice(0, limit ?? Infinity);

  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((metric) => (
        <span key={metric.id} className="flex items-baseline gap-2 text-[12px]">
          <span style={{ color: CONTENT_DIM }}>{metric.label}</span>
          <span className="font-mono tabular-nums" style={{ color: METRIC }}>
            {metric.value}
          </span>
        </span>
      ))}
    </>
  );
}

/** Interpuncts, never pills — the same row the YAML writes as a flow sequence. */
export function TechnologyRow({ technologies }: { technologies: string[] | undefined }) {
  if (!technologies || technologies.length === 0) return null;

  return (
    <span className="font-mono text-[12px]" style={{ color: MUTED }}>
      {technologies.join(' · ')}
    </span>
  );
}
