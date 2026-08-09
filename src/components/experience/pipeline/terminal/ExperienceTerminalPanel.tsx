import React from 'react';
import { PANEL_BG, PANEL_BORDER } from '../tokens';

/**
 * cortexa.md's own accent, `documentation/CortexaTerminalPanel.tsx`'s
 * `ACCENT` verbatim — Terminal 1 and 2 now converge on cortexa.md's exact
 * terminal style (see below), not a nearby lookalike blue.
 */
export const PROMPT_ACCENT = '#38BDF8';
/** cortexa.md's own body text colour, `CortexaTerminalPanel.tsx`'s `TEXT`. */
const CORTEXA_TEXT = '#E5E7EB';
const DOT_COLORS = ['#ff5f56', '#ffbd2e', '#27c93f']; // Standard terminal traffic-light — same values CortexaTerminalPanel/TerminalWindowSvg already use.
export const TERMINAL_CWD = '~/journey/experience';

/**
 * The shared shell for Terminal 1 (americanchase.yaml) and Terminal 2
 * (pipeline.sh) — deliberately no longer a "sibling, not a shared import"
 * of `documentation/CortexaTerminalPanel.tsx`, but a match to its *exact*
 * terminal style: same panel background (`#161B22`), same translucent
 * `rgba(255,255,255,.08)` border used for both the outer frame and the
 * header divider, same `rounded-xl`, same header padding/type scale, same
 * full-opacity 9px dots, same `font-mono` (Geist Mono) body at
 * `text-[14px] leading-[1.9]`. An earlier pass deliberately kept this
 * feature's own palette (Roboto Mono, whoami.md's panel colours) on the
 * theory that copying the *shape* without importing the *page* kept the
 * two features independent — since superseded: the brief now asks for
 * cortexa.md's terminal style itself, not a lookalike inspired by it.
 * Terminal 3 (the source view) still uses this shell for its outer frame,
 * but keeps its own plain-label header (see `isPrompt` below) and its own
 * body typeface (`WorkHistoryYamlBlock`'s Geist Mono + Shiki, unrelated to
 * this change) — this pass was scoped to Terminal 1 and 2 specifically.
 *
 * The header carries the command itself — `$ cat ./americanchase.yaml`,
 * `$ ./pipeline.sh` — the `$` in cortexa.md's accent, the rest in
 * cortexa.md's text colour, exactly `CortexaTerminalPanel`'s own
 * `<span>$ </span><span>{fileName}</span>` markup. A title that isn't a
 * command (Terminal 3's "americanchase.yaml — source") still renders as a
 * plain dim label — only strings that actually start with `$` get the
 * prompt treatment.
 */
export function ExperienceTerminalPanel({
  title,
  headerExtra,
  className = '',
  dormant = false,
  children,
}: {
  /** A short, static window label — never the live command. */
  title: string;
  headerExtra?: React.ReactNode;
  className?: string;
  /**
   * A terminal that exists but hasn't been reached by the execution chain
   * yet. Same treatment as CortexaTerminalPanel's own `dormant`, and the
   * same value (0.3 / 250ms): a single opacity on the root rather than
   * per-element muting, so the panel dims as one object and stays mounted
   * at full size throughout — which is what keeps the layout stable and
   * stops the connector needing to re-measure when it wakes.
   */
  dormant?: boolean;
  children: React.ReactNode;
}) {
  const isPrompt = title.startsWith('$');

  return (
    // rounded-xl, matching CortexaTerminalPanel exactly — a real terminal
    // window's corners aren't square, but this pass converges on cortexa.md's
    // own radius rather than picking a new one.
    <div
      className={`overflow-hidden rounded-xl ${className}`}
      style={{
        backgroundColor: PANEL_BG,
        border: `1px solid ${PANEL_BORDER}`,
        opacity: dormant ? 0.3 : 1,
        transition: 'opacity 250ms ease-out',
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}
      >
        {isPrompt ? (
          <span className="min-w-0 truncate font-mono text-[13px]">
            <span style={{ color: PROMPT_ACCENT }}>$</span>
            <span style={{ color: CORTEXA_TEXT }}>{title.slice(1)}</span>
          </span>
        ) : (
          <span className="min-w-0 truncate font-mono text-[13px] text-[#6e7681]">{title}</span>
        )}
        <div className="flex shrink-0 items-center gap-3">
          {headerExtra}
          <div className="flex items-center gap-[6px]">
            {DOT_COLORS.map((color) => (
              <span key={color} className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>
      {/* p-6 / text-[14px] / leading-[1.9], matching CortexaTerminalPanel's
          own body treatment exactly (not a max-width — the pipeline inside
          is meant to span the terminal, so padding stays the only thing
          holding content off the edges). */}
      <div className="p-6 font-mono text-[14px] leading-[1.9]" style={{ color: CORTEXA_TEXT }}>
        {children}
      </div>
    </div>
  );
}

/**
 * One `arijit@portfolio:~/journey/experience$ <command>` line — the actual
 * prompt, printed as the first line of a terminal's scrolling body
 * content (not window chrome; see the shell's own comment above).
 * `command` is a node so a caller can pass a `<TypingLine>` while its own
 * reveal sequence animates and the plain final string once it's done,
 * without this component knowing anything about that state.
 */
export function TerminalPromptLine({ command }: { command: React.ReactNode }) {
  return (
    <div className="whitespace-pre">
      <span style={{ color: PROMPT_ACCENT }}>arijit@portfolio</span>
      <span className="text-[#6e7681]">:</span>
      <span style={{ color: PROMPT_ACCENT }}>{TERMINAL_CWD}</span>
      <span className="text-[#6e7681]">$ </span>
      <span className="text-[#cccccc]">{command}</span>
    </div>
  );
}
