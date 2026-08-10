import React, { useEffect, useRef, useState } from 'react';
import { AsciiRenderer } from './AsciiRenderer';
import { TypingLine } from './TypingLine';
import { WELCOME_BANNER } from './signatureBanner';

// WELCOME_BANNER's longest row is 62 characters. At this pane's own 13px
// monospace, that's ~480px of glyphs alone; this threshold adds headroom
// for the p-4 padding around it (TerminalRunner's own root) before the
// fixed-width ASCII block would start clipping against the pane edge.
const BANNER_MIN_WIDTH_PX = 560;

/**
 * Renders `WELCOME` — the full 6-row block-letter ASCII art above
 * `BANNER_MIN_WIDTH_PX`, a plain typed heading below it (Narrow-Width
 * Fallback fix). The ASCII art is a *fixed* 62-character grid; no CSS can
 * shrink it without either scaling the whole block illegibly or letting it
 * clip past the pane's own edge, which is exactly what happened at ≤768px
 * total viewport width before this component existed (confirmed via
 * screenshot during the startup.log audit — the block was hard-clipped,
 * not wrapped, at that width, at the *previous* 50/50 split even).
 *
 * Measures the pane's own actual rendered width via `ResizeObserver` on
 * this component's own wrapper — not the viewport — the same technique
 * `RakshachakraPipelineTerminal`/`RakshachakraSessionTerminal` already use
 * for their own container-width-driven layout switches, since the
 * Explorer/split-pane workspace can make this pane considerably narrower
 * than the window itself.
 *
 * Both branches share the same `onComplete` contract (AsciiRenderer's own,
 * or TypingLine's) so `TerminalRunner`'s phase machine doesn't need to know
 * or care which one rendered — narrow panes still get a real (faster,
 * simpler) reveal, not an instant pop-in, keeping "the WELCOME banner
 * reveal is part of the visual payoff" true in both cases.
 */
export function WelcomeBanner({ instant, onComplete }: { instant?: boolean; onComplete?: () => void }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width === 0) return;
      setWide(width >= BANNER_MIN_WIDTH_PX);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef}>
      {wide ? (
        <AsciiRenderer lines={WELCOME_BANNER} instant={instant} onComplete={onComplete} />
      ) : (
        <div className="text-[32px] font-bold leading-tight tracking-wide">
          <TypingLine text="WELCOME" instant={instant} onComplete={onComplete} />
        </div>
      )}
    </div>
  );
}
