import React, { useEffect, useRef, useState } from 'react';
import { randomBetween } from '../../lib/bootSequence';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { CHAR_MS_RANGE } from './timing';

export interface TypingLineProps {
  text: string;
  className?: string;
  /** Only the initial `./signature.sh` command line uses this — every
   * other typed line stays cursor-less once done, per the brief. */
  showCursorWhileTyping?: boolean;
  /** Forces the fully-typed end state with no animation — set by
   * TerminalRunner on a repeat visit this session, independent of the
   * user's own prefers-reduced-motion setting. */
  instant?: boolean;
  onComplete?: () => void;
}

/**
 * One terminal line that types in character-by-character, then sits
 * static — self-contained (owns its own timer), only ever reporting
 * completion via onComplete, so whatever sequences multiple lines (see
 * TerminalRunner's TypedLineSequence) never has to know how a single line
 * animates itself.
 */
export function TypingLine({ text, className, showCursorWhileTyping, instant, onComplete }: TypingLineProps) {
  const skip = instant || prefersReducedMotion();
  const [revealed, setRevealed] = useState(skip ? text.length : 0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (revealed >= text.length) {
      if (!firedRef.current) {
        firedRef.current = true;
        onComplete?.();
      }
      return undefined;
    }
    if (skip) return undefined;

    const timer = window.setTimeout(
      () => setRevealed((count) => count + 1),
      randomBetween(CHAR_MS_RANGE[0], CHAR_MS_RANGE[1]),
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, skip]);

  return (
    <div className={className}>
      {text.slice(0, revealed)}
      {showCursorWhileTyping && !skip && revealed < text.length && (
        <span className="typing-reveal-cursor ml-0.5">█</span>
      )}
    </div>
  );
}
