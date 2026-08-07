import React from 'react';
import { CortexaTerminalPanel } from './CortexaTerminalPanel';
import { DECISIONS, TRADEOFF_NOTE, type DecisionId } from '../../content/cortexaNarrative';

const TEXT = '#E5E7EB';
const MUTED = '#9CA3AF';
const DIM = '#6B7280';

// One shared template for the header, the rule and every row, so the four
// columns align by construction rather than by hand-tuned padding. Widths
// are measured against the longest value in each column at 13px ("shared
// state", "judge worker", "cron+Postgres") with headroom, inside the row's
// real 439px — which is also what caps the reasons at one or two words.
// `truncate` on each cell stays as a safety net for narrower viewports.
const COLUMNS = 'grid grid-cols-[100px_100px_108px_1fr] gap-x-2';

const ROW_STAGGER_MS = 55;

/**
 * cortexa.sh — the engineering decision log, and the one block on this page
 * that can't be written by someone who didn't build the thing.
 *
 * Presented as a compact aligned table rather than prose: five rows the eye
 * can scan vertically in a couple of seconds, in the register of real CLI
 * output. The `chose / over / because` header does double duty — it aligns
 * the columns and it tells a non-technical reader the *shape* of what
 * they're looking at ("this person chose things over other things, for
 * reasons") even when the individual values mean nothing to them. The
 * engineering isn't simplified; only its presentation is.
 *
 * Hovering a row is the page's single interaction primitive: it raises that
 * decision and lights the evidence it produced in run-cortexa's replay (see
 * CortexaExecutionFlow, which owns the shared hover state).
 */
export function CortexaDecisionTerminal({
  solutionRef,
  revealedCount,
  skip,
  dormant,
  activeDecision,
  onHoverDecision,
}: {
  solutionRef: React.RefObject<HTMLDivElement | null>;
  revealedCount: number;
  skip: boolean;
  dormant: boolean;
  activeDecision: DecisionId | null;
  onHoverDecision: (id: DecisionId | null) => void;
}) {
  const allRevealed = skip || revealedCount >= DECISIONS.length;

  return (
    <div ref={solutionRef}>
      {/* No constraint string in the header: problem.sh states it directly
          above and the wire carries it here, so repeating the text a third
          time would be the exact redundancy this page removed. */}
      {/* Both signals live in the header rather than as body lines: the
          constraint marker keeps the dependency on problem.sh legible, and
          the hover affordance stays discoverable without spending vertical
          space in the column that now sets the composition's height. */}
      <CortexaTerminalPanel
        fileName="./cortexa.sh"
        dormant={dormant}
        bodyPadding="p-5"
        headerExtra={
          <span className="hidden font-mono text-[11px] sm:inline" style={{ color: DIM }}>
            --constraint ↑ · hover rows
          </span>
        }
      >
        <div className="flex flex-col text-[13px] leading-[1.55]">
          <div className={COLUMNS} style={{ color: DIM }}>
            <span />
            <span>chose</span>
            <span>over</span>
            <span>because</span>
          </div>
          <div className="my-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,.08)' }} />

          {DECISIONS.map((decision, index) => {
            const revealed = skip || index < revealedCount;
            const isActive = activeDecision === decision.id;
            const isDimmed = activeDecision !== null && !isActive;

            return (
              <div
                key={decision.id}
                onMouseEnter={() => onHoverDecision(decision.id)}
                onMouseLeave={() => onHoverDecision(null)}
                onFocus={() => onHoverDecision(decision.id)}
                onBlur={() => onHoverDecision(null)}
                tabIndex={0}
                // Zero vertical padding so the five rows read as one
                // continuous block of CLI output rather than a stack of
                // cards. The hover hitbox stays generous because the row's
                // line-height (1.55 at 13px ≈ 20px) already exceeds the
                // glyph height — the target shrinks visually, not
                // physically.
                className={`${COLUMNS} -mx-2 rounded px-2 outline-none`}
                style={{
                  opacity: revealed ? (isDimmed ? 0.4 : 1) : 0,
                  backgroundColor: isActive ? 'rgba(56,189,248,.07)' : 'transparent',
                  transition: skip
                    ? 'opacity 150ms ease-out, background-color 150ms ease-out'
                    : `opacity 200ms ease-out ${index * ROW_STAGGER_MS}ms, background-color 150ms ease-out`,
                }}
              >
                {/* Four-step contrast ladder, no extra hues: the chosen
                    technology is brightest, the concern sits mid, the
                    rejected alternative is struck through, and the reason
                    is dimmest. */}
                <span className="truncate" style={{ color: MUTED }}>
                  {decision.concern}
                </span>
                <span className="truncate" style={{ color: TEXT }}>
                  {decision.chosen}
                </span>
                <span className="truncate" style={{ color: DIM, textDecoration: 'line-through' }}>
                  {decision.rejected}
                </span>
                <span className="truncate" style={{ color: DIM }}>
                  {decision.reason}
                </span>
              </div>
            );
          })}

          {/* No "5 decisions · 5 alternatives rejected" tally: the five
              rows are right there to be counted, and this column now sets
              the whole composition's height. The page's one piece of honest
              hindsight follows instead — an accepted architectural
              tradeoff, styled as a real comment block so it reads as
              terminal output rather than as a disclaimer. */}
          <div
            className="mt-3 text-[12px] leading-[1.4]"
            style={{
              color: DIM,
              opacity: allRevealed ? 1 : 0,
              transition: 'opacity 260ms ease-out 120ms',
            }}
          >
            {TRADEOFF_NOTE.map((line) => (
              <p key={line}>
                <span>#</span> {line}
              </p>
            ))}
          </div>
        </div>
      </CortexaTerminalPanel>
    </div>
  );
}
