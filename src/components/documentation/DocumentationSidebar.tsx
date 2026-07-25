import React from 'react';
import { Sparkle } from 'lucide-react';
import type { DocumentationFrontmatter, DocumentationSectionModel } from '../../documentation/types';
import { ReadingProgress } from './ReadingProgress';
import { TableOfContents } from './TableOfContents';

/**
 * Two independent, static (no entrance animation — this is chrome, not
 * content) sections: Project Highlights from frontmatter, and reading
 * position + TOC. Returns null if neither has anything to show, so an
 * unadorned doc doesn't get an empty sidebar column.
 */
export function DocumentationSidebar({
  frontmatter,
  sections,
}: {
  frontmatter: DocumentationFrontmatter;
  sections: DocumentationSectionModel[];
}) {
  const highlights = Array.isArray(frontmatter.highlights) ? frontmatter.highlights : [];
  if (highlights.length === 0 && sections.length === 0) return null;

  return (
    <aside className="sticky top-8 flex flex-col gap-6">
      {highlights.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#858585]">
            Project Highlights
          </div>
          <div className="flex flex-col gap-2">
            {highlights.map((highlight) => (
              <div
                key={highlight}
                className="flex items-start gap-2 rounded-md border border-[#3c3c3c] bg-[#252526] px-3 py-2"
              >
                <Sparkle size={14} className="mt-0.5 shrink-0 text-[#dcdcaa]" />
                <span className="text-[12px] leading-snug text-[#cccccc]">{highlight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sections.length > 0 && (
        <div>
          <ReadingProgress />
          <TableOfContents sections={sections} />
        </div>
      )}
    </aside>
  );
}
