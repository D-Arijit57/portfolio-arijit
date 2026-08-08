import type { WorkExperience } from '../types';

/**
 * Display-only YAML escaping for the short, code-like field values
 * (company/role/dates/location/tech) — always quoted, since this text is
 * rendered (via Shiki) and never parsed back, so quoting is what reliably
 * gets the theme's string color instead of gambling on plain-scalar
 * tokenization. `highlights` deliberately stays unquoted plain prose
 * (verified directly against Shiki: an unquoted block-sequence scalar still
 * gets the same string color) — matching the reference's "short values are
 * quoted, long sentences aren't" convention.
 */
function quote(value: string): string {
  return JSON.stringify(value);
}

function formatExperience(exp: WorkExperience): string {
  const lines = [
    `  - company: ${quote(exp.company)}`,
    `    role: ${quote(exp.role)}`,
    `    startDate: ${quote(exp.startDate)}`,
    `    endDate: ${quote(exp.endDate)}`,
    `    location: ${quote(exp.location)}`,
    `    tech: [${exp.tech.map(quote).join(', ')}]`,
    `    highlights:`,
  ];

  // A blank line between each highlight, matching the reference exactly —
  // still a valid YAML block sequence with blank lines between items. Only
  // `text` is emitted: a Highlight's `metric` is an annotation of this
  // sentence, not a fact alongside it (see the field's own doc comment), so
  // the generated source is byte-identical to what it was before metrics
  // existed — and the two hand-maintained seed copies stay untouched.
  exp.highlights.forEach((h, i) => {
    if (i > 0) lines.push('');
    lines.push(`      - ${h.text}`);
  });

  return lines.join('\n');
}

/**
 * Work History Renderer — pure function: WorkExperience[] in, YAML source
 * text out. The same "model in, source text out" relationship
 * modelToMermaid() has with architecture.mmd and buildCategoryYaml() has
 * with manifest.yaml: this text is only ever shown, in the editor's left
 * pane — the Career Roadmap panel never parses it back, it imports the
 * same `workHistory` array directly (src/content/workHistory.ts), so there
 * is exactly one place the actual data lives.
 *
 * Deliberately omits `companyUrl` — the reference format doesn't show it,
 * and the Career Roadmap's external-link icon reads it straight off the
 * `workHistory` array, never off this generated text, so leaving it out of
 * the display doesn't touch that feature at all.
 */
export function workHistoryToYaml(experiences: WorkExperience[]): string {
  const body = experiences.map(formatExperience).join('\n');
  return `# Work History\n\nexperiences:\n${body}\n`;
}
