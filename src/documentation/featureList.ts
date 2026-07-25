import type { HastLikeNode } from './hastLike';
import { collectText, firstMeaningfulChild, unwrapLooseListItem } from './hastLike';

export interface FeatureListItem {
  term: string;
  description: string;
}

const TERMINAL_PUNCTUATION = /[.!?]$/;
const LEADING_SEPARATOR = /^[\s:–—-]+/;
const MAX_TITLE_LENGTH = 60;
const MIN_DESCRIPTION_WORDS = 2;

/**
 * Decides whether a `<ul>` reads as a feature list (bold term + real
 * description) that should render as a FeatureGrid, or should stay a plain
 * bullet list. All-or-nothing across every `<li>` — one non-conforming item
 * disqualifies the whole list, so a hand-authored doc never gets a
 * partially-transformed list. `<ol>` is never passed to this function at
 * all (see documentationComponents.tsx) — ordered semantics (numbered
 * steps/workflows) are excluded structurally, not by content.
 */
export function tryExtractFeatureList(node: HastLikeNode): FeatureListItem[] | undefined {
  const listItems = (node.children ?? []).filter((child) => child.type === 'element' && child.tagName === 'li');
  if (listItems.length < 2) return undefined;

  const items: FeatureListItem[] = [];

  for (const li of listItems) {
    const content = unwrapLooseListItem(li);
    const strongNode = firstMeaningfulChild(content);
    if (!strongNode || strongNode.type !== 'element' || strongNode.tagName !== 'strong') return undefined;

    const term = collectText(strongNode).trim();
    if (term.length === 0 || term.length > MAX_TITLE_LENGTH || TERMINAL_PUNCTUATION.test(term)) return undefined;

    const strongIndex = content.indexOf(strongNode);
    const rest = content.slice(strongIndex + 1);
    const description = collectText({ type: 'root', children: rest }).replace(LEADING_SEPARATOR, '').trim();

    if (description.length === 0 || description.split(/\s+/).length < MIN_DESCRIPTION_WORDS) return undefined;

    items.push({ term, description });
  }

  return items;
}
