import React from 'react';
import { Sparkle } from 'lucide-react';
import type { DocumentationSectionModel } from '../../documentation/types';
import { TableOfContents } from './TableOfContents';

/**
 * Two independent, static (no entrance animation — this is chrome, not
 * content) sections: Engineering Notes, and the Outline. Returns null if
 * neither has anything to show, so an unadorned doc doesn't get an empty
 * sidebar column.
 *
 * Workspace Polish (Iteration 7 §4): dropped the reading-progress bar that
 * used to sit above the Outline — a horizontal "you are X% through this
 * page" indicator is a blog/docs-site convention (MkDocs, Docusaurus, this
 * site's own old Contents panel) with no equivalent in a code editor's own
 * Outline panel, and its blue fill was the specific "documentation
 * underline" this iteration's brief called out to remove. The Outline's own
 * functionality (jump to section, active-section highlight) is unaffected.
 *
 * Documentation Redesign (Iteration 3): `highlights` is now an explicit prop
 * rather than raw frontmatter — Cortexa's own highlights are paired with its
 * Core Features section instead (EngineeringNotesColumn.tsx), so
 * ProjectDocumentationViewer.tsx passes an empty array here for that one
 * doc; every other project doc still gets its highlights rendered in this
 * sidebar exactly as before.
 */
export function DocumentationSidebar({
  highlights,
  sections,
}: {
  highlights: string[];
  sections: DocumentationSectionModel[];
}) {
  if (highlights.length === 0 && sections.length === 0) return null;

  return (
    <aside className="sticky top-8 flex flex-col gap-6">
      {highlights.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#858585]">
            Engineering Notes
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
          <TableOfContents sections={sections} />
        </div>
      )}
    </aside>
  );
}
