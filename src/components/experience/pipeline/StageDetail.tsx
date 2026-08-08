import React from 'react';
import type { PipelineStage } from '../../../experience/types';
import { isContributed } from '../../../experience/pipeline';
import { StageDiff } from './StageDiff';
import { StageMetrics, TechnologyRow } from './StageMetrics';
import { CONTENT_DIM, TEXT } from './tokens';

/**
 * The evidence for the selected stage.
 *
 * The stage's name and outcome already sit in its column on the axis, so
 * nothing is restated here — this panel starts at the depth the column
 * stops: what he built, what changed in the system, with what, and which
 * sentence of the source it came from.
 *
 * A stage he didn't change says so in three words rather than a sentence of
 * apology. The absence of evidence *is* the evidence, and stating it
 * briefly is more credible than explaining it at length.
 */
export function StageDetail({ stage, panelId, tabId }: { stage: PipelineStage; panelId: string; tabId: string }) {
  const contributed = isContributed(stage);

  return (
    <section id={panelId} role="tabpanel" aria-labelledby={tabId} tabIndex={0} className="focus:outline-none">
      {contributed ? (
        <p className="max-w-[68ch] text-[13px] leading-[1.65]" style={{ color: TEXT }}>
          {stage.contribution}
        </p>
      ) : (
        <p className="font-mono text-[12px]" style={{ color: CONTENT_DIM }}>
          no contribution — existing behaviour
        </p>
      )}

      <StageDiff stage={stage} />

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1">
          <StageMetrics metrics={stage.metrics} omitDrawn omitFirst={contributed} />
          <TechnologyRow technologies={stage.technologies} />
        </div>

        {stage.sourceHighlights.length > 0 && (
          <p className="font-mono text-[11px]" style={{ color: CONTENT_DIM }}>
            americanchase.yaml · highlight{stage.sourceHighlights.length > 1 ? 's' : ''}{' '}
            {stage.sourceHighlights.map((index) => index + 1).join(', ')}
          </p>
        )}
      </div>
    </section>
  );
}
