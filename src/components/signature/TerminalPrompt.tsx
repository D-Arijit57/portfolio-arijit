import React from 'react';
import { CYAN, GRAY } from './palette';
import { useStore } from '../../store/useStore';

/**
 * Final phase — the idle, naturally-blinking final prompt. No auto-typing,
 * no fake commands: it just sits there, exactly like a real shell waiting
 * for input. This is the sequence's only cursor — every earlier phase's
 * lines stay cursor-less once typed.
 *
 * Phase 9C (cursor handoff): it blinks only while this sequence still owns
 * the shell. Once ownership passes to the real interactive Terminal (see
 * TerminalRunner's handoff effect), the block stays exactly where it is but
 * stops blinking — startup.log is a *log*, and a finished log should look
 * finished rather than keep advertising an input it never accepted. The
 * caret is not removed, because the prompt line would then read as truncated
 * mid-render; it settles.
 */
export function TerminalPrompt() {
  const ownsShell = useStore((state) => state.shellOwner === 'signature');

  return (
    <div>
      <span style={{ color: CYAN }}>arijit@portfolio</span>
      <span style={{ color: GRAY }}>:</span>
      <span style={{ color: CYAN }}>~</span>
      <span style={{ color: GRAY }}>$</span>{' '}
      <span className={ownsShell ? 'typing-reveal-cursor' : undefined}>█</span>
    </div>
  );
}
