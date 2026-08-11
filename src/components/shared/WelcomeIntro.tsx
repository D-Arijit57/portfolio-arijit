import React, { useEffect, useRef, useState } from 'react';
import { TerminalPromptLine } from './TerminalPromptLine';
import { GlossaryHoverSpan } from './GlossaryHoverSpan';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import { WELCOME_HOVER_GLOSSARY } from '../../lib/welcomeHoverGlossary';
import { WELCOME_PARAGRAPHS as PARAGRAPHS } from '../../content/welcome';

const FULL_TEXT = PARAGRAPHS.join('\n\n');

// Char offset right after each paragraph but the last (before its trailing
// "\n\n") — where typing takes the longer sentence-break pause instead of
// its normal per-character step, mirroring AboutSection.tsx's single-pause
// version generalized to N paragraphs.
const PARAGRAPH_BREAKS = new Set<number>();
{
  let offset = 0;
  PARAGRAPHS.forEach((paragraph, i) => {
    offset += paragraph.length;
    if (i < PARAGRAPHS.length - 1) PARAGRAPH_BREAKS.add(offset);
    offset += 2; // skip past the "\n\n" separator
  });
}

const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";
const CHAR_MS = 10;
const SENTENCE_PAUSE_MS = 120;
const REVEAL_SESSION_KEY = 'welcome-intro-typing';

interface TextSegment {
  text: string;
  /** Set only for a segment that's one of WELCOME_HOVER_GLOSSARY's phrases. */
  phrase?: string;
}

/**
 * Splits FULL_TEXT into an ordered, non-overlapping run of plain-text and
 * glossary-phrase segments, so the typewriter reveal below can keep
 * slicing one flat string by character count while still knowing, per
 * character, whether it's inside a phrase that should become an
 * interactive GlossaryHoverSpan once fully typed.
 */
function buildSegments(text: string, phrases: string[]): TextSegment[] {
  const matches = phrases
    .map((phrase) => ({ phrase, index: text.indexOf(phrase) }))
    .filter((m) => m.index !== -1)
    .sort((a, b) => a.index - b.index);

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const { phrase, index } of matches) {
    if (index < cursor) continue; // overlaps an earlier match — keep the earlier one
    if (index > cursor) segments.push({ text: text.slice(cursor, index) });
    segments.push({ text: phrase, phrase });
    cursor = index + phrase.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

const SEGMENTS = buildSegments(FULL_TEXT, Object.keys(WELCOME_HOVER_GLOSSARY));

/**
 * Renders the first `revealed` characters of FULL_TEXT as React nodes,
 * wrapping any glossary phrase in a GlossaryHoverSpan only once it's fully
 * typed — a phrase still mid-type renders as plain text, so there's never
 * a hoverable target for half a word.
 */
function renderRevealedSegments(
  revealed: number,
  activePhrase: string | null,
  setActivePhrase: React.Dispatch<React.SetStateAction<string | null>>,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let pos = 0;

  for (let i = 0; i < SEGMENTS.length; i++) {
    const segment = SEGMENTS[i];
    const start = pos;
    pos += segment.text.length;
    if (revealed <= start) break;

    const visible = segment.text.slice(0, revealed - start);
    const phrase = segment.phrase;

    if (!phrase || visible.length < segment.text.length) {
      nodes.push(<React.Fragment key={i}>{visible}</React.Fragment>);
      continue;
    }

    nodes.push(
      <GlossaryHoverSpan
        key={i}
        phrase={phrase}
        isActive={activePhrase === phrase}
        onOpen={() => setActivePhrase(phrase)}
        onClose={() => setActivePhrase((current) => (current === phrase ? null : current))}
      >
        {visible}
      </GlossaryHoverSpan>,
    );
  }

  return nodes;
}

/**
 * welcome.md's entire body — the same `$ cat <file>.txt` + character-by-
 * character typing + blinking cursor treatment as AboutSection.tsx (whoami.md),
 * reused verbatim rather than reinvented, per the Welcome Page Redesign brief's
 * "same typewriter animation used in signature.md" request. Runs once per
 * session (typingReveal.ts's hasAnimated/markAnimated), same as AboutSection.
 */
export function WelcomeIntro() {
  const reduceMotion = prefersReducedMotion();
  const skipAnimation = useRef(reduceMotion || hasAnimated(REVEAL_SESSION_KEY)).current;
  const [revealed, setRevealed] = useState(() => (skipAnimation ? FULL_TEXT.length : 0));
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  // Phase 5: one concise completion cue, not a narration of the typing
  // itself — a screen reader hearing this knows the welcome text has
  // finished (and is now fully present in the DOM to navigate to), same
  // aria-live="polite" + sr-only pattern contact.sh's own status regions
  // already use. Fires exactly once, whether typing actually ran or was
  // skipped (reduced motion / repeat visit) — either way this is the
  // first moment the full text genuinely exists to read.
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (skipAnimation) return;
    if (revealed >= FULL_TEXT.length) return;
    if (revealed === 0) markAnimated(REVEAL_SESSION_KEY);

    const delay = PARAGRAPH_BREAKS.has(revealed) ? SENTENCE_PAUSE_MS : CHAR_MS;
    const timer = setTimeout(() => setRevealed((count) => count + 1), delay);
    return () => clearTimeout(timer);
  }, [revealed, skipAnimation]);

  useEffect(() => {
    if (revealed >= FULL_TEXT.length && !announcement) {
      setAnnouncement('Welcome message loaded.');
    }
  }, [revealed, announcement]);

  // Touch devices open a tooltip by tapping its phrase (GlossaryHoverSpan's
  // own onClick) — dismiss it on a tap anywhere else, or on scroll, since
  // neither fires the span's onMouseLeave the way a real hover would.
  useEffect(() => {
    if (!activePhrase) return;
    const closeIfOutside = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-glossary-span]')) setActivePhrase(null);
    };
    const close = () => setActivePhrase(null);
    document.addEventListener('pointerdown', closeIfOutside);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      window.removeEventListener('scroll', close, { capture: true });
    };
  }, [activePhrase]);

  return (
    <div className="mb-4">
      <TerminalPromptLine
        tokens={[
          { text: 'cat ', color: '#4ec9b0' },
          { text: 'welcome.txt', color: '#ffffff', opacity: 0.85 },
        ]}
      />
      <div
        className="text-[15px]"
        style={{
          fontFamily: ROBOTO_MONO,
          lineHeight: 1.8,
          letterSpacing: '-0.01em',
          color: 'rgba(230, 230, 230, 0.82)',
          whiteSpace: 'pre-wrap',
          maxWidth: '70ch',
        }}
      >
        {renderRevealedSegments(revealed, activePhrase, setActivePhrase)}
        <span className="typing-reveal-cursor ml-0.5">█</span>
      </div>
      <div aria-live="polite" className="sr-only">{announcement}</div>
    </div>
  );
}
