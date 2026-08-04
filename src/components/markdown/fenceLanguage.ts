function classNameToString(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.join(' ');
  if (typeof value === 'string') return value;
  return undefined;
}

/**
 * Reads the `className` remark attaches to the `<code>` inside a fenced
 * `<pre>` (e.g. `language-ts`, or `language-contributions-terminal` for a widget
 * marker) directly off the raw hast `pre` node react-markdown hands every
 * component — decoupled from whatever the `code` component override renders
 * its children as. Shared by every markdown surface's `pre` override
 * (MarkdownFileView's RevealPre, documentationComponents.tsx) so a fence's
 * language/widget-marker is detected the same way everywhere, and so `pre`'s
 * own detection never depends on `code`'s return value (which collapses a
 * plain fenced code block to a bare passthrough precisely so `pre` can own
 * its whole presentation).
 */
export function getFenceCodeClassName(node: unknown): string | undefined {
  const preNode = node as
    | { children?: Array<{ type?: string; tagName?: string; properties?: Record<string, unknown> }> }
    | undefined;
  const codeNode = preNode?.children?.find((child) => child.type === 'element' && child.tagName === 'code');
  return classNameToString(codeNode?.properties?.className);
}

export function fenceLanguageFromClassName(classNameStr: string | undefined): string | undefined {
  return /language-([\w-]+)/.exec(classNameStr ?? '')?.[1];
}

/** True only for the `<code>` inside a fenced block that had an explicit
 * language tag — the one case a fence and inline code are unambiguously
 * distinguishable by className alone (an untagged fence and inline code both
 * lack it). Used by each surface's `code` override to stay a bare
 * passthrough for fenced code (letting `pre`/CodeBlock own its presentation)
 * while still styling genuine inline code. */
export function isFencedLanguageClassName(className: string | undefined): boolean {
  return /language-/.test(className ?? '');
}
