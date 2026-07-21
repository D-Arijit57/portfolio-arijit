import React from 'react';
import { useTypingReveal } from '../../hooks/useTypingReveal';

interface TypingRevealProps {
  fileId: string;
  contentLength: number;
  children: React.ReactNode;
  /** Sprint 10F: fired once, the instant the reveal finishes (or immediately
   * on mount if it was already done — reduced motion / replayed same file id
   * this session). Every existing caller omits this and is unaffected. */
  onRevealComplete?: () => void;
}

/**
 * Sprint 10D.1: a thin visual enhancement reused by EditorRenderer for every
 * file type it dispatches to (Markdown, WorkHistoryViewer, ShikiEditor, ...).
 * It never touches what's being rendered — the wrapped content is always
 * fully mounted underneath, already highlighted/parsed exactly as before —
 * only a clip-path grows over it in a handful of steps, so there is no
 * repeated syntax highlighting or per-character render cost. Once the
 * reveal finishes (or never applied), this renders children directly with
 * zero extra DOM — "no animation state remains."
 */
export function TypingReveal({ fileId, contentLength, children, onRevealComplete }: TypingRevealProps) {
  const { isRevealing, progress } = useTypingReveal(fileId, contentLength);
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isRevealing && !firedRef.current) {
      firedRef.current = true;
      onRevealComplete?.();
    }
  }, [isRevealing, onRevealComplete]);

  if (!isRevealing) {
    return <>{children}</>;
  }

  return (
    <div className="relative h-full w-full">
      <div
        className="h-full w-full overflow-hidden"
        style={{ clipPath: `inset(0 0 ${100 - progress}% 0)` }}
      >
        {children}
      </div>
      <div
        className="absolute left-0 w-full pointer-events-none"
        style={{ top: `${progress}%` }}
      >
        <span className="typing-reveal-cursor absolute left-4 -translate-y-full block w-[2px] h-[15px] bg-[#aeafad]" />
      </div>
    </div>
  );
}
