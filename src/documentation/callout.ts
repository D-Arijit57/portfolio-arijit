import type { HastLikeNode } from './hastLike';
import { collectText } from './hastLike';

export type CalloutKind = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

const MARKER_PATTERN = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;

export interface CalloutInfo {
  kind: CalloutKind;
  /** True when the first paragraph is *only* the marker — drop it entirely instead of stripping a prefix. */
  markerOnlyFirstParagraph: boolean;
  /** Character count to strip from the first paragraph's leading text run (when not marker-only). */
  markerLength: number;
}

/**
 * GitHub-style callout detection: `> [!NOTE]` (etc) as the very first thing
 * in a blockquote. Only inspects the hast `node` to *detect* the marker and
 * how much text it spans — it deliberately doesn't rebuild the hast tree.
 * Callout.tsx uses this info to strip the marker directly out of the
 * already-rendered React children, since that's the tree react-markdown
 * actually hands components (see Callout.tsx for why). A blockquote with no
 * marker returns undefined and renders through the pre-existing plain
 * blockquote styling, unchanged.
 */
export function tryDetectCallout(node: HastLikeNode): CalloutInfo | undefined {
  const children = (node.children ?? []).filter(
    (child) => !(child.type === 'text' && (child.value ?? '').trim() === '')
  );
  const firstPara = children[0];
  if (!firstPara || firstPara.type !== 'element' || firstPara.tagName !== 'p') return undefined;

  const paraText = collectText(firstPara);
  const match = MARKER_PATTERN.exec(paraText);
  if (!match) return undefined;

  const kind = match[1].toUpperCase() as CalloutKind;
  const remainder = paraText.slice(match[0].length);

  return {
    kind,
    markerOnlyFirstParagraph: remainder.trim().length === 0,
    markerLength: match[0].length,
  };
}
