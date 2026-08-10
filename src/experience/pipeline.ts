import type { Metric, PipelineStage, PipelineVisualizationModel } from './types';

/**
 * Every derivation the pipeline renderer needs, as pure functions. The
 * components compute nothing themselves — which is what keeps the rules
 * below (especially `comparisonGeometry`) enforceable in one place instead
 * of re-decided per component.
 */

/** "1y 5m" — derived, and rendered a step dimmer than the dates it comes from. */
export function formatDuration(start: string, end: string): string {
  const from = parseMonth(start);
  const to = end === 'Present' ? new Date() : parseMonth(end);
  const months = Math.max(
    0,
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()),
  );
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest}m`;
  if (rest === 0) return `${years}y`;
  return `${years}y ${rest}m`;
}

function parseMonth(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

export interface ComparisonGeometry {
  /** 0–1, the longer of the two normalised to 1. */
  beforeRatio: number;
  afterRatio: number;
  from: number;
  to: number;
  unit: string;
  /** True when the change is a reduction — the usual case for time. */
  improved: boolean;
}

/**
 * The one gate on proportional marks in this renderer.
 *
 * Returns geometry *only* for a metric carrying a real `comparison`: two
 * commensurable numbers in one unit. A rate ("2 hrs/week saved"), a ratio
 * ("−35%") and a count ("200+") all return undefined, and the renderer
 * falls back to the metric's value string.
 *
 * This exists as a function rather than as an inline check because the
 * temptation to "just estimate a bar" for the other three metrics is
 * exactly how a page like this starts asserting things its source doesn't
 * say. There is one place to say no, and this is it.
 */
export function comparisonGeometry(metric: Metric): ComparisonGeometry | undefined {
  const comparison = metric.comparison;
  if (!comparison) return undefined;

  const { from, to, unit } = comparison;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return undefined;
  if (from <= 0 || to < 0) return undefined;

  const longest = Math.max(from, to);
  return {
    beforeRatio: from / longest,
    afterRatio: to / longest,
    from,
    to,
    unit,
    improved: to < from,
  };
}

/** The first metric on a stage that can legitimately be drawn, if any. */
export function stageGeometry(stage: PipelineStage): ComparisonGeometry | undefined {
  for (const metric of stage.metrics ?? []) {
    const geometry = comparisonGeometry(metric);
    if (geometry) return geometry;
  }
  return undefined;
}

/** A stage he changed, as opposed to one present purely for context. */
export function isContributed(stage: PipelineStage): boolean {
  return Boolean(stage.contribution);
}

/** The first stage worth opening — never a context-only one. */
export function defaultStageId(visualization: PipelineVisualizationModel): string | undefined {
  return visualization.stages.find(isContributed)?.id ?? visualization.stages[0]?.id;
}

// `experienceTotals` lived here to feed a footer reading
// "4 stages · 5 contributed · 5 technologies". It was deleted with that
// footer: "5 contributed" means nothing to a reader, and the other two are
// countable on screen. Derived summaries have to earn their place like
// anything else.
