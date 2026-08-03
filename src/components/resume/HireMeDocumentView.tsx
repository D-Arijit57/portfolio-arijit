import React, { useEffect, useRef } from 'react';
import type { VirtualFile } from '../../types';
import { TerminalWindowSvg } from './terminal/TerminalWindowSvg';
import { useTerminalPlayback } from './terminal/useTerminalPlayback';

/**
 * hire_me.md: rendered as a vector terminal-window SVG (TerminalWindowSvg),
 * not the generic markdown pipeline and not plain styled HTML text — the
 * brief is explicit that this should read as a captured terminal session,
 * not "Markdown with syntax highlighting." The underlying VFS content is
 * untouched plain CLI-report text; this component only supplies the
 * presentation layer on top of it.
 *
 * The one-time playback (typed command → cycling status line → line-by-line
 * report) is driven by useTerminalPlayback, not useFileRevealSequence — see
 * that hook's doc comment for why this needed its own state machine instead
 * of the generic per-unit fade every other file-open reveal in this app
 * shares.
 *
 * It is its own component rather than a direct `<MarkdownFileView file={file} />`
 * call for one reason: `ResumeWorkspace` needs to know when the reveal
 * finishes, to kick off the right panel's PDF build pipeline at the same
 * moment it always has.
 */
export function HireMeDocumentView({
  file,
  onRevealComplete,
}: {
  file: VirtualFile;
  onRevealComplete?: () => void;
}) {
  const playback = useTerminalPlayback(file.id, file.content);

  const firedRef = useRef(false);
  useEffect(() => {
    if (playback.phase === 'done' && !firedRef.current) {
      firedRef.current = true;
      onRevealComplete?.();
    }
  }, [playback.phase, onRevealComplete]);

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto bg-[#1e1e1e] p-8">
      {/* Spec: "roughly 85–90% of the editor width... center it... leave
          comfortable margins." The SVG itself has no intrinsic pixel size —
          its viewBox only fixes the aspect ratio — so this wrapper's
          percentage width is what actually drives the rendered size, and
          it stays crisp at any width since every glyph inside is real
          vector text, not a rasterized image. */}
      <div className="w-[88%] max-w-2xl">
        <TerminalWindowSvg content={file.content} playback={playback} />
      </div>
    </div>
  );
}
