import React from 'react';
import type { DocumentationFrontmatter } from '../../documentation/types';

/**
 * Compact label/value strip between the Hero and the first section, fully
 * frontmatter-driven: `metadata` is a plain string list, each entry
 * `"Label: Value"`, split on the first colon at render time. No fixed field
 * set (Status/Architecture/Frontend/...) is hardcoded — a doc's frontmatter
 * decides which fields appear, in what order. Renders nothing if absent.
 */
export function MetadataRow({ frontmatter }: { frontmatter: DocumentationFrontmatter }) {
  const raw = frontmatter.metadata;
  const entries = Array.isArray(raw) ? raw : [];
  if (entries.length === 0) return null;

  const items = entries
    .map((entry) => {
      const index = entry.indexOf(':');
      if (index === -1) return null;
      return { label: entry.slice(0, index).trim(), value: entry.slice(index + 1).trim() };
    })
    .filter((item): item is { label: string; value: string } => item !== null);

  if (items.length === 0) return null;

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 rounded-md border border-[#3c3c3c] bg-[#252526] p-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#858585]">{item.label}</div>
          <div className="mt-0.5 truncate text-[13px] text-[#cccccc]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
