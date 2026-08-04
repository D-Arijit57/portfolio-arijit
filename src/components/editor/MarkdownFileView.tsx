import React, { useMemo, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { VirtualFile } from '../../types';
import { useFileRevealSequence, type FileRevealSequenceResult } from '../../hooks/useFileRevealSequence';
import { estimateMarkdownBlockCount } from '../../lib/markdownBlockCount';
import { createRevealMarkdownComponents } from './markdown/revealMarkdownComponents';

/**
 * Sprint 10F: pulled out of renderFileContent() so ResumeWorkspace's left
 * panel can render RESUME.md through the exact same markdown renderer/prose
 * styling as every other markdown file, per the sprint brief's "reuse the
 * existing markdown renderer" requirement — no parallel implementation.
 *
 * Extracted into its own module (not defined inline in EditorRenderer.tsx)
 * so ProjectDocumentationViewer can import it for its own empty-state
 * fallback without EditorRenderer.tsx and the documentation/ presentation
 * layer importing each other in a cycle.
 */
export function MarkdownFileView({ file }: { file: VirtualFile }) {
  // Sprint 10D.2: whoami.md is the one markdown file wide enough to let its
  // widgets (IdentityTerminals, AboutActivityRow, ContributionsTerminal — see
  // documentationWidgets.tsx) breathe instead of reading as a narrow prose
  // column. Layout Refactor iteration 2 bumped this from max-w-5xl to
  // max-w-6xl: at 5xl the terminal row and the GitHub contribution graph
  // were already filling their own column, but that column itself sat
  // narrow against the pane — this widens the column, not the widgets'
  // internal proportions. Every other markdown file keeps the original
  // max-w-3xl width, completely unchanged — this is a width difference on
  // the shared wrapper, not a different rendering path.
  const isWhoami = file.id === 'whoami';
  const containerWidthClass = isWhoami ? 'max-w-6xl' : 'max-w-3xl';

  const unitCount = useMemo(() => estimateMarkdownBlockCount(file.content), [file.content]);
  const sequence = useFileRevealSequence({ fileId: file.id, unitCount });

  // A ref (not the live `sequence` object) is what the components map
  // closes over — see revealMarkdownComponents.tsx's doc comment: it lets
  // the map itself stay referentially stable across re-renders (memoized
  // per file.id below) while each block still reads live reveal state.
  const sequenceRef = useRef<FileRevealSequenceResult>(sequence);
  sequenceRef.current = sequence;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const markdownComponents = useMemo(() => createRevealMarkdownComponents(sequenceRef), [file.id]);

  return (
    <div
      ref={sequence.containerRef as React.RefObject<HTMLDivElement>}
      className="h-full overflow-y-auto bg-[#1e1e1e] p-8 text-[#cccccc]"
      // Markdown typography redesign: Inter for prose, scoped to this
      // subtree only via a local --font-sans override — Tailwind's
      // `font-sans` utility reads var(--font-sans) (index.css's @theme
      // block), so this changes every descendant's sans-serif font without
      // touching the app-wide theme (the rest of the IDE chrome, and this
      // page's own monospace/code, stay on Geist Sans/Geist Mono).
      style={{ '--font-sans': "'Inter', ui-sans-serif, system-ui, sans-serif" } as React.CSSProperties}
    >
      {/* Portfolio Polish Sprint: typography now lives entirely on
          createRevealMarkdownComponents' own per-tag classNames (shared
          PROSE_CLASSNAMES), not on selectors here — this wrapper only owns
          reading width and base font. */}
      <div className={`${containerWidthClass} font-sans ${isWhoami ? 'whoami-doc' : ''}`}>
        <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {file.content}
        </Markdown>
      </div>
    </div>
  );
}
