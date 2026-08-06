import type { DocumentationFrontmatter } from './types';

/**
 * Shared "Label: Value" split for `frontmatter.metadata` — pulled out of
 * MetadataRow.tsx (Sprint: Documentation Redesign) so DocumentationHero.tsx
 * can read the `Status` entry for its own terminal-output header without
 * duplicating the split-on-first-colon parsing.
 */
export interface MetadataEntry {
  label: string;
  value: string;
}

export function parseMetadataEntries(frontmatter: DocumentationFrontmatter): MetadataEntry[] {
  const raw = Array.isArray(frontmatter.metadata) ? frontmatter.metadata : [];
  return raw
    .map((entry) => {
      const index = entry.indexOf(':');
      if (index === -1) return null;
      return { label: entry.slice(0, index).trim(), value: entry.slice(index + 1).trim() };
    })
    .filter((item): item is MetadataEntry => item !== null);
}
