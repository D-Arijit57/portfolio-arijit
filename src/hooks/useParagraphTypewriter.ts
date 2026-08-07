import { useEffect, useMemo, useRef, useState } from 'react';

// Same timing WelcomeIntro.tsx's own typewriter uses (its CHAR_MS/
// SENTENCE_PAUSE_MS) — generalized here to an arbitrary `blocks` array
// instead of one hardcoded PARAGRAPHS list, so Cortexa's shell terminals
// reuse the identical typing feel rather than a second, bespoke engine.
const CHAR_MS = 20;
const SENTENCE_PAUSE_MS = 250;

interface UseParagraphTypewriterOptions {
  /** Typing may only advance once true — lets a caller hold a terminal at
   * its untyped state until some earlier step (a previous shell, a wire
   * pulse) finishes. */
  active: boolean;
  /** Renders the fully-typed end state immediately, no timers — reduced
   * motion or a repeat-session visit. */
  skip: boolean;
  /** Fires exactly once, whether typing finished normally or was skipped. */
  onComplete?: () => void;
}

/** Char offset right after each block but the last — where typing takes the
 * longer paragraph-break pause instead of its normal per-character step,
 * identical in spirit to WelcomeIntro.tsx's own PARAGRAPH_BREAKS. */
function computeParagraphBreaks(blocks: string[][]): Set<number> {
  const breaks = new Set<number>();
  let offset = 0;
  blocks.forEach((block, i) => {
    offset += block.join('\n').length;
    if (i < blocks.length - 1) breaks.add(offset);
    offset += 2; // skip past the "\n\n" separator
  });
  return breaks;
}

/**
 * Generalizes WelcomeIntro.tsx's per-character-with-paragraph-pause
 * typewriter to any `blocks: string[][]` (each inner array is one visual
 * block/paragraph; blank-line-separated, same shape ProblemSolutionTerminals
 * already groups its own PROBLEM_BLOCKS/SOLUTION_BLOCKS into). Returns the
 * currently-revealed text re-split back into the same blocks/lines shape so
 * a caller can keep rendering its existing per-block/per-line layout.
 */
export function useParagraphTypewriter(
  blocks: string[][],
  { active, skip, onComplete }: UseParagraphTypewriterOptions,
): { revealedBlocks: string[][]; isDone: boolean } {
  const fullText = useMemo(() => blocks.map((block) => block.join('\n')).join('\n\n'), [blocks]);
  const paragraphBreaks = useMemo(() => computeParagraphBreaks(blocks), [blocks]);

  const [revealed, setRevealed] = useState(() => (skip ? fullText.length : 0));
  const firedRef = useRef(false);

  useEffect(() => {
    if (skip) {
      if (!firedRef.current) {
        firedRef.current = true;
        onComplete?.();
      }
      return undefined;
    }
    if (!active) return undefined;
    if (revealed >= fullText.length) {
      if (!firedRef.current) {
        firedRef.current = true;
        onComplete?.();
      }
      return undefined;
    }

    const delay = paragraphBreaks.has(revealed) ? SENTENCE_PAUSE_MS : CHAR_MS;
    const timer = window.setTimeout(() => setRevealed((count) => count + 1), delay);
    return () => window.clearTimeout(timer);
  }, [revealed, active, skip, fullText, paragraphBreaks, onComplete]);

  const revealedText = fullText.slice(0, revealed);
  const revealedBlocks = revealedText.length === 0 ? [] : revealedText.split('\n\n').map((block) => block.split('\n'));

  return { revealedBlocks, isDone: revealed >= fullText.length };
}
