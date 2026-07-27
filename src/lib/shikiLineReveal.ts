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
