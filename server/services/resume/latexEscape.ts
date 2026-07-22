/**
 * Sprint 11: LaTeX has ten characters with special meaning
 * (`\ & % $ # _ { } ~ ^`) that must never reach the compiler literally out
 * of resume content — this data contains several of them ("92% accuracy",
 * "C++", "5+ production defects"). Escaping order matters: backslashes
 * must be escaped first, before any other replacement inserts new
 * backslashes of its own, or those get double-escaped.
 *
 * Also normalizes Unicode en/em dashes (–/—, as used in `dateRange`
 * fields like "Oct 2022 – Jun 2026") to LaTeX's own `--`/`---` ligatures.
 * Found by compiling a real sample and inspecting the output: this
 * template's [T1]{fontenc} setup renders literal ASCII text reliably, but
 * silently drops a raw Unicode en-dash byte sequence instead of rendering
 * it — converting to the ligature is the standard, engine-independent way
 * to author dashes in LaTeX source and sidesteps the font/encoding gap
 * entirely, rather than chasing a font-stack fix for one character.
 */
export function escapeLatex(text: string): string {
  return text
    .replace(/—/g, '---')
    .replace(/–/g, '--')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Splits a `**bold**`-marked string into LaTeX, escaping plain segments and
 * wrapping bold segments in `\textbf{}` — the LaTeX-output equivalent of
 * content/resume.ts's renderInlineMarkdown(), which does the same split for
 * JSX. Escaping happens per-segment, after the markdown split, so the
 * `**`/`**` markers themselves are never mistaken for resume content.
 */
export function renderInlineLatex(text: string): string {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => {
      const match = /^\*\*([^*]+)\*\*$/.exec(part);
      return match ? `\\textbf{${escapeLatex(match[1])}}` : escapeLatex(part);
    })
    .join('');
}
