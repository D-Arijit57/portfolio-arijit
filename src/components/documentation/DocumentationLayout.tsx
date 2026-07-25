import React from 'react';

/**
 * Owns the single overflow-y-auto scroll container (data-doc-scroll-root,
 * read by both TableOfContents' IntersectionObserver and ReadingProgress)
 * and the responsive two-column grid. `items-start` keeps the sidebar's
 * grid cell from stretching to the (taller) main column's height, which
 * would otherwise break `sticky`'s effective range. On narrow widths the
 * grid collapses to one column and `sticky` naturally becomes inert.
 */
export function DocumentationLayout({
  hero,
  metadata,
  main,
  sidebar,
}: {
  hero: React.ReactNode;
  metadata?: React.ReactNode;
  main: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  return (
    <div data-doc-scroll-root className="h-full w-full overflow-y-auto bg-[#1e1e1e] p-8">
      <div className="mx-auto max-w-5xl">
        {hero}
        {metadata}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">{main}</div>
          {sidebar}
        </div>
      </div>
    </div>
  );
}
