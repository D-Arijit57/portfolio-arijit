import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { TypingLine } from '../signature/TypingLine';
import { TerminalPromptLine } from '../shared/TerminalPromptLine';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';

// Workspace Polish (Iteration 7 §2): matches DocumentationHero.tsx/
// MetadataRow.tsx's own explicit Roboto Mono override elsewhere on this
// same page — Tailwind's bare `font-mono` utility resolves to the
// workspace-wide default (Geist Mono, see index.css's `--font-mono`),
// which read as an inconsistent typeface next to the rest of Cortexa's doc
// page. Applied once on each terminal's outer body/header element; every
// descendant (TypedBlocks' lines, TypingLine's cursor) inherits it.
const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";

// Exported so ProjectDocumentationViewer can (a) check the same session gate
// synchronously — whether a repeat-visit-this-session or prefers-reduced-motion
// mount will skip straight to "done" — without duplicating the string, and
// (b) listen for the build-complete signal below to know when it's safe to
// reveal Core Features/Continue Exploring (Iteration 5 §6: those wait for
// "Solution Found", not the doc's own generic entrance fade).
export const SESSION_KEY = 'cortexa-problem-solution-terminals';
export const BUILD_COMPLETE_EVENT = 'cortexa-terminals-build-complete';

const LINE_GAP_MS = 120;
const PAUSE_BEFORE_TRANSITION_MS = 450;
const TRANSITION_HOLD_MS = 550;
const PROMPT_BLUE = '#569cd6';
const SUCCESS_GREEN = '#4ec9b0';

// Documentation Redesign (Iteration 3): grouped into blocks (blank-line
// paragraph breaks in the brief's exact source text) rather than one flat
// line list — TypedBlocks below types every line individually but adds
// breathing room before each new block, preserving the source's own
// paragraph structure without literally typing empty lines.
const PROBLEM_BLOCKS: string[][] = [
  ['Why does every interview still feel stitched together?'],
  ['One tool for scheduling.', 'Another for video.', 'Another for coding.'],
  ['The interview becomes fragmented before it even starts.'],
];

const SOLUTION_BLOCKS: string[][] = [
  ['Treat the interview as one workflow.'],
  ['Scheduling.', 'Coding.', 'Communication.', 'Evaluation.'],
  ['One session.', 'One source of truth.'],
];

type Phase = 'problem' | 'transition' | 'solution' | 'done';
const PHASE_ORDER: Phase[] = ['problem', 'transition', 'solution', 'done'];

/** Types every line in `blocks` in sequence, adding a bit of extra top
 * margin before the first line of each block after the first — the visual
 * equivalent of the blank lines separating paragraphs in the source text,
 * without animating an empty line. Local equivalent of TerminalRunner.tsx's
 * own TypedLineSequence (private to that file, so not imported directly). */
function TypedBlocks({ blocks, instant, onComplete }: { blocks: string[][]; instant: boolean; onComplete: () => void }) {
  const flatLines = useMemo(() => blocks.flat(), [blocks]);
  const blockStarts = useMemo(() => {
    const starts = new Set<number>();
    let cursor = 0;
    for (const block of blocks) {
      starts.add(cursor);
      cursor += block.length;
    }
    return starts;
  }, [blocks]);

  const [index, setIndex] = useState(0);
  const firedRef = useRef(false);

  const fireOnce = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    if (instant) fireOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant]);

  const lineClass = (i: number) => (i > 0 && blockStarts.has(i) ? 'mt-3 text-[#cccccc]' : 'text-[#cccccc]');

  if (instant) {
    return (
      <>
        {flatLines.map((line, i) => (
          <div key={i} className={lineClass(i)}>
            {line}
          </div>
        ))}
      </>
    );
  }

  const advance = () => {
    if (index + 1 >= flatLines.length) {
      fireOnce();
    } else {
      window.setTimeout(() => setIndex((i) => i + 1), LINE_GAP_MS);
    }
  };

  return (
    <>
      {flatLines.slice(0, index).map((line, i) => (
        <div key={i} className={lineClass(i)}>
          {line}
        </div>
      ))}
      <div className={index > 0 && blockStarts.has(index) ? 'mt-3' : ''}>
        <TypingLine key={index} text={flatLines[index]} className="text-[#cccccc]" onComplete={advance} />
      </div>
    </>
  );
}

// Layout Refinement (Iteration 4): the command line ("$ ./problem.sh") this
// used to type before its own blocks is gone — TerminalPanel's header already
// names the file ("./problem.sh"), so echoing the same command again inside
// the body was pure duplication. Typing now starts directly on the block
// content, no command-typed gate in front of it.
function TerminalBody({ blocks, instant, onComplete }: { blocks: string[][]; instant: boolean; onComplete: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <TypedBlocks blocks={blocks} instant={instant} onComplete={onComplete} />
    </div>
  );
}

// Workspace Polish (Iteration 7 §2): "refine, don't card-ify" — a slightly
// thinner, darker header (bg-[#181818], one shade below the panel body's
// own #1e1e1e, rather than the previously-lighter #252526) reads more like
// an editor title bar than a dashboard card's header; rounded-lg over the
// previous rounded-md softens the corner just enough to avoid looking
// clipped. The header/body divider stays the same border-[#3c3c3c] every
// other divider on this page already uses — a real separator, not a new
// one-off shade. leading-[2.1] nudges past Tailwind's own leading-loose
// ceiling (2) for a touch more breathing room between typed lines.
function TerminalPanel({ fileName, children }: { fileName: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-[#3c3c3c] bg-[#1e1e1e]">
      <div className="border-b border-[#3c3c3c] bg-[#181818] px-4 py-1.5">
        <span className="text-[11px] text-[#858585]" style={{ fontFamily: ROBOTO_MONO }}>
          {fileName}
        </span>
      </div>
      <div className="flex-1 p-5 text-[14px] leading-[2.1]" style={{ fontFamily: ROBOTO_MONO }}>
        {children}
      </div>
    </div>
  );
}

// Interaction Polish (Iteration 5 §4): while the build is in progress, three
// chevrons pulse in a staggered wave (build-flow-pulse, index.css) to read
// as motion flowing from Problem toward Solution — a continuous "this is
// happening now" indicator rather than a single static glyph, the second
// deliberate looping exception alongside ContributionsTerminal's own
// discovery-arrow-float (see index.css). Once the solution terminal's last
// line finishes typing, this swaps to a fading-in "Solution Found" and the
// loop stops for good — never left running or visible afterward.
function BuildStatus({ done, instant, onEnterComplete }: { done: boolean; instant: boolean; onEnterComplete?: () => void }) {
  if (done) {
    return (
      <motion.div
        initial={instant ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-center gap-1.5 whitespace-nowrap text-[12px]"
        style={{ color: SUCCESS_GREEN, fontFamily: ROBOTO_MONO }}
      >
        <CheckCircle2 size={13} className="shrink-0" />
        <span>Solution Found</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={instant ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onAnimationComplete={onEnterComplete}
      className="flex flex-col items-center gap-1.5"
    >
      <span aria-hidden="true" className="flex items-center gap-0.5 text-[13px]" style={{ color: PROMPT_BLUE, fontFamily: ROBOTO_MONO }}>
        <span className="build-flow-chevron">›</span>
        <span className="build-flow-chevron" style={{ animationDelay: '160ms' }}>›</span>
        <span className="build-flow-chevron" style={{ animationDelay: '320ms' }}>›</span>
      </span>
      <span className="whitespace-nowrap text-[12px] text-[#6a6a6a]" style={{ fontFamily: ROBOTO_MONO }}>
        Building Cortexa...
      </span>
    </motion.div>
  );
}

/**
 * Documentation Redesign (Iteration 3), widened in Iteration 4, given a
 * live build story in Iteration 5, restyled in Iteration 7 — Cortexa's
 * Problem/Solution as two parallel terminal sessions, rendered full-bleed
 * above DocumentationLayout's sidebar grid (see its own `intro` slot) so
 * each panel gets the whole page's width. Self-contained, zero-prop widget
 * registered in documentationWidgets.tsx under `problem-solution-terminals`
 * — same "bespoke, hardcoded-content widget for one specific page"
 * precedent as WelcomeIntro.tsx/IdentityTerminals.tsx, zero effect on
 * Rakshachakra's own doc page. Reuses TypingLine (signature/TypingLine.tsx)
 * and TerminalPromptLine (shared/TerminalPromptLine.tsx, the same "$ cat
 * cortexa.md" component the page's own hero already uses) rather than a
 * one-off heading — Iteration 7 §1 replaced the earlier "PROBLEM/problem.sh"
 * documentation-style label with an actual shell prompt for exactly this
 * reason: it's the same real prompt line the rest of the page already
 * speaks in, not a second typographic system.
 *
 * Layout: an explicit 2-row grid (prompt-line row, then terminal row)
 * rather than stacking each prompt inside its terminal's own flex column —
 * that would stretch the middle build-status column across both rows and
 * center it against the *combined* prompt+terminal height. Placing prompts
 * only in row 1 and status only in row 2 (`sm:row-start-2`, no span) means
 * items-stretch sizes row 2 to the terminals' own height alone, so
 * BuildStatus centers against just the two terminal windows — "visually
 * connect both panels" — independent of how tall row 1 is. `minmax(0,1fr)`
 * (not bare `1fr`) on the two flexible columns is what actually prevents
 * horizontal overflow: a bare `1fr` track's default min-width is its
 * content's min-content size, enough on its own to blow out the row's
 * total width past the viewport on a merely-normal desktop width.
 * `minmax(0, ...)` lets those columns shrink all the way down instead, so
 * the fixed-width middle column (auto, sized to its own short status text)
 * is the only thing that can't give. Explicit placement
 * (`sm:col-start-*`/`sm:row-start-*`) only applies at the `sm:` breakpoint;
 * below it the grid collapses to a single column and every child
 * free-flows in DOM order (prompt, terminal, status, prompt, terminal) as
 * a perfectly reasonable vertical stack.
 *
 * Phase machine (problem -> transition -> solution -> done), one phase
 * advancing only once the previous phase's own completion fires.
 * BUILD_COMPLETE_EVENT fires once phase reaches "done" (immediately, if
 * `instant`) — ProjectDocumentationViewer listens for it to gate Core
 * Features/Continue Exploring behind "Solution Found" rather than the doc's
 * own generic entrance timer, which would otherwise reveal them within
 * ~1s, long before an unhurried first-time build finishes. Session-gated
 * (hasAnimated/markAnimated) like every other reveal in this workspace: a
 * repeat visit this session, or prefers-reduced-motion, renders every phase
 * already complete with no animation and no build-status loop.
 */
export function ProblemSolutionTerminals() {
  const instant = useRef(hasAnimated(SESSION_KEY) || prefersReducedMotion()).current;
  const [phase, setPhase] = useState<Phase>(instant ? 'done' : 'problem');

  useEffect(() => {
    if (!instant) markAnimated(SESSION_KEY);
  }, [instant]);

  useEffect(() => {
    if (phase === 'done') window.dispatchEvent(new Event(BUILD_COMPLETE_EVENT));
  }, [phase]);

  const phaseAtLeast = (target: Phase) => PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(target);
  const advanceFrom = (from: Phase, to: Phase) => setPhase((p) => (p === from ? to : p));

  return (
    <div className="my-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:grid-rows-[auto_auto] sm:items-stretch">
      <TerminalPromptLine
        tokens={[{ text: './problem.sh', color: '#ffffff', opacity: 0.85 }]}
        className="sm:col-start-1 sm:row-start-1"
      />
      <div className="sm:col-start-1 sm:row-start-2">
        <TerminalPanel fileName="./problem.sh">
          <TerminalBody
            blocks={PROBLEM_BLOCKS}
            instant={instant}
            onComplete={() => window.setTimeout(() => advanceFrom('problem', 'transition'), PAUSE_BEFORE_TRANSITION_MS)}
          />
        </TerminalPanel>
      </div>

      {phaseAtLeast('transition') && (
        <div className="flex items-center justify-center px-2 py-4 sm:col-start-2 sm:row-start-2 sm:h-full">
          <BuildStatus
            done={phase === 'done'}
            instant={instant}
            onEnterComplete={
              phase === 'transition' ? () => window.setTimeout(() => advanceFrom('transition', 'solution'), TRANSITION_HOLD_MS) : undefined
            }
          />
        </div>
      )}

      {phaseAtLeast('solution') && (
        <>
          <TerminalPromptLine
            tokens={[{ text: './cortexa.sh', color: '#ffffff', opacity: 0.85 }]}
            className="sm:col-start-3 sm:row-start-1"
          />
          <div className="sm:col-start-3 sm:row-start-2">
            <TerminalPanel fileName="./cortexa.sh">
              <TerminalBody blocks={SOLUTION_BLOCKS} instant={instant} onComplete={() => advanceFrom('solution', 'done')} />
            </TerminalPanel>
          </div>
        </>
      )}
    </div>
  );
}
