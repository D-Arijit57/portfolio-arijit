import React, { useEffect, useRef, useState } from 'react';
import { TypingLine } from './TypingLine';
import { AsciiRenderer } from './AsciiRenderer';
import { EngineeringProfile } from './EngineeringProfile';
import { TerminalPrompt } from './TerminalPrompt';
import { WELCOME_BANNER } from './signatureBanner';
import { CYAN } from './palette';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import { LINE_GAP_MS } from './timing';

const SESSION_KEY = 'signature-terminal-sequence';

const ANALYSIS_LINES = [
  'Initializing renderer...',
  'Reading workspace...',
  'Loading identity...',
  'Analyzing repositories...',
  'Extracting engineering profile...',
  'Building developer signature...',
  'Rendering signature...',
];

type Phase = 'command' | 'analysis' | 'banner' | 'profile' | 'ready';
const PHASE_ORDER: Phase[] = ['command', 'analysis', 'banner', 'profile', 'ready'];

function phaseAtLeast(current: Phase, target: Phase): boolean {
  return PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);
}

/**
 * Types a fixed list of lines one after another — the composition
 * TypingLine itself deliberately doesn't own (it only knows how to type
 * *one* line), used for Phase 1's analysis lines. Internal to
 * TerminalRunner: nothing outside this file needs to sequence lines this
 * way.
 */
function TypedLineSequence({
  lines,
  startDelayMs = 0,
  gapMs = LINE_GAP_MS,
  instant,
  onComplete,
}: {
  lines: string[];
  startDelayMs?: number;
  gapMs?: number;
  instant?: boolean;
  onComplete?: () => void;
}) {
  const skip = instant || prefersReducedMotion();
  const [started, setStarted] = useState(skip || startDelayMs === 0);
  const [index, setIndex] = useState(0);
  const firedRef = useRef(false);

  const fireOnce = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onComplete?.();
  };

  useEffect(() => {
    if (skip || lines.length === 0) {
      fireOnce();
      return undefined;
    }
    if (started) return undefined;
    const timer = window.setTimeout(() => setStarted(true), startDelayMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, started]);

  const advance = () => {
    if (index + 1 >= lines.length) {
      fireOnce();
    } else {
      window.setTimeout(() => setIndex((i) => i + 1), gapMs);
    }
  };

  if (skip) {
    return (
      <div>
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    );
  }

  if (!started) return null;

  return (
    <div>
      {lines.slice(0, index).map((line) => (
        <div key={line}>{line}</div>
      ))}
      <TypingLine key={index} text={lines[index]} onComplete={advance} />
    </div>
  );
}

/**
 * The right pane's terminal-story sequence: `$ ./signature.sh` types,
 * "executes," analyzes the workspace, clears that analysis, reveals the
 * WELCOME banner, prints the engineering profile, and settles into an idle
 * blinking prompt. TerminalRunner owns only the fixed phase order and
 * advances one step whenever the current phase's own onComplete fires — it
 * knows nothing about *how* any phase animates itself. Phase 2
 * (AsciiRenderer) is the seam built for a later swap to a different
 * renderer (e.g. a realtime globe): same `lines`-in/`onComplete`-out
 * contract, so this file never has to change when that swap happens.
 *
 * The analysis phase is the one exception to "once revealed, stays
 * revealed": it's rendered only while `phase === 'analysis'` (not
 * `phaseAtLeast`), so the whole block unmounts the instant the phase moves
 * on — "remove only the temporary loading lines" — while the command line
 * above it stays visible unconditionally.
 *
 * Session-gated like every other file's reveal in this workspace
 * (hasAnimated/markAnimated) — a repeat visit this session, or
 * prefers-reduced-motion, renders every phase already complete with no
 * animation at all, computed once via `instant` and threaded through every
 * child rather than re-deriving reduced-motion per component.
 */
export function TerminalRunner() {
  const reduceMotion = prefersReducedMotion();
  const instant = useRef(reduceMotion || hasAnimated(SESSION_KEY)).current;
  const [phase, setPhase] = useState<Phase>(instant ? 'ready' : 'command');

  useEffect(() => {
    if (!instant) markAnimated(SESSION_KEY);
  }, [instant]);

  const advanceFrom = (from: Phase, to: Phase) => setPhase((p) => (p === from ? to : p));

  return (
    <div className="h-full overflow-y-auto bg-black p-4 font-mono text-[13px] text-[#cccccc]">
      <div className="mb-3">
        <span style={{ color: CYAN }}>$ </span>
        <TypingLine
          text="./signature.sh"
          instant={instant}
          showCursorWhileTyping={!instant}
          onComplete={() => advanceFrom('command', 'analysis')}
        />
      </div>

      {phase === 'analysis' && (
        <TypedLineSequence
          lines={ANALYSIS_LINES}
          instant={instant}
          onComplete={() => advanceFrom('analysis', 'banner')}
        />
      )}

      {phaseAtLeast(phase, 'banner') && (
        <div className="mt-3">
          <AsciiRenderer
            lines={WELCOME_BANNER}
            instant={instant}
            onComplete={() => advanceFrom('banner', 'profile')}
          />
        </div>
      )}

      {phaseAtLeast(phase, 'profile') && (
        <EngineeringProfile instant={instant} onComplete={() => advanceFrom('profile', 'ready')} />
      )}

      {phaseAtLeast(phase, 'ready') && (
        <div className="mt-3">
          <TerminalPrompt />
        </div>
      )}
    </div>
  );
}
