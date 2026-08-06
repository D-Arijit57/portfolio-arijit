import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { ASCII_ROW_STAGGER_MS } from './timing';

export interface AsciiRendererProps {
  lines: string[];
  instant?: boolean;
  onComplete?: () => void;
}

/**
 * Phase 2 — reveals an ASCII-art block one row at a time: pure terminal
 * output, no fade/scale/zoom — a row simply appears once its delay has
 * elapsed. This is the seam TerminalRunner is built around for a later
 * swap to a different artwork renderer (e.g. a realtime globe): the
 * contract is just `lines` in, `onComplete` out — nothing about how the
 * rows are produced, timed, or how many there are leaks into TerminalRunner
 * or any sibling phase.
 */
export function AsciiRenderer({ lines, instant, onComplete }: AsciiRendererProps) {
  const skip = instant || prefersReducedMotion();
  const [visibleCount, setVisibleCount] = useState(skip ? lines.length : 0);
  const firedRef = useRef(false);

  const fireOnce = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onComplete?.();
  };

  useEffect(() => {
    if (skip || lines.length === 0) {
      fireOnce();
      return undefined;
    }
    if (visibleCount >= lines.length) {
      fireOnce();
      return undefined;
    }
    const timer = window.setTimeout(() => setVisibleCount((count) => count + 1), ASCII_ROW_STAGGER_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, visibleCount, lines.length]);

  return (
    <pre className="leading-tight">
      {lines.slice(0, visibleCount).map((line, i) => (
        <div key={i}>{line || ' '}</div>
      ))}
    </pre>
  );
}
