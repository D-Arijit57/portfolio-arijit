import React from 'react';

/**
 * Owns the single overflow-y-auto scroll container (data-doc-scroll-root,
 * read by TableOfContents' own IntersectionObserver) and the responsive
 * two-column grid. `items-start` keeps the sidebar's
 * grid cell from stretching to the (taller) main column's height, which
 * would otherwise break `sticky`'s effective range. On narrow widths the
 * grid collapses to one column and `sticky` naturally becomes inert.
 *
 * Layout Refinement (Iteration 4): `intro` renders full-bleed above the
 * main/sidebar grid instead of sharing the narrower main column — content
 * placed there (a doc's markdown intro, before any H2) gets the whole
 * max-w-6xl width rather than main's width-minus-240px-sidebar, which is
 * what let Cortexa's two problem/solution terminals grow from a cramped,
 * portrait-ish pair into proper side-by-side panels. Optional: a doc with
 * no intro content passes nothing and the grid sits directly under the
 * hero/metadata exactly as before.
 *
 * Cortexa Workspace Refinement: `sidebar` is now optional — Cortexa's own
 * Engineering Notes sidebar was removed outright (see
 * ProjectDocumentationViewer.tsx's own doc comment), and with no sidebar
 * content left to reserve a column for, the 240px gutter collapses away
 * entirely (`grid-cols-1`, no `lg:grid-cols-[1fr_240px]`) so `main` gets
 * the doc's full width rather than leaving a dead empty column. Every other
 * project doc still passes a real sidebar and is visually unaffected.
 *
 * `background` (Cortexa Redesign Phase 1): optional inline override of the
 * scroll root's background — Cortexa's own palette (`#0F1117`) is a
 * page-wide departure from every other doc's shared `#1e1e1e`, so it's an
 * override on this one shared component rather than a second copy of it.
 * Every other project doc leaves this unset and keeps the existing color.
 */
export function DocumentationLayout({
  hero,
  metadata,
  intro,
  main,
  sidebar,
  background,
  containerRef,
}: {
  hero: React.ReactNode;
  metadata?: React.ReactNode;
  intro?: React.ReactNode;
  main: React.ReactNode;
  sidebar?: React.ReactNode;
  background?: string;
  /** Sprint: Workspace-Wide File Opening Animation System — lets the reveal
   * engine's interruption listeners attach to the same scroll container
   * TableOfContents already keys off of, instead of a second ref. Optional
   * so every other caller (none currently) stays unaffected. */
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      data-doc-scroll-root
      ref={containerRef}
      // Interaction Polish (Iteration 5 §1): overflow-x-hidden as a hard
      // backstop — nothing on this page should ever be able to force a
      // horizontal scrollbar, regardless of what a future doc's content
      // does. Nested horizontally-scrollable content (e.g. a wide markdown
      // table's own overflow-x-auto wrapper, PROSE_CLASSNAMES.tableWrapper)
      // is unaffected: this only clips content that pokes past this
      // container's own box, not a descendant's independent scroll area.
      className="h-full w-full overflow-x-hidden overflow-y-auto bg-[#1e1e1e] p-8 font-sans"
      // Markdown typography redesign: Inter, scoped to this project-doc
      // subtree only (see MarkdownFileView.tsx's identical override) —
      // covers hero/metadata/main/sidebar alike, so the whole documentation
      // page reads as one consistent system. `background`, when passed,
      // wins over the Tailwind class above via inline-style specificity.
      style={
        {
          '--font-sans': "'Inter', ui-sans-serif, system-ui, sans-serif",
          ...(background ? { backgroundColor: background } : {}),
        } as React.CSSProperties
      }
    >
      <div className="relative mx-auto max-w-6xl">
        {hero}
        {metadata}
        {intro}
        {sidebar ? (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_240px]">
            <div className="min-w-0">{main}</div>
            {sidebar}
          </div>
        ) : (
          <div className="min-w-0">{main}</div>
        )}
      </div>
    </div>
  );
}
