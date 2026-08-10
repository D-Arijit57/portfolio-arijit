import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useFileRevealSequence } from '../../../hooks/useFileRevealSequence';
import { useInViewOnce } from '../../../hooks/useInViewOnce';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../../lib/typingReveal';
import { ExperienceTerminalOne } from './terminal/ExperienceTerminalOne';
import { ExperienceTerminalTwo } from './terminal/ExperienceTerminalTwo';
import { ExperienceTerminalThree } from './terminal/ExperienceTerminalThree';
import { PROMPT_ACCENT } from './terminal/ExperienceTerminalPanel';
import { TerminalExecutionWire, type WireState } from './terminal/TerminalExecutionWire';
import { ROBOTO_MONO } from './terminal/robotoMono';
import { SURFACE } from './tokens';
import type { PipelineVisualizationModel, WorkExperience } from '../../../experience/types';
import type { VirtualFile } from '../../../types';

const CHAIN_SESSION_KEY = 'americanchase-execution-chain';

/**
 * The pause between Terminal 1 finishing and the channel to Terminal 2
 * opening. Cortexa's own PROBLEM_READ_MS, reused rather than re-picked:
 * there, it's how long problem.sh is left to be read before it emits its
 * constraint; here it's the same beat, for the same reason — the handoff
 * has to look like a consequence of the first terminal's output, which
 * means the output needs a moment to exist as something read rather than
 * something passed through.
 */
const SETTLE_READ_MS = 600;

/** Cortexa's BRIGHTEN_MS: the dormant → active fade, run before the woken terminal produces any output. */
const BRIGHTEN_MS = 250;

/**
 * How much of Terminal 2 must be on screen before its pipeline is worth
 * running — the American Chase counterpart to CortexaExecutionFlow's
 * `executionInView` gate (same `useInViewOnce` hook, same one-shot latch).
 * Unlike run-cortexa, this pipeline doesn't grow while it plays — the whole
 * four-stage row is laid out from the first frame — so there's no need for
 * Cortexa's "room below the top edge" sentinel math; gating on the row
 * itself crossing this threshold is enough to guarantee the reader can
 * actually watch the stages unlock.
 */
const PIPELINE_VISIBLE_THRESHOLD = 0.4;

/**
 * The execution chain, as one dependency sequence rather than two terminals
 * that happen to animate in order. Mirrors CortexaExecutionFlow's stage
 * model exactly, including its central rule: each step is released by a
 * real completion signal from the step before it — Terminal 1's last line's
 * `animationend`, then the wire's own draw `animationend`, then the pulse's
 * — never by a duration guessed alongside them.
 */
type ChainStage = 'terminal-one' | 'settling' | 'wire' | 'transfer' | 'waking' | 'terminal-two';

const CHAIN_ORDER: ChainStage[] = ['terminal-one', 'settling', 'wire', 'transfer', 'waking', 'terminal-two'];

/**
 * americanchase.yaml, terminalized (Terminalized Workspace redesign,
 * Phase 3 of 3 — complete): three self-contained terminal sessions —
 * ExperienceTerminalOne (`cat ./americanchase.yaml` — what was the work),
 * ExperienceTerminalTwo (`./pipeline.sh` — how did the system work, all
 * four stages visible at once), and ExperienceTerminalThree (the actual
 * YAML source, hidden until "view source" is opened). Each terminal owns
 * its own reveal sequence and session key; this file just mounts them and
 * owns the one thing genuinely shared across all three — the "view
 * source" trigger and its collapse/expand state.
 *
 * The trigger reads `$ cat ./americanchase.yaml` rather than a
 * conventional "view source" link (Terminal 3's own brief: it should feel
 * like a command, not a website control) and is deliberately NOT identical
 * to Terminal 1's own tab title, which uses the same command for a
 * different reason (Terminal 1 is the *interpreted* reading; Terminal 3 is
 * the literal file) — Terminal 3's own panel is titled
 * "americanchase.yaml — source" once open, so the two never look like
 * duplicate tabs.
 *
 * Terminal 3 mounts lazily on first open (`hasOpened`) — nothing about it
 * costs anything until a reader deliberately asks for it — then stays
 * mounted so subsequent collapse/expand only ever toggles a CSS
 * `grid-template-rows` transition (0fr ↔ 1fr), the standard
 * measurement-free way to animate an unknown-height panel. No JS height
 * measurement, no animation library; `prefers-reduced-motion` simply
 * removes the transition, so collapse/expand becomes an instant snap with
 * every bit of information already in the DOM either way.
 *
 * StageDetail.tsx and WorkHistoryYamlBlock.tsx needed zero changes across
 * all three phases: both are reused completely unmodified.
 */
export function PipelineVisualization({
  experience,
  visualization,
  file,
}: {
  experience: WorkExperience;
  visualization: PipelineVisualizationModel;
  file: VirtualFile;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  /** The chain's own coordinate space — must be the element the wire's SVG
   * is absolutely positioned against, not the padded scroll container
   * outside it, or every measured endpoint lands offset by that padding. */
  const chainRef = useRef<HTMLDivElement>(null);
  const terminalOneRef = useRef<HTMLDivElement>(null);
  const terminalTwoRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useRef(prefersReducedMotion()).current;
  const sourcePanelId = useId();

  const [expanded, setExpanded] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  // Reduced motion, or a repeat visit this session: the whole chain renders
  // at its final state — both terminals active, the channel idle, the
  // pipeline settled — with no handoff to watch and nothing missing.
  const skipChain = useRef(reduceMotion || hasAnimated(CHAIN_SESSION_KEY)).current;
  const [chain, setChain] = useState<ChainStage>(skipChain ? 'terminal-two' : 'terminal-one');

  useEffect(() => {
    if (!skipChain) markAnimated(CHAIN_SESSION_KEY);
  }, [skipChain]);

  const chainAtLeast = (target: ChainStage) => CHAIN_ORDER.indexOf(chain) >= CHAIN_ORDER.indexOf(target);

  // Terminal 2 may brighten and print its static shell (the "$ ./pipeline.sh"
  // line, the dormant four-stage architecture) as soon as the chain hands it
  // execution, off-screen or not — that part is cheap and reserves its own
  // layout. The stage-by-stage unlock cascade is the part actually worth
  // watching, so it additionally waits for this latch: don't blindly run the
  // whole pipeline animation while the reader can't see it (brief §13).
  const { ref: terminalTwoInViewRef, inView: terminalTwoInView } =
    useInViewOnce<HTMLDivElement>(PIPELINE_VISIBLE_THRESHOLD);
  const pipelineMayRun = skipChain || (chainAtLeast('terminal-two') && terminalTwoInView);

  // Terminal 1 genuinely finished printing → hold a beat, then open the
  // channel. The only timer in the chain; every other step is released by
  // an animation actually completing.
  const handleTerminalOneComplete = useCallback(() => {
    if (skipChain) return;
    setChain((stage) => (stage === 'terminal-one' ? 'settling' : stage));
  }, [skipChain]);

  useEffect(() => {
    if (skipChain || chain !== 'settling') return undefined;
    const timer = window.setTimeout(() => setChain('wire'), SETTLE_READ_MS);
    return () => window.clearTimeout(timer);
  }, [skipChain, chain]);

  // The wire finished drawing → send the packet.
  const handleWireDrawn = useCallback(() => {
    setChain((stage) => (stage === 'wire' ? 'transfer' : stage));
  }, []);

  // The packet arrived → brighten Terminal 2, then let it run. Output only
  // begins once the terminal is fully lit (Cortexa's own rule).
  const handleTransferArrived = useCallback(() => {
    setChain((stage) => (stage === 'transfer' ? 'waking' : stage));
  }, []);

  useEffect(() => {
    if (skipChain || chain !== 'waking') return undefined;
    const timer = window.setTimeout(() => setChain('terminal-two'), BRIGHTEN_MS);
    return () => window.clearTimeout(timer);
  }, [skipChain, chain]);

  const wireState: WireState = skipChain
    ? 'idle'
    : chain === 'terminal-one' || chain === 'settling'
      ? 'dormant'
      : chain === 'wire'
        ? 'drawing'
        : chain === 'transfer'
          ? 'transferring'
          : 'idle';

  // The source view is a reference, not a performance — it renders at its
  // final state with no typing, so opening it is instant every time.
  const sourceSequence = useFileRevealSequence({
    fileId: `${file.id}-source`,
    unitCount: 1,
    enabled: false,
  });

  const handleToggle = () => {
    if (!hasOpened) setHasOpened(true);
    setExpanded((value) => !value);
  };

  return (
    <div
      ref={containerRef}
      className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden px-8 py-5"
      style={{ backgroundColor: SURFACE }}
    >
      {/* Widened from max-w-5xl (1024px): the pipeline is horizontal and
          is supposed to use the editor's real width, so capping the page
          at a reading column was leaving most of a wide pane unused. The
          cap that remains only stops the terminals stretching absurdly on
          an ultra-wide monitor; Terminal 1's prose sets its own 72ch
          measure independently, so widening this never hurts readability. */}
      {/* `relative` so the execution channel's absolutely-positioned SVG
          overlay shares this element's coordinate space — the same
          container-relative measurement CortexaConnectors does. */}
      <div ref={chainRef} className="relative mx-auto flex w-full max-w-[1500px] flex-col">
        <TerminalExecutionWire
          containerRef={chainRef}
          fromRef={terminalOneRef}
          toRef={terminalTwoRef}
          state={wireState}
          onDrawComplete={handleWireDrawn}
          onTransferComplete={handleTransferArrived}
        />

        <div ref={terminalOneRef}>
          <ExperienceTerminalOne
            experience={experience}
            visualization={visualization}
            onRevealComplete={handleTerminalOneComplete}
          />
        </div>

        {/* The gap the channel runs through. Wide enough for the wire to
            read as a span between two processes rather than a seam between
            two stacked boxes; not so wide that the terminals stop feeling
            like one system. */}
        <div
          ref={(node) => {
            terminalTwoRef.current = node;
            terminalTwoInViewRef.current = node;
          }}
          className="mt-10"
        >
          <ExperienceTerminalTwo
            visualization={visualization}
            active={chainAtLeast('terminal-two')}
            running={pipelineMayRun}
          />
        </div>

        <footer className="mt-6 flex flex-col items-end">
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-controls={sourcePanelId}
            className="flex items-center gap-1.5 text-[11px] text-[#6e7681] hover:text-[#cccccc] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#4fc1ff]"
            style={{ fontFamily: ROBOTO_MONO }}
          >
            <ChevronRight
              size={12}
              aria-hidden="true"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'none',
                transition: reduceMotion ? 'none' : 'transform 150ms ease-out',
              }}
            />
            <span style={{ color: PROMPT_ACCENT }}>$</span> cat ./americanchase.yaml
          </button>

          <div
            id={sourcePanelId}
            className="w-full"
            style={{
              display: 'grid',
              gridTemplateRows: expanded ? '1fr' : '0fr',
              transition: reduceMotion ? 'none' : 'grid-template-rows 220ms ease-out',
            }}
          >
            <div className="overflow-hidden">
              {hasOpened && (
                <div className="mt-4">
                  <ExperienceTerminalThree file={file} sequence={sourceSequence} />
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
