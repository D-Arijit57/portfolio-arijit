import React, { useEffect, useState } from 'react';
import type { DocumentationSectionModel } from '../../documentation/types';

/**
 * Auto-generated from the document's own H2 headings — never hardcoded
 * navigation. Scroll-spy uses a single IntersectionObserver rooted at the
 * documentation body's own scroll container (data-doc-scroll-root), not the
 * viewport, since that's the actual scrolling ancestor.
 *
 * Workspace Polish (Iteration 7 §4): restyled from a webpage-style TOC (a
 * "Contents" label, a left guide rule, blue active-link text) into a VS
 * Code Outline panel — "OUTLINE" label, a flat list of rows, and the exact
 * selected/hover row treatment Explorer.tsx's own file tree already uses
 * (bg-[#37373d] active, hover:bg-[#2a2d2e]) rather than invented colors, so
 * this reads as the same editor chrome instead of a second visual
 * language. Same underlying behavior as before (click to jump, scroll-spy
 * highlights the active section) — only the presentation changed.
 */
export function TableOfContents({ sections }: { sections: DocumentationSectionModel[] }) {
  const [activeId, setActiveId] = useState<string | undefined>(sections[0]?.id);

  useEffect(() => {
    if (sections.length === 0) return;
    const root = document.querySelector<HTMLElement>('[data-doc-scroll-root]');
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { root, rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    );

    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#858585]">Outline</div>
      <nav className="flex flex-col gap-0.5">
        {sections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(event) => handleClick(event, section.id)}
              className={`flex items-center gap-2 rounded px-1.5 py-1 text-[12px] leading-snug transition-colors ${
                isActive ? 'bg-[#37373d] text-white' : 'text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-[#cccccc]'
              }`}
            >
              <span aria-hidden="true" className={`text-[9px] ${isActive ? 'text-white' : 'text-[#6a6a6a]'}`}>
                ○
              </span>
              <span className="truncate">{section.heading}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
