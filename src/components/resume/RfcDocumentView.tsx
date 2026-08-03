import React, { useEffect, useMemo, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { VirtualFile } from '../../types';
import { useFileRevealSequence, type FileRevealSequenceResult } from '../../hooks/useFileRevealSequence';
import { estimateMarkdownBlockCount } from '../../lib/markdownBlockCount';
import { createRevealMarkdownComponents } from '../editor/markdown/revealMarkdownComponents';

/**
 * RFC-2026: the left panel's replacement content.
 *
 * This deliberately mirrors `MarkdownFileView.tsx` — same `react-markdown` +
 * `remark-gfm` pipeline, same `createRevealMarkdownComponents` block-by-block
 * reveal, same `PROSE_CLASSNAMES` typography (via that shared components
 * map) — rather than reusing the old `ResumeOverview`/`document/*` styling
 * (icons, colored token highlighting, hairline section rules). The brief is
 * explicit that this page should read as "an engineering proposal left open
 * in VS Code," not as another resume-shaped layout, and the generic
 * markdown renderer *is* what every other plain document in this IDE
 * (README.md, architecture notes, etc.) already looks like — reusing it is
 * what makes the RFC feel like a genuine artifact rather than a themed
 * variant of the page it's replacing.
 *
 * It is its own component rather than a direct `<MarkdownFileView file={file} />`
 * call for one reason: `ResumeWorkspace` needs to know when the reveal
 * finishes, to kick off the right panel's PDF build pipeline at the same
 * moment it always has. `MarkdownFileView` has no such hook (nothing else
 * needs one), so this wraps the same pieces with that one addition rather
 * than widening a shared component's contract for a single caller.
 */
export function RfcDocumentView({
  file,
  onRevealComplete,
}: {
  file: VirtualFile;
  onRevealComplete?: () => void;
}) {
  const unitCount = useMemo(() => estimateMarkdownBlockCount(file.content), [file.content]);
  const sequence = useFileRevealSequence({ fileId: file.id, unitCount });

  const sequenceRef = useRef<FileRevealSequenceResult>(sequence);
  sequenceRef.current = sequence;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const markdownComponents = useMemo(() => createRevealMarkdownComponents(sequenceRef), [file.id]);

  // Fired once, whether the reveal actually played or was skipped (reduced
  // motion / already played this session this file id) — the same contract
  // ResumeWorkspace's build pipeline has always relied on.
  const firedRef = useRef(false);
  useEffect(() => {
    if (sequence.isComplete && !firedRef.current) {
      firedRef.current = true;
      onRevealComplete?.();
    }
  }, [sequence.isComplete, onRevealComplete]);

  return (
    <div
      ref={sequence.containerRef as React.RefObject<HTMLDivElement>}
      className="h-full overflow-y-auto bg-[#1e1e1e] p-8 text-[#cccccc]"
      style={{ '--font-sans': "'Inter', ui-sans-serif, system-ui, sans-serif" } as React.CSSProperties}
    >
      <div className="max-w-3xl font-sans">
        <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {file.content}
        </Markdown>
      </div>
    </div>
  );
}
