import React, { useEffect, useState } from 'react';
import type { DocumentationSectionModel } from '../../documentation/types';

/**
 * Auto-generated from the document's own H2 headings — never hardcoded
 * navigation. Scroll-spy uses a single IntersectionObserver rooted at the
 * documentation body's own scroll container (data-doc-scroll-root), not the
 * viewport, since that's the actual scrolling ancestor.
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
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#858585]">On This Page</div>
      <nav className="flex flex-col gap-1.5 border-l border-[#3c3c3c] pl-3">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(event) => handleClick(event, section.id)}
            className={`text-[12px] leading-snug transition-colors ${
              activeId === section.id ? 'font-medium text-[#007acc]' : 'text-[#9d9d9d] hover:text-[#cccccc]'
            }`}
          >
            {section.heading}
          </a>
        ))}
      </nav>
    </div>
  );
}
