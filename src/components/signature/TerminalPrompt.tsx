import React from 'react';
import { CYAN, GRAY } from './palette';

/**
 * Final phase — the idle, naturally-blinking final prompt. No auto-typing,
 * no fake commands: it just sits there, exactly like a real shell waiting
 * for input. This is the sequence's only cursor — every earlier phase's
 * lines stay cursor-less once typed.
 */
export function TerminalPrompt() {
  return (
    <div>
      <span style={{ color: CYAN }}>arijit@portfolio</span>
      <span style={{ color: GRAY }}>:</span>
      <span style={{ color: CYAN }}>~</span>
      <span style={{ color: GRAY }}>$</span>{' '}
      <span className="typing-reveal-cursor">█</span>
    </div>
  );
}
