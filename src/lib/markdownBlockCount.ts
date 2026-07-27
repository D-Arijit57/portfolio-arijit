// A rough proxy for how many top-level blocks a markdown file will render
// as, used only to size the reveal's duration band (useFileRevealSequence's
// delay formula clamps against it, so an estimate that's off by a bit can't
// push the last block past the timing cap) — not a real parse, no AST.
export function estimateMarkdownBlockCount(source: string): number {
  if (!source.trim()) return 0;

  // Fenced code blocks can contain blank lines internally; collapse those
  // away first so a multi-paragraph-looking code sample isn't over-counted
  // as several separate blocks.
  const collapsed = source.replace(/```[\s\S]*?```/g, (fence) => fence.replace(/\n{2,}/g, '\n'));

  return collapsed
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean).length;
}
