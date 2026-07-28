// Generalizes the per-line HTML split WorkHistoryYamlBlock.tsx already does
// inline (extract Shiki's <code>...</code> body, split on '\n' to isolate
// each source line's own <span class="line">...</span> wrapper) so it can be
// reused by any Shiki consumer that wants a staggered, per-line reveal
// rather than one flat highlighted blob. Tokenization still happens exactly
// once, over the full file, via the caller's own codeToHtml() call — only
// the *display* split happens here, post-hoc on already-correct output, so
// multi-line constructs (block comments, template literals) keep
// tokenizing correctly exactly as they do today.

/**
 * Extracts Shiki's per-line HTML fragments from a full codeToHtml() result.
 * Falls back to the raw source lines (no highlighting) if the expected
 * `<code>` wrapper isn't found, so a caller always gets `sourceLineCount`
 * entries back.
 */
export function splitHighlightedHtmlByLine(fullHtml: string, sourceLines: string[]): string[] {
  const match = fullHtml.match(/<code>([\s\S]*?)<\/code>/);
  if (!match) return sourceLines;

  const htmlLines = match[1].split('\n');
  return sourceLines.map((line, i) => htmlLines[i] ?? line);
}

/**
 * Chunks contiguous lines together so the reveal never fans out into more
 * than `maxUnits` staggered elements, independent of file size — bounds
 * Motion-node count (and therefore mount/layout cost) for a huge generated
 * file the same way it would for a short one; only the stagger's visual
 * grain gets coarser, not the DOM.
 */
export function groupLinesForReveal(lines: string[], maxUnits: number): string[][] {
  if (lines.length <= maxUnits || maxUnits <= 0) {
    return lines.map((line) => [line]);
  }

  const groupSize = Math.ceil(lines.length / maxUnits);
  const groups: string[][] = [];
  for (let i = 0; i < lines.length; i += groupSize) {
    groups.push(lines.slice(i, i + groupSize));
  }
  return groups;
}

// Markdown typography & animation redesign: programming files now type in
// character-by-character (see hooks/useShikiRevealHighlight.tsx) instead of
// fading in per line-group. Reusing groupLinesForReveal's line-grouping
// wouldn't preserve syntax coloring at sub-line granularity, so this is a
// second, character-aware pipeline: parse each already-highlighted line's
// HTML into individual (char, color) tokens, then group *those* the same
// bounded way groupLinesForReveal already groups whole lines.

export interface CharToken {
  char: string;
  /** Shiki's per-token color, or undefined for an unstyled/whitespace run. */
  color?: string;
}

/**
 * Parses one line's already-highlighted HTML fragment (a Shiki
 * `<span class="line">...</span>`, or a plain fallback string if
 * highlighting hasn't resolved yet) into an ordered list of individual
 * characters, each carrying the color Shiki assigned its enclosing token —
 * the building block for a true per-character typing reveal that still
 * keeps correct syntax coloring. Runs once per Shiki result (not per
 * animation frame): a detached DOM node does the HTML parsing/walking, so
 * arbitrarily nested token spans (rare, but Shiki can emit them) resolve
 * correctly without regex guesswork.
 */
export function parseLineToCharTokens(lineHtml: string): CharToken[] {
  const container = document.createElement('span');
  container.innerHTML = lineHtml;

  const tokens: CharToken[] = [];

  function walk(node: ChildNode, color: string | undefined) {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const char of node.textContent ?? '') {
        tokens.push({ char, color });
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const inheritedColor = element.style.color || color;
      element.childNodes.forEach((child) => walk(child, inheritedColor));
    }
  }

  container.childNodes.forEach((child) => walk(child, undefined));
  return tokens;
}

/**
 * The character-reveal equivalent of groupLinesForReveal's bound: given
 * every line's character tokens, how many characters exist in total (a
 * blank line still counts as 1, so it still occupies its own moment in the
 * reveal timeline instead of being skipped), how many distinctly-timed
 * reveal steps to use (never more than `maxUnits`, regardless of file
 * size), and how many characters share each step.
 */
export function characterRevealPlan(
  lines: CharToken[][],
  maxUnits: number,
): { totalChars: number; unitCount: number; groupSize: number } {
  const totalChars = lines.reduce((sum, line) => sum + Math.max(line.length, 1), 0);
  const unitCount = Math.max(1, Math.min(totalChars, maxUnits));
  const groupSize = Math.max(1, Math.ceil(totalChars / unitCount));
  return { totalChars, unitCount, groupSize };
}
