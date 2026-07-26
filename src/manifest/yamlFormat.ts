import type { ManifestCategory, ManifestTechnology } from './types';

const INDENT = '  ';

/**
 * Display-only YAML string escaping — this text is rendered (via Shiki) and
 * copied to the clipboard, never parsed back, so correctness just means
 * "valid enough to read and highlight correctly," not round-trip safety.
 * Always double-quoting (rather than only when ambiguous) is deliberate: an
 * unquoted plain scalar isn't reliably tokenized as a string by every YAML
 * grammar/theme, so quoting is what guarantees the value actually gets the
 * theme's string color instead of falling back to the default foreground.
 */
function quote(value: string): string {
  return JSON.stringify(value);
}

/** camelCase manifest.json key -> snake_case, purely for how it *looks* as a YAML top-level key. */
function toYamlKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * A technology's own YAML sub-key, derived from its `role` (not a new data
 * field) so this stays generic over whatever manifest.json contains — no
 * per-technology or per-project special-casing. Collisions (two
 * technologies in one category sharing a role) get a numeric suffix rather
 * than silently overwriting one key with another's block.
 */
function technologyKey(role: string, used: Set<string>): string {
  const base = role.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'entry';
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let i = 2;
  while (used.has(`${base}_${i}`)) i++;
  const key = `${base}_${i}`;
  used.add(key);
  return key;
}

function technologyLines(tech: ManifestTechnology, indent: string): string[] {
  const lines = [`${indent}technology: ${quote(tech.technology)}`, `${indent}role: ${quote(tech.role)}`];
  if (tech.description) lines.push(`${indent}description: ${quote(tech.description)}`);
  if (tech.tags && tech.tags.length > 0) lines.push(`${indent}tags: [${tech.tags.map(quote).join(', ')}]`);
  return lines;
}

/**
 * Formats one category as YAML source text for the Manifest Viewer's YAML
 * block (manifest/yamlFormat.ts). Pure and presentation-only — the actual
 * source of truth stays manifest.json/ManifestModel; this never round-trips
 * back into the parser.
 */
export function buildCategoryYaml(category: ManifestCategory): string {
  const lines = [`${toYamlKey(category.key)}:`];
  const usedKeys = new Set<string>();

  for (const tech of category.technologies) {
    const key = technologyKey(tech.role, usedKeys);
    lines.push(`${INDENT}${key}:`);
    lines.push(...technologyLines(tech, INDENT + INDENT));
  }

  return lines.join('\n');
}
