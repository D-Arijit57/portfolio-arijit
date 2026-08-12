import type { PipelineStage } from '../../../experience/types';
import { isContributed } from '../../../experience/pipeline';
import { STAGE_CONTEXT_ACCENT, STAGE_CONTRIBUTION_ACCENTS } from '../pipeline/tokens';

/**
 * Stage id → identity colour, derived rather than declared.
 *
 * A stage he didn't change wears the context colour; each stage he did wears
 * the next contribution hue in pipeline order. Nothing here is keyed by a
 * literal stage id, so renaming `extract` or inserting a fifth stage changes
 * the picture correctly instead of silently falling back to a default.
 *
 * Presentation only — which is why it lives beside the components rather than
 * in `experience/workspace.ts`. That module is a pure model projection and has
 * no business importing a colour.
 */
export function buildStageAccents(stages: PipelineStage[]): Map<string, string> {
  const accents = new Map<string, string>();
  let contributed = 0;

  for (const stage of stages) {
    if (!isContributed(stage)) {
      accents.set(stage.id, STAGE_CONTEXT_ACCENT);
      continue;
    }
    accents.set(
      stage.id,
      STAGE_CONTRIBUTION_ACCENTS[contributed % STAGE_CONTRIBUTION_ACCENTS.length],
    );
    contributed += 1;
  }

  return accents;
}
