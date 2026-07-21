import { useEffect } from 'react';
import { useBootSequence } from '../../hooks/useBootSequence';

interface BootTerminalProps {
  onComplete: () => void;
}

/**
 * Sprint 10E, refined in 10E.1: a plain black terminal that temporarily
 * occupies the editor area on first load, before README's own typing-reveal
 * animation (see TypingReveal.tsx) takes over. Deliberately not a
 * modal/splash/fullscreen overlay — it renders inline where
 * tabs/breadcrumbs/content normally sit, so it reads as "the workspace
 * booting" rather than a loading screen. Left-aligned, top-anchored, no
 * attempt to fill the pane — the empty space below the log is the point.
 */
export function BootTerminal({ onComplete }: BootTerminalProps) {
  const { visibleLines, isBooting } = useBootSequence();

  useEffect(() => {
    if (!isBooting) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBooting]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black p-4 font-mono text-[13px] text-left overflow-hidden">
      {visibleLines.map((line, i) => (
        <div key={i} className={line.success ? 'text-[#8ae234]' : 'text-[#cccccc]'}>
          {line.text}
        </div>
      ))}
      <span className="typing-reveal-cursor inline-block w-[7px] h-[15px] bg-[#cccccc] mt-0.5" />
    </div>
  );
}
