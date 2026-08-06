import type { HastLikeNode } from './hastLike';
import { collectText, firstMeaningfulChild, unwrapLooseListItem } from './hastLike';

export interface LinkCardItem {
  title: string;
  href: string;
  description: string;
}

const LEADING_SEPARATOR = /^[\s:–—-]+/;
const MIN_DESCRIPTION_WORDS = 2;

/**
 * Decides whether a `<ul>` reads as a link-card list — `[Title](href)`
 * leading every item, followed by a real description — the same
 * "structural, all-or-nothing" test tryExtractFeatureList uses for bold-term
 * lists (documentation/featureList.ts), just keyed on a leading `<a>`
 * instead of a leading `<strong>`. This is what powers the "Continue
 * Exploring" section, but is entirely generic — any future project doc
 * bullet list shaped `[Title](target) — description` becomes a LinkFileList,
 * whether the target is another workspace file or an external URL.
 */
export function tryExtractLinkCards(node: HastLikeNode): LinkCardItem[] | undefined {
  const listItems = (node.children ?? []).filter((child) => child.type === 'element' && child.tagName === 'li');
  if (listItems.length < 2) return undefined;

  const items: LinkCardItem[] = [];

  for (const li of listItems) {
    const content = unwrapLooseListItem(li);
    const linkNode = firstMeaningfulChild(content);
    if (!linkNode || linkNode.type !== 'element' || linkNode.tagName !== 'a') return undefined;

    const href = linkNode.properties?.href;
    if (typeof href !== 'string' || href.length === 0) return undefined;

    const title = collectText(linkNode).trim();
    if (title.length === 0) return undefined;

    const linkIndex = content.indexOf(linkNode);
    const rest = content.slice(linkIndex + 1);
    const description = collectText({ type: 'root', children: rest }).replace(LEADING_SEPARATOR, '').trim();

    if (description.length === 0 || description.split(/\s+/).length < MIN_DESCRIPTION_WORDS) return undefined;

    items.push({ title, href, description });
  }

  return items;
}
