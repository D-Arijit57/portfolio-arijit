import React, { useRef, useState } from 'react';
import { GlossaryTooltip } from './GlossaryTooltip';
import { WELCOME_HOVER_GLOSSARY } from '../../lib/welcomeHoverGlossary';

const HOVER_CAPABLE = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;

/**
 * One interactive phrase inside WelcomeIntro's typed passage — styled like
 * a recognized editor symbol (subtle background on hover/active, I-beam
 * text cursor, no underline/link styling) rather than a hyperlink. Owns
 * only its own DOM rect for positioning GlossaryTooltip; which phrase is
 * "active" is lifted to WelcomeIntro so only one tooltip is ever open at a
 * time, and `data-glossary-span` is what WelcomeIntro's outside-tap
 * listener uses to tell a tap on a phrase from a tap that should dismiss.
 */
export function GlossaryHoverSpan({
  phrase,
  children,
  isActive,
  onOpen,
  onClose,
}: {
  phrase: string;
  children: React.ReactNode;
  isActive: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const open = () => {
    setRect(ref.current?.getBoundingClientRect() ?? null);
    onOpen();
  };

  return (
    <span
      ref={ref}
      data-glossary-span
      className="rounded-[3px] transition-colors duration-150 ease-out"
      style={{ cursor: 'text', backgroundColor: isActive ? 'rgba(255, 255, 255, 0.09)' : 'transparent' }}
      onMouseEnter={HOVER_CAPABLE ? open : undefined}
      onMouseLeave={HOVER_CAPABLE ? onClose : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (isActive) onClose();
        else open();
      }}
    >
      {children}
      {isActive && rect && <GlossaryTooltip entry={WELCOME_HOVER_GLOSSARY[phrase]} anchorRect={rect} />}
    </span>
  );
}
