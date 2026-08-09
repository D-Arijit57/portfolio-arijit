import React from 'react';
import { PANEL_BG, PANEL_BORDER, RULE } from '../tokens';
import { ROBOTO_MONO } from './robotoMono';

export const PROMPT_ACCENT = '#569cd6'; // VS Code prompt-blue — the same accent whoami.md's own $ prompts use, not a new colour.
const DOT_COLORS = ['#ff5f56', '#ffbd2e', '#27c93f']; // Standard terminal traffic-light — same values CortexaTerminalPanel/TerminalWindowSvg already use.
export const TERMINAL_CWD = '~/journey/experience';

/**
 * The shared shell for all three American Chase terminal surfaces
 * (Terminal 1 — americanchase.yaml, Terminal 2 — pipeline.sh, Terminal 3 —
 * source). Modeled on documentation/CortexaTerminalPanel.tsx's shape
 * (rounded panel, hairline header divider, traffic-light dots) — the
 * strongest reusable terminal-window shell already in the codebase — but
 * deliberately a sibling component, not a shared import: Cortexa's shell
 * is that page's own visual identity (Geist Mono body, `#38BDF8` accent,
 * `#161B22` panel), and this feature has its own (Roboto Mono throughout,
 * whoami.md's `#111318`/`#2d2d30` panel colours, VS Code prompt-blue) —
 * copying the *shape* without importing the *page* keeps the two features
 * independent, per "do not touch unrelated renderers."
 *
 * The header is window chrome only — a short, static, dim title (like a
 * real terminal tab: "bash", a filename) plus the traffic-light dots.
 * It deliberately does NOT carry the live `$ command` prompt: a real
 * terminal's title bar doesn't retype what the shell is doing, and a
 * previous version of this shell put the full `user@host:cwd$ command`
 * line in the header, which read as chrome duplicating content instead of
 * framing it. The prompt itself now lives in the scrolling body, as the
 * first line of output — see `TerminalPromptLine` below — exactly where a
 * real terminal prints it.
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
  return (
    <div
      className={`overflow-hidden rounded-md ${className}`}
      style={{
        backgroundColor: PANEL_BG,
        border: `1px solid ${PANEL_BORDER}`,
        opacity: dormant ? 0.3 : 1,
        transition: 'opacity 250ms ease-out',
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5"
        style={{ borderBottom: `1px solid ${RULE}`, fontFamily: ROBOTO_MONO }}
      >
        <span className="min-w-0 truncate text-[11.5px] text-[#6e7681]">{title}</span>
        <div className="flex shrink-0 items-center gap-3">
          {headerExtra}
          <div className="flex items-center gap-[6px]">
            {DOT_COLORS.map((color) => (
              <span key={color} className="h-[8px] w-[8px] rounded-full opacity-70" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>
      {/* px-7 rather than a max-width: the pipeline inside is meant to
          span the terminal, so the padding is the only thing holding it
          off the edges — which lands the flow at roughly 90% of the
          panel's width on a wide editor pane, per the brief, without
          capping it into a narrow centred column on an even wider one. */}
      <div className="px-7 py-5 text-[13px] leading-[1.7]" style={{ fontFamily: ROBOTO_MONO }}>
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
