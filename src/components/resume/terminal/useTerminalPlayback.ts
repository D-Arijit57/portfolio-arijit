import { useEffect, useMemo, useState } from 'react';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../../lib/typingReveal';
import { getPrompt } from '../../../terminal/prompt';
import { parseTerminalContent } from './parseTerminalLines';

// The real shell prompt this IDE's own Terminal panel renders (getPrompt('/')
// — see terminal/prompt.ts) — the command line now reads as a genuine
// executed command rather than the plain "$ " the raw file content still
// opens with. Purely a presentation choice (same category as the title
// bar/traffic lights, neither of which exist in file.content either).
export const PROMPT_PREFIX = `${getPrompt('/')} `;
export const COMMAND_TEXT = 'review candidate';

// Five distinct, real-sounding steps a hiring-review engine might log —
// cycled fast on the same status row and left to settle on the one that
// actually is hire_me.md's second line, so the finished frame is pixel- and
// word-identical to the un-animated document.
export const LOADING_MESSAGES = [
  'Loading profile...',
  'Initializing hiring engine...',
  'Fetching candidate metadata...',
  'Running evaluation...',
  'Generating recommendation...',
];

// How long the terminal window itself takes to fade/slide up before any
// text starts — HireMeDocumentView's entrance transition uses this exact
// duration too, so the two stay in lockstep with a single source of truth
// rather than two independently-tuned numbers that could drift apart.
export const ENTRANCE_MS = 450;

const CHAR_MIN_MS = 25;
const CHAR_MAX_MS = 35;
const START_PAUSE_MS = 200;
const POST_COMMAND_PAUSE_MS = 120;
const LOADING_DWELL_MS = 120;
const LINE_REVEAL_MS = 50;

export type PlaybackPhase = 'entering' | 'prompt' | 'typing' | 'loading' | 'content' | 'done';

export interface TerminalPlaybackState {
  phase: PlaybackPhase;
  typedCommand: string;
  loadingText: string;
  revealedContentLines: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Drives hire_me.md's one-time terminal playback: type the command,
 * cycle a status line through a few fake-but-plausible engine steps, then
 * print the rest of the report line by line. Session-gated via
 * lib/typingReveal.ts's hasAnimated/markAnimated/prefersReducedMotion — the
 * same contract every other file-open reveal in this app already uses — so
 * a same-session revisit (or reduced motion) renders the finished state
 * immediately instead of replaying.
 *
 * Deliberately its own state machine rather than a `useFileRevealSequence`
 * consumer: that hook fades a fixed number of same-shaped units in over a
 * duration band, which fits a markdown block or a code line but not a
 * character-by-character typewriter followed by a cycling status line.
 */
export function useTerminalPlayback(fileId: string, content: string): TerminalPlaybackState {
  const contentLineCount = useMemo(() => {
    const parsed = parseTerminalContent(content);
    // First two non-blank lines are the command and the loading/status row
    // this hook renders itself; everything after is the report it reveals
    // line by line.
    return Math.max(parsed.filter((l) => l.kind !== 'blank').length - 2, 0);
  }, [content]);

  const shouldSkip = hasAnimated(fileId) || prefersReducedMotion();

  const [state, setState] = useState<TerminalPlaybackState>(() =>
    shouldSkip
      ? {
          phase: 'done',
          typedCommand: COMMAND_TEXT,
          loadingText: LOADING_MESSAGES[0],
          revealedContentLines: contentLineCount,
        }
      : { phase: 'entering', typedCommand: '', loadingText: '', revealedContentLines: 0 },
  );

  useEffect(() => {
    if (shouldSkip) return undefined;
    let cancelled = false;

    void (async () => {
      // The terminal window fades/slides up first — text only starts once
      // it's actually settled in place, not layered on top of a still-moving
      // box. HireMeDocumentView's motion.div runs the visual side of this
      // over the same ENTRANCE_MS.
      await wait(ENTRANCE_MS);
      if (cancelled) return;
      setState((s) => ({ ...s, phase: 'prompt' }));

      await wait(START_PAUSE_MS);
      if (cancelled) return;
      setState((s) => ({ ...s, phase: 'typing' }));

      for (let i = 1; i <= COMMAND_TEXT.length; i++) {
        await wait(randomBetween(CHAR_MIN_MS, CHAR_MAX_MS));
        if (cancelled) return;
        setState((s) => ({ ...s, typedCommand: COMMAND_TEXT.slice(0, i) }));
      }

      await wait(POST_COMMAND_PAUSE_MS);
      if (cancelled) return;
      setState((s) => ({ ...s, phase: 'loading', loadingText: LOADING_MESSAGES[0] }));

      for (const message of LOADING_MESSAGES.slice(1)) {
        await wait(LOADING_DWELL_MS);
        if (cancelled) return;
        setState((s) => ({ ...s, loadingText: message }));
      }

      await wait(LOADING_DWELL_MS);
      if (cancelled) return;
      // Settles back on the literal, permanent line — everything above is
      // animation-only flourish; the resting text always matches
      // hire_me.md's real content.
      setState((s) => ({ ...s, phase: 'content', loadingText: LOADING_MESSAGES[0] }));

      for (let i = 1; i <= contentLineCount; i++) {
        await wait(LINE_REVEAL_MS);
        if (cancelled) return;
        setState((s) => ({ ...s, revealedContentLines: i }));
      }

      if (cancelled) return;
      setState((s) => ({ ...s, phase: 'done' }));
      markAnimated(fileId);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  return state;
}
