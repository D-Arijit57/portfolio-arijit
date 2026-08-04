import React, { useEffect, useRef, useState } from 'react';
import { TerminalPromptLine } from './TerminalPromptLine';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';

// Exact original copy, unchanged — two sentences, each its own paragraph.
// The blank line between them is a real "\n\n" in the string (rendered via
// `white-space: pre-wrap` below), not a manually-placed <br>: within each
// paragraph, wrapping is still entirely up to the browser.
const PARAGRAPH_1 =
  "I'm a software engineer who enjoys reverse engineering complex systems to understand how they work, then " +
  'rebuilding them into simple, reliable products people actually use.';
const PARAGRAPH_2 =
  'My work focuses on backend systems, AI-powered applications, and developer tools, with an emphasis on clean ' +
  'architecture, practical problem solving, and continuous refinement.';
const FULL_TEXT = `${PARAGRAPH_1}\n\n${PARAGRAPH_2}`;

const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";
const CHAR_MS = 20;
const SENTENCE_PAUSE_MS = 250;
const REVEAL_SESSION_KEY = 'about-section-typing';

/**
 * whoami.md's About section — always expanded (Layout Refactor iteration 2
 * dropped the Obsidian-style collapse). No `## About` markdown heading
 * anymore: the static `$ cat about.txt` prompt line (TerminalPromptLine)
 * is the section's only header now — it already says "About" isn't
 * needed twice.
 *
 * The paragraph types in character-by-character (~20ms/char, a real
 * terminal `cat`-ing a file — not a fade or a line-by-line stagger) with a
 * ~250ms pause where the sentence break falls, and a blinking block cursor
 * that stays lit at both ends: visible while typing, left in place once
 * the text is fully revealed. Runs once per session — hasAnimated/
 * markAnimated (src/lib/typingReveal.ts) is the same session-gating
 * GitHubContributionGraph's reveal already uses, so navigating away and
 * back to whoami.md shows the finished text immediately instead of
 * replaying the type-in. Reduced motion skips straight to the finished
 * text too.
 */
export function AboutSection() {
  const reduceMotion = prefersReducedMotion();
  // Decided once per mount (useRef's initial value is only ever used on
  // the first render) — the effect below re-checking hasAnimated on every
  // tick would see it flip true the moment markAnimated fires and abort
  // the animation mid-type.
  const skipAnimation = useRef(reduceMotion || hasAnimated(REVEAL_SESSION_KEY)).current;
  const [revealed, setRevealed] = useState(() => (skipAnimation ? FULL_TEXT.length : 0));

  useEffect(() => {
    if (skipAnimation) return;
    if (revealed >= FULL_TEXT.length) return;
    if (revealed === 0) markAnimated(REVEAL_SESSION_KEY);

    // The pause lands right after PARAGRAPH_1's closing character — i.e.
    // before typing the "\n\n" that starts the next paragraph — so it
    // reads as "finished a sentence, took a beat" rather than a pause
    // mid-word.
    const delay = revealed === PARAGRAPH_1.length ? SENTENCE_PAUSE_MS : CHAR_MS;
    const timer = setTimeout(() => setRevealed((count) => count + 1), delay);
    return () => clearTimeout(timer);
  }, [revealed, skipAnimation]);

  return (
    <div className="my-4">
      <TerminalPromptLine command="cat about.txt" />
      <div
        className="mt-2 text-[15px]"
        style={{
          fontFamily: ROBOTO_MONO,
          lineHeight: 1.8,
          letterSpacing: '-0.01em',
          color: 'rgba(230, 230, 230, 0.82)',
          whiteSpace: 'pre-wrap',
          maxWidth: '70ch',
        }}
      >
        {FULL_TEXT.slice(0, revealed)}
        <span className="typing-reveal-cursor ml-0.5">█</span>
      </div>
    </div>
  );
}
