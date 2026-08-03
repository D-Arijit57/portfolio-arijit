export type LineKind =
  | 'command'
  | 'muted'
  | 'separator'
  | 'success'
  | 'tradeoff'
  | 'bullet'
  | 'action'
  | 'field'
  | 'heading'
  | 'blank';

export interface ParsedLine {
  kind: LineKind;
  text: string;
  label?: string;
  dots?: string;
  value?: string;
}

// Matches "Candidate ........ Arijit Das" into a keyword, its dot leader,
// and a value — the only structured shape this report's plain text has.
const FIELD_LINE = /^([A-Za-z ]+?)(\.{2,})(.*)$/;

// Both plain hyphen rules and the box-drawing "─" this report's later
// sections use render as the same separator kind — visually identical
// intent, just two characters a hand-authored report might use for it.
const SEPARATOR_LINE = /^[-─]+$/;

function parseTerminalLine(line: string): ParsedLine {
  if (line.trim() === '') return { kind: 'blank', text: '' };
  if (line.startsWith('$ ')) return { kind: 'command', text: line };
  if (SEPARATOR_LINE.test(line.trim())) return { kind: 'separator', text: line };
  if (line.startsWith('✓')) return { kind: 'success', text: line };
  if (line.startsWith('!')) return { kind: 'tradeoff', text: line };
  if (line.startsWith('•')) return { kind: 'bullet', text: line };
  if (line.startsWith('→')) return { kind: 'action', text: line };
  if (line.trim() === 'Loading profile...') return { kind: 'muted', text: line };

  const match = line.match(FIELD_LINE);
  if (match) {
    return { kind: 'field', text: line, label: match[1], dots: match[2], value: match[3].trim() };
  }
  return { kind: 'heading', text: line };
}

/** hire_me.md's raw content, split and classified line-by-line — shared by
 * every renderer of this report (currently TerminalWindowSvg) so the parse
 * rules live in exactly one place. */
export function parseTerminalContent(content: string): ParsedLine[] {
  return content
    .replace(/\n+$/, '')
    .split('\n')
    .map(parseTerminalLine);
}
