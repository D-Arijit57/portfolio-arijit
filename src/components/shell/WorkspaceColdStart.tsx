import { useEffect } from 'react';
import { useBootSequence } from '../../hooks/useBootSequence';

/**
 * Phase 7C: the workspace boot, rendered where a boot actually belongs —
 * fullscreen, before VSCodeShell exists at all. This is not a new boot: it
 * is the *same* sequence that used to print inside the editor area (see
 * lib/bootSequence.ts for the lines, useBootSequence.ts for the machine,
 * both reused verbatim), relocated and re-anchored. Moving it out is what
 * lets "Launching Visual Studio Code..." be literally true — printed on
 * black immediately before the shell appears, rather than inside the editor
 * of a VS Code that had visibly already launched.
 *
 * Output is bottom-anchored: `justify-end` pins the block to the bottom, so
 * appending a line grows the block *upward* and older lines are displaced up
 * while the newest always sits above the cursor. That upward movement is a
 * consequence of layout, not an animation — no transform, no transition, no
 * Framer Motion, no rAF, nothing per-line. A real terminal scrolls in whole
 * line steps rather than tweening, and at the sequence's own 65-250ms
 * inter-line gaps the discrete shift is exactly what reads as scrolling.
 *
 * The trailing cursor is present from the first frame, before line 1's own
 * 120-155ms wait elapses — which is how the wordless-cursor beat from the
 * previous iteration of this phase survives here, as the boot's own opening
 * moment rather than as a separate stage in front of it.
 *
 * Everything about the *timing* is inherited: per-line waitRange, the 3-8
 * character buffered-flush bursts (chunkBreakpoints), the post-"Ready" hold
 * (BOOT_HOLD_RANGE), the StrictMode-safe completion, and the reduced-motion
 * skip all live in the hook and are untouched.
 */
export function WorkspaceColdStart({ onComplete }: { onComplete: () => void }) {
  const { visibleLines, isBooting } = useBootSequence();

  // Same handoff shape BootTerminal used: the hook owns when the sequence is
  // genuinely finished (including its own post-Ready hold), this only relays
  // it. Intentionally not depending on `onComplete` — App's callback is
  // stable, and re-running on identity change would risk a double fire.
  useEffect(() => {
    if (!isBooting) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBooting]);

  useEffect(() => {
    // Skip means "don't make me wait for the boot" — nothing more. It hands
    // straight to the workspace and deliberately does NOT mark the boot as
    // played: startup.log's signature sequence and the campfire are content
    // inside the workspace, not part of this gate, and they keep their own
    // independent session key (TerminalRunner's 'signature-terminal-
    // sequence'). Skipping the boot must never cost the visitor the payoff.
    const skip = () => onComplete();
    // pointerdown covers mouse, touch and pen; keydown covers Escape along
    // with every other key. No visible control — it would be the only thing
    // on screen competing with the output for attention.
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [onComplete]);

  return (
    // Decorative in the accessibility sense: the lines mutate through
    // partial, mid-flush states ("> Loading Extens"), which a live region
    // would announce as fragments. The single "Workspace ready." cue is
    // owned by App's own persistent region instead (see App.tsx), so it
    // survives this surface unmounting and fires exactly once.
    <div
      aria-hidden="true"
      className="fixed inset-0 flex select-none flex-col justify-end overflow-hidden bg-black p-4 font-mono text-[13px] text-left min-[641px]:p-6"
    >
      {visibleLines.map((line, i) => (
        <div key={i} className={line.success ? 'text-[#3fb950]' : 'text-[#cccccc]'}>
          {line.text}
        </div>
      ))}
      <span className="typing-reveal-cursor mt-0.5 inline-block h-[15px] w-[7px] shrink-0 self-start bg-[#cccccc]" />
    </div>
  );
}
