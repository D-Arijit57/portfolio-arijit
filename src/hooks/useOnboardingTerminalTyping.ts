import { useEffect, useRef, useState, type RefObject } from 'react';
import { useStore } from '../store/useStore';
import { shouldRunOnboarding } from '../lib/onboardingScope';

const TYPED_COMMAND = 'help';
// After the boot terminal hands off (bootActive flips false) and README's
// own block reveal is under way, before the terminal starts typing — this
// is what makes the Quick Start callout's own reveal delay and the
// terminal's activation read as one connected moment rather than two
// unrelated timers.
const PRE_TYPE_DELAY_RANGE: [number, number] = [400, 600];
// Human-like, not a typewriter tick — slow enough to read as someone
// actually typing, per the brief's "slow and human-like."
const CHAR_DELAY_RANGE: [number, number] = [90, 160];

const INTERRUPT_EVENTS: (keyof WindowEventMap)[] = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Portfolio UX Sprint (Interactive Workspace Assistant): once the boot
 * sequence hands off, waits briefly, then types "help" into the terminal's
 * real input character-by-character via the same setTerminalInput() store
 * action the user's own keystrokes use — never calls
 * submitTerminalCommand(), so the blinking native caret is left sitting
 * right after "help" for the user to press Enter themselves.
 *
 * README-only and once-per-session (shouldRunOnboarding(), the same gate
 * EditorArea's boot terminal and Explorer's stagger-reveal use), and
 * cancels immediately — mid-wait or mid-type — on any real user
 * interaction, mirroring useFileRevealSequence's own interrupt convention:
 * a user who's already engaging with the workspace on their own doesn't
 * need the scripted nudge.
 */
export function useOnboardingTerminalTyping(inputRef: RefObject<HTMLInputElement | null>): void {
  const bootActive = useStore((state) => state.bootActive);
  const setTerminalInput = useStore((state) => state.setTerminalInput);
  // Lazy-initialized once, same as EditorArea's `booting` / Explorer's
  // `staggerReveal` — Terminal never remounts mid-session, so this only
  // ever evaluates at the very first render of the page.
  const [active] = useState(() => shouldRunOnboarding());
  const cancelledRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);

  // Cancel on any real user interaction, anywhere — during the pre-type
  // wait or mid-typing alike.
  useEffect(() => {
    if (!active) return undefined;

    const cancel = () => {
      if (cancelledRef.current) return;
      cancelledRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };

    INTERRUPT_EVENTS.forEach((evt) => window.addEventListener(evt, cancel, { passive: true, once: true }));
    return () => {
      INTERRUPT_EVENTS.forEach((evt) => window.removeEventListener(evt, cancel));
    };
  }, [active]);

  useEffect(() => {
    if (!active || bootActive || cancelledRef.current) return undefined;

    const schedule = (fn: () => void, ms: number) => {
      timeoutsRef.current.push(window.setTimeout(fn, ms));
    };

    schedule(() => {
      if (cancelledRef.current) return;
      // "Focus shifts naturally toward the terminal" — the input already
      // auto-focuses whenever it isn't executing (Terminal.tsx), this just
      // makes sure that's still true at the exact moment typing begins,
      // even if the user's own focus drifted elsewhere during boot.
      inputRef.current?.focus();

      let charCount = 0;
      const typeNextChar = () => {
        if (cancelledRef.current) return;
        charCount++;
        setTerminalInput(TYPED_COMMAND.slice(0, charCount));
        if (charCount < TYPED_COMMAND.length) {
          schedule(typeNextChar, randomBetween(CHAR_DELAY_RANGE[0], CHAR_DELAY_RANGE[1]));
        }
      };
      typeNextChar();
    }, randomBetween(PRE_TYPE_DELAY_RANGE[0], PRE_TYPE_DELAY_RANGE[1]));

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, bootActive]);
}
