import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { prefersReducedMotion } from '../../lib/typingReveal';
import type { HoverGlossaryEntry } from '../../lib/welcomeHoverGlossary';

const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";
const VIEWPORT_MARGIN = 8;
const GAP = 6;

/**
 * VS Code-style hover documentation popup for WelcomeIntro's interactive
 * phrases. Portaled to document.body so it's never clipped by welcome.md's
 * own scrollable pane, and positioned in a layout effect once its real
 * size is known — a bullet list and two-line prose differ in height/width,
 * so a fixed-size guess up front isn't accurate enough to guarantee it
 * never overflows the viewport. Mounts with a fade+rise; unmounts
 * instantly (no exit animation) per the brief's "instantly disappear on
 * mouse leave."
 */
export function GlossaryTooltip({ entry, anchorRect }: { entry: HoverGlossaryEntry; anchorRect: DOMRect }) {
  const reduceMotion = prefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: anchorRect.bottom + GAP,
    left: anchorRect.left,
    visibility: 'hidden',
  });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();

    let top = anchorRect.bottom + GAP;
    if (top + rect.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = anchorRect.top - GAP - rect.height;
    }
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - rect.height - VIEWPORT_MARGIN));

    let left = anchorRect.left;
    if (left + rect.width > window.innerWidth - VIEWPORT_MARGIN) {
      left = window.innerWidth - rect.width - VIEWPORT_MARGIN;
    }
    left = Math.max(VIEWPORT_MARGIN, left);

    setStyle({ position: 'fixed', top, left, visibility: 'visible' });
  }, [anchorRect.top, anchorRect.left, anchorRect.bottom, entry]);

  return createPortal(
    <motion.div
      ref={ref}
      role="tooltip"
      style={{
        ...style,
        zIndex: 100,
        fontFamily: ROBOTO_MONO,
        background: '#1e1e1e',
        border: '1px solid #3c3c3c',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
        padding: '8px 10px',
        maxWidth: 280,
        pointerEvents: 'none',
      }}
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
    >
      <div className="text-[11px] font-semibold mb-1" style={{ color: '#569cd6' }}>
        {entry.title}
      </div>
      <div className="text-[12px] leading-relaxed" style={{ color: 'rgba(230, 230, 230, 0.85)' }}>
        {entry.lines.map((line, i) =>
          entry.bulleted ? (
            <div key={i} className="flex gap-1.5">
              <span style={{ color: '#6e7681' }}>•</span>
              <span>{line}</span>
            </div>
          ) : (
            <div key={i}>{line}</div>
          ),
        )}
      </div>
    </motion.div>,
    document.body,
  );
}
