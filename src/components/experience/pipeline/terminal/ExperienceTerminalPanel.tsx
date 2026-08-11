import React from 'react';
import { PANEL_BG } from '../tokens';
import { CHROME, PALETTE } from '../../../shared/terminalTokens';

/**
 * cortexa.md's own accent, `documentation/CortexaTerminalPanel.tsx`'s
 * `ACCENT` verbatim — Terminal 1 and 2 now converge on cortexa.md's exact
 * terminal style (see below), not a nearby lookalike blue.
 */
export const PROMPT_ACCENT = PALETTE.docPanel.accent;
/** cortexa.md's own body text colour, `CortexaTerminalPanel.tsx`'s `TEXT`. */
const CORTEXA_TEXT = PALETTE.docPanel.text;
const DOT_COLORS = CHROME.dots.colors; // Standard terminal traffic-light — same values CortexaTerminalPanel/TerminalWindowSvg already use.
export const TERMINAL_CWD = '~/journey/experience';
/** whoami.md's git-log box's own border/divider colour — Phase 9B (second
 * pass) converges this shell's own chrome onto it exactly, same as
 * `documentation/ProjectTerminalPanel.tsx`'s own `CHROME_BORDER`. */
const CHROME_BORDER = '#333333';

/**
 * The shared shell for Terminal 1 (americanchase.yaml), Terminal 2
 * (pipeline.sh), and Terminal 3's outer frame (the source view). Phase 9B
 * (second pass): the header now matches whoami.md's own `git log --oneline`
 * box exactly — `rounded-md`, `#333333` border for both the outer frame and
 * the header divider, dots *first* (not last) at 8px/`gap-2`, a single flat
 * muted (`#858585`) `text-[10px]` label with no accent-coloured prompt
 * symbol. `documentation/ProjectTerminalPanel.tsx` converged onto the exact
 * same chrome in the same pass — see that file's own comment. Body
 * typography/padding (`p-6`, `text-[14px] leading-[1.9]`, Geist Mono) is
 * untouched: that's this pipeline's own established content system, not
 * "chrome," and stays exactly as it was — Terminal 3 still keeps its own
 * body typeface (`WorkHistoryYamlBlock`'s Geist Mono + Shiki) independent
 * of this change.
 *
 * `title` carries the command as plain text now — `cat ./americanchase.yaml`,
 * `./pipeline.sh` — with any leading `$ ` stripped rather than coloured, same
 * as a title that was never a command (Terminal 3's "americanchase.yaml —
 * source"): both render as the identical flat label after the dots.
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
  // Phase 9B (second pass): title (whether it's `$ command` or a plain
  // label) always renders as one flat muted string now — whoami.md's
  // git-log box's own header has no accent-coloured prompt symbol, just a
  // plain label after the dots, and this shell now matches that exactly.
  const label = title.startsWith('$') ? title.slice(1).trim() : title;

  return (
    // rounded-md / border-#333333, whoami.md's git-log box's own chrome,
    // matching documentation/ProjectTerminalPanel.tsx's own second-pass
    // convergence exactly rather than this shell's earlier rounded-xl copy
    // of Cortexa's panel.
    <div
      className={`overflow-hidden rounded-md ${className}`}
      style={{
        backgroundColor: PANEL_BG,
        border: `1px solid ${CHROME_BORDER}`,
        opacity: dormant ? 0.3 : 1,
        transition: 'opacity 250ms ease-out',
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-3 py-1"
        style={{ borderBottom: `1px solid ${CHROME_BORDER}` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {DOT_COLORS.map((color) => (
            <span key={color} className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          ))}
          <span className="ml-2 truncate font-mono text-[10px]" style={{ color: '#858585' }}>
            {label}
          </span>
        </div>
        {headerExtra}
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
