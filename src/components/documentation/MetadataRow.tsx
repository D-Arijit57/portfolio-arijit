import React from 'react';
import { parseMetadataEntries } from '../../documentation/metadata';
import type { DocumentationFrontmatter } from '../../documentation/types';

/**
 * Documentation Redesign: `Status` moved into DocumentationHero's own
 * terminal-output block (so it isn't shown twice) — this renders whatever
 * metadata entries remain as plain stacked monospace `label: value` lines,
 * no bordered/boxed "spec card" treatment, so the hero and this row read as
 * one continuous piece of "cat output" rather than a hero-then-widget
 * transition. Still fully frontmatter-driven: no fixed field set is
 * hardcoded, a doc's frontmatter decides which fields appear.
 */
export function MetadataRow({ frontmatter }: { frontmatter: DocumentationFrontmatter }) {
  const items = parseMetadataEntries(frontmatter).filter((entry) => entry.label.toLowerCase() !== 'status');
  if (items.length === 0) return null;

  return (
    <div className="mb-8 flex flex-col gap-1 pl-[10px] font-mono">
      {items.map((item) => (
        <div key={item.label} className="text-[12px]">
          <span className="text-[#6a6a6a]">{item.label}: </span>
          <span className="text-[#9d9d9d]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
