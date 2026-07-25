import type { DocumentationFrontmatter } from './types';

/**
 * Hand-rolled frontmatter parsing — deliberately not a full YAML parser or a
 * new dependency (`gray-matter` etc). Supports exactly two shapes, which is
 * all the viewer's own frontmatter keys (summary, badges, highlights,
 * metadata) ever need:
 *
 *   key: plain value
 *   key: [item one, item two, item three]
 *
 * Anything else on a line is ignored rather than throwing, so a malformed
 * frontmatter block degrades to "fewer fields recognized," never a crash.
 */
export function parseFrontmatter(raw: string): { frontmatter: DocumentationFrontmatter; body: string } {
  if (!raw.startsWith('---')) {
    return { frontmatter: {}, body: raw };
  }

  const lines = raw.split('\n');
  if (lines[0].trim() !== '---') {
    return { frontmatter: {}, body: raw };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex === -1) {
    return { frontmatter: {}, body: raw };
  }

  const frontmatter: DocumentationFrontmatter = {};
  for (const line of lines.slice(1, closingIndex)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value
        .slice(1, -1)
        .split(',')
        .map((item) => stripQuotes(item.trim()))
        .filter((item) => item.length > 0);
      frontmatter[key] = items;
    } else if (value.length > 0) {
      frontmatter[key] = stripQuotes(value);
    }
  }

  const body = lines.slice(closingIndex + 1).join('\n');
  return { frontmatter, body };
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
