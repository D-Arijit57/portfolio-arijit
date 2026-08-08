import React, { useEffect, useRef, useState } from 'react';
import type { PipelineStage } from '../../../experience/types';
import { stageGeometry } from '../../../experience/pipeline';
import { prefersReducedMotion } from '../../../lib/typingReveal';
import { CONTENT_DIM, DIFF_ADDED, DIFF_REMOVED, MUTED, TEXT } from './tokens';

/**
 * Diff is the evidence language: what the system did before, what it does
 * now. Two lines in VS Code's own diff channels — legible without training,
 * to a reader who has never opened a terminal — and deliberately not
 * blocks, gutters or filenames. It should read as *this changed*, not as an
 * impression of GitHub.
 *
 * Geometry is layered on top only when the data earns it. A stage gets
 * proportional bars if and only if one of its metrics carries a real
 * `comparison`: two commensurable numbers in one unit (pipeline.ts's
 * `comparisonGeometry`). In this dataset that is `retrieve` alone. Every
 * other stage renders the text diff by itself and is complete without bars
 * — a stage with no measured before-state must never *look* like it has
 * one.
 */
export function StageDiff({ stage }: { stage: PipelineStage }) {
  const geometry = stageGeometry(stage);
  const reduceMotion = useRef(prefersReducedMotion()).current;

  if (!stage.before && !stage.after) return null;

  return (
    <div className="mt-4">
      {stage.before && (
        <p className="flex gap-3 text-[13px] leading-[1.65]">
          <span aria-hidden="true" className="w-[10px] shrink-0 font-mono" style={{ color: DIFF_REMOVED }}>
            −
          </span>
          <span style={{ color: MUTED }}>{stage.before.summary}</span>
        </p>
      )}
      {stage.after && (
        <p className="flex gap-3 text-[13px] leading-[1.65]">
          <span aria-hidden="true" className="w-[10px] shrink-0 font-mono" style={{ color: DIFF_ADDED }}>
            +
          </span>
          <span style={{ color: TEXT }}>{stage.after.summary}</span>
        </p>
      )}

      {geometry && (
        <div className="mt-3 flex w-full max-w-[360px] flex-col gap-1.5 pl-[22px]">
          <ComparisonBar
            ratio={geometry.beforeRatio}
            color={DIFF_REMOVED}
            label={`${geometry.from} ${geometry.unit}`}
            reduceMotion={reduceMotion}
          />
          <ComparisonBar
            ratio={geometry.afterRatio}
            color={DIFF_ADDED}
            label={`under ${geometry.to} ${geometry.unit}`}
            reduceMotion={reduceMotion}
          />
        </div>
      )}
    </div>
  );
}

/**
 * One measured bar. `ratio` always comes from `comparisonGeometry` — the
 * length on screen is the number in the source, normalised against the
 * longer of the pair and nothing else.
 *
 * It grows from zero once, on the frame it appears. That movement is the
 * measurement being taken; it doesn't repeat, and under reduced motion the
 * bar is simply drawn at its final length with the same information intact.
 */
function ComparisonBar({
  ratio,
  color,
  label,
  reduceMotion,
}: {
  ratio: number;
  color: string;
  label: string;
  reduceMotion: boolean;
}) {
  const width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  const [grown, setGrown] = useState(reduceMotion);

  useEffect(() => setGrown(true), []);

  // The value sits immediately after the bar it measures, not in a right-
  // aligned column: a fixed label gutter left a wide gap between a short
  // bar and its number, which read as two separate things rather than one
  // measurement. Both bars share the same track width, so their lengths
  // stay directly comparable.
  return (
    <div className="flex items-center gap-3">
      {/* Width is static; only `scaleX` moves, so the bar's *length* is
          always the number from the source and the animation can only ever
          reveal it.

          Deliberately a CSS transition driven by a mount effect rather than
          a Motion animation. An animated `initial` leaves the bar at
          scaleX(0) until a frame runs, so anywhere frames don't run — a
          background tab, an interrupted load — the measurement would
          silently render as nothing. An effect always fires, so the bar
          reaches full length regardless and the motion is purely an
          enhancement on top. Same reason reduced motion gets the final
          state rather than a disabled animation. */}
      <div
        className="h-[6px] shrink-0"
        style={{
          backgroundColor: color,
          width,
          transformOrigin: 'left center',
          transform: `scaleX(${grown ? 1 : 0})`,
          transition: reduceMotion ? 'none' : 'transform 420ms cubic-bezier(.22,1,.36,1)',
        }}
      />
      <span className="shrink-0 font-mono text-[11px] tabular-nums" style={{ color: CONTENT_DIM }}>
        {label}
      </span>
    </div>
  );
}
