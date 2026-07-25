/**
 * Minimal structural type for the hast nodes react-markdown passes to custom
 * components (`node` prop, `passNode: true` internally as of react-markdown
 * v10). Deliberately hand-rolled rather than importing `Element`/`Text` from
 * the `hast` package: `hast` itself isn't a declared dependency of this repo
 * (only pulled in transitively as react-markdown's own type dependency), so
 * relying on it directly would be resolving an undeclared package — same
 * "no new dependency" spirit as the frontmatter parser. This type only
 * describes the handful of fields featureList.ts/callout.ts actually read.
 */
export interface HastLikeNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastLikeNode[];
  properties?: Record<string, unknown>;
}

/** Concatenates all text content under a node, recursing through children. */
export function collectText(node: HastLikeNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  if (!node.children) return '';
  return node.children.map(collectText).join('');
}

/** First child that isn't a whitespace-only text node. */
export function firstMeaningfulChild(children: HastLikeNode[] | undefined): HastLikeNode | undefined {
  return children?.find((child) => !(child.type === 'text' && (child.value ?? '').trim() === ''));
}

/**
 * Loose markdown lists (blank line between items) wrap each `<li>`'s
 * content in a single `<p>` — unwrap it so list-item detectors (featureList,
 * linkCards) see the same shape regardless of whether the source list is
 * tight or loose.
 */
export function unwrapLooseListItem(li: HastLikeNode): HastLikeNode[] {
  const children = li.children ?? [];
  const meaningful = children.filter((child) => !(child.type === 'text' && (child.value ?? '').trim() === ''));
  if (meaningful.length === 1 && meaningful[0].tagName === 'p') {
    return meaningful[0].children ?? [];
  }
  return children;
}
