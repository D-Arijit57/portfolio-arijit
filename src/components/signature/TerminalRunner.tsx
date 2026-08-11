import React, { useEffect, useRef, useState } from 'react';
import { TypingLine } from './TypingLine';
import { WelcomeBanner } from './WelcomeBanner';
import { EngineeringProfile } from './EngineeringProfile';
import { TerminalPrompt } from './TerminalPrompt';
import { HandoffHint } from './HandoffHint';
import { CampfireScene } from './CampfireScene';
import { VisitorLine } from './VisitorLine';
import { CYAN } from './palette';
import { REVEAL_MS as CAMPFIRE_REVEAL_MS } from './CampfireScene';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import {
  LINE_GAP_MS,
  ANALYSIS_CHAR_MS_RANGE,
  ANALYSIS_LINE_GAP_MS,
  HANDOFF_CODA_MS,
  HINT_SETTLE_MS,
} from './timing';
import { recordVisit } from '../../lib/api/visitorClient';
import { useStore } from '../../store/useStore';

const SESSION_KEY = 'signature-terminal-sequence';

// Startup Timing Reduction: trimmed from 7 lines to the 3 that carry the
// phase's whole arc (read → analyze → render) — the other 4 said nothing
// the reader needed, and this entire block is discarded the instant the
// phase advances (see the phase-machine's own comment below), so there was
// no payoff for reading all 7 in the first place.
const ANALYSIS_LINES = ['Reading workspace...', 'Analyzing repositories...', 'Rendering signature...'];

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
  charMsRange,
  instant,
  onComplete,
}: {
  lines: string[];
  startDelayMs?: number;
  gapMs?: number;
  charMsRange?: [number, number];
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
      <TypingLine key={index} text={lines[index]} charMsRange={charMsRange} onComplete={advance} />
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
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  useEffect(() => {
    if (!instant) markAnimated(SESSION_KEY);
  }, [instant]);

  // Started on mount, not gated on reaching 'ready' — the request has the
  // whole ~2.5-3s boot sequence to resolve, so by the time the MOTD line
  // would actually render (see the ready block below) a real number is
  // already in hand almost every time, instead of the line popping in
  // late after the rest of the prompt has settled.
  useEffect(() => {
    let cancelled = false;
    recordVisit().then((result) => {
      if (!cancelled && result.status === 'success') setVisitorCount(result.count);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const advanceFrom = (from: Phase, to: Phase) => setPhase((p) => (p === from ? to : p));

  const ready = phaseAtLeast(phase, 'ready');

  // ---- Phase 9C: the cursor handoff -------------------------------------
  // Nothing about the sequence above changes. This only decides *when* this
  // pane stops being the surface that looks like it takes input.
  const setShellOwner = useStore((state) => state.setShellOwner);

  // Seeded true when `instant`: a repeat visit renders the sequence's settled
  // end state, and the hint is part of that end state — it is the log's last
  // printed line, not a transition. Same rule every other phase follows here.
  const [hintVisible, setHintVisible] = useState(instant);

  // Claim the shell for as long as a real sequence is going to play. Skipped
  // entirely when `instant` (repeat visit this session, or reduced motion):
  // there is no sequence to watch, so there is nothing to hand off *from* —
  // the store's 'terminal' default already has it right, and claiming here
  // would only produce a pointless flicker of ownership on mount.
  // The cleanup releases it, so closing startup.log mid-sequence can never
  // strand the real Terminal without a cursor.
  useEffect(() => {
    if (instant) return undefined;
    setShellOwner('signature');
    return () => setShellOwner('terminal');
  }, [instant, setShellOwner]);

  // Hand it over once the campfire has actually landed — measured from the
  // scene's own REVEAL_MS, not from `ready`. `ready` is the moment ignition
  // *starts*; the reveal then runs for CAMPFIRE_REVEAL_MS, and only after
  // that (plus a short coda) is there a quiet moment to hand off into. This
  // is what keeps the handoff an epilogue to the climax instead of a fourth
  // thing competing inside it.
  //
  // The handoff is two beats, not one: the hint line prints first, the cursor
  // stops HINT_SETTLE_MS later. Both timers are set up together here so the
  // ordering between them is readable in one place, and both are cleared
  // together — leaving startup.log mid-coda can't leave a stray timer that
  // flips ownership after this pane is gone.
  useEffect(() => {
    if (instant || !ready) return undefined;
    const hintAt = CAMPFIRE_REVEAL_MS + HANDOFF_CODA_MS;
    const showHint = window.setTimeout(() => setHintVisible(true), hintAt);
    const handOff = window.setTimeout(() => setShellOwner('terminal'), hintAt + HINT_SETTLE_MS);
    return () => {
      window.clearTimeout(showHint);
      window.clearTimeout(handOff);
    };
  }, [instant, ready, setShellOwner]);
  // ---- end cursor handoff -----------------------------------------------

  return (
    <div className="relative h-full overflow-y-auto bg-black p-4 font-mono text-[13px] text-[#cccccc]">
      <CampfireScene ignite={ready} instant={instant} />

      <div className="relative z-10">
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
            gapMs={ANALYSIS_LINE_GAP_MS}
            charMsRange={ANALYSIS_CHAR_MS_RANGE}
            instant={instant}
            onComplete={() => advanceFrom('analysis', 'banner')}
          />
        )}

        {phaseAtLeast(phase, 'banner') && (
          <div className="mt-3">
            <WelcomeBanner instant={instant} onComplete={() => advanceFrom('banner', 'profile')} />
          </div>
        )}

        {phaseAtLeast(phase, 'profile') && (
          <EngineeringProfile instant={instant} onComplete={() => advanceFrom('profile', 'ready')} />
        )}

        {ready && (
          <div className="mt-3">
            {visitorCount !== null && <VisitorLine count={visitorCount} />}
            <TerminalPrompt />
            {hintVisible && <HandoffHint instant={instant} />}
          </div>
        )}
      </div>
    </div>
  );
}
