import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { VirtualFile } from '../../types';
import { hasAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import { TerminalWindowSvg, type ClaimTargetsConfig } from './terminal/TerminalWindowSvg';
import { ENTRANCE_MS, useTerminalPlayback } from './terminal/useTerminalPlayback';

/**
 * hire_me.md: rendered as a vector terminal-window SVG (TerminalWindowSvg),
 * not the generic markdown pipeline and not plain styled HTML text — the
 * brief is explicit that this should read as a captured terminal session,
 * not "Markdown with syntax highlighting." The underlying VFS content is
 * untouched plain CLI-report text; this component only supplies the
 * presentation layer on top of it.
 *
 * The one-time playback (window fades/slides up → typed command → cycling
 * status line → line-by-line report) is driven by useTerminalPlayback, not
 * useFileRevealSequence — see that hook's doc comment for why this needed
 * its own state machine instead of the generic per-unit fade every other
 * file-open reveal in this app shares. The fade-up itself is a plain
 * motion.div here (the hook only owns the *timing* — ENTRANCE_MS — so the
 * visual transition and the "text starts once the box has settled" delay
 * can't drift out of sync); `skipEntrance` mirrors the hook's own
 * hasAnimated/prefersReducedMotion gate exactly, so a same-session revisit
 * renders the finished terminal with no motion at all, same as the text.
 *
 * It is its own component rather than a direct `<MarkdownFileView file={file} />`
 * call for one reason: `ResumeWorkspace` needs to know when the reveal
 * finishes, to kick off the right panel's PDF build pipeline at the same
 * moment it always has.
 */
export function HireMeDocumentView({
  file,
  onRevealComplete,
  claims,
}: {
  file: VirtualFile;
  onRevealComplete?: () => void;
  /** Phase 9E: passed straight through to TerminalWindowSvg, which owns the
   * claim hit targets because it owns the layout they have to sit on. Omitted
   * everywhere except hire_me.md's own workspace. */
  claims?: ClaimTargetsConfig;
}) {
  const playback = useTerminalPlayback(file.id, file.content);

  // Frozen at mount — the hook's own shouldSkip check is internal, so this
  // reads the same session/reduced-motion state independently rather than
  // the hook needing to expose it.
  const [skipEntrance] = useState(() => hasAnimated(file.id) || prefersReducedMotion());

  const firedRef = useRef(false);
  useEffect(() => {
    if (playback.phase === 'done' && !firedRef.current) {
      firedRef.current = true;
      onRevealComplete?.();
    }
  }, [playback.phase, onRevealComplete]);

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto bg-[#1e1e1e] p-5">
      {/* The SVG has no intrinsic pixel size — its viewBox only fixes the
          aspect ratio — so this wrapper's width is what actually drives the
          rendered size, and it stays crisp at any width since every glyph
          inside is real vector text, not a rasterized image.
          Phase 9E: widened from `w-[88%] max-w-2xl` with `p-8`. The original
          margins were tuned when this pane held a document on its own; now
          that its five bullets are anchors for lines running to the pane
          beside it, the report needs to occupy its half rather than float in
          the middle of it — and the claim rows need the width to stay one
          line each at 1024px. */}
      <motion.div
        className="w-full max-w-3xl"
        initial={skipEntrance ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ENTRANCE_MS / 1000, ease: 'easeOut' }}
      >
        <TerminalWindowSvg content={file.content} playback={playback} claims={claims} />
      </motion.div>
    </div>
  );
}
