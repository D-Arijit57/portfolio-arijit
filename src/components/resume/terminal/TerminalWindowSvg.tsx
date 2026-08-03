import React, { useMemo } from 'react';
import { parseTerminalContent, type ParsedLine } from './parseTerminalLines';
import {
  COMMAND_TEXT,
  LOADING_MESSAGES,
  PROMPT_PREFIX,
  type TerminalPlaybackState,
} from './useTerminalPlayback';

const FONT_SIZE = 15;
const LINE_H = 20;
const BLANK_H = 12;
const CHAR_W = 9;
const PAD_X = 28;
const PAD_TOP = 20;
const PAD_BOTTOM = 26;
const HEADER_H = 40;
const RADIUS = 12;

// A pure content-driven width (padding + longest line's columns) reads too
// narrow/tall once the wrapper stretches it to ~88% of the editor's width —
// tall report, narrow window. Enforcing a minimum width/height ratio keeps
// the window a believable terminal-pane shape and, more importantly, keeps
// the whole thing inside one viewport at typical pane sizes instead of
// forcing a scroll to see the last lines.
const MIN_ASPECT = 0.95;

const DOT_R = 6;
const DOT_GAP = 18;
const DOT_START_X = 22;
const DOT_COLORS = ['#ff5f56', '#ffbd2e', '#27c93f'];

const TITLE_TEXT = 'Hiring Evaluation';
const TITLE_FONT_SIZE = 13;
const TITLE_COLOR = '#cccccc';

const CURSOR_GLYPH = '█'; // full block — a classic hard-edged terminal caret
const CURSOR_COLOR = '#ffffff';

const TEXT_COLOR: Partial<Record<LineKind_, string>> = {
  command: '#569cd6',
  heading: '#569cd6',
  muted: '#8b949e',
  separator: '#6e7681',
  success: '#89d185',
  tradeoff: '#e2c08d',
  bullet: '#cccccc',
  // "Learn More" actions — same blue as commands/headings, deliberately:
  // they're styled to read as terminal paths/commands, not as web links
  // (nothing here is actually clickable, so no underline/link affordance).
  action: '#569cd6',
};

type LineKind_ = ParsedLine['kind'];

interface LineLayout {
  parsed: ParsedLine;
  baseline: number;
  /** Position among the lines this component reveals progressively —
   * undefined for the command/loading rows, which have their own bespoke
   * playback instead. */
  contentIndex?: number;
  isLast: boolean;
}

const DEFAULT_PLAYBACK: TerminalPlaybackState = {
  phase: 'done',
  typedCommand: COMMAND_TEXT,
  loadingText: LOADING_MESSAGES[0],
  revealedContentLines: Infinity,
};

/**
 * A reusable terminal-window SVG: rounded window, subtle border, a title
 * bar (traffic lights left, "Hiring Evaluation" centered across the full
 * width like a real app window, hairline separating it from the body), and
 * Roboto Mono text colored per hire_me.md's syntax palette. Pure vector —
 * every line is a real <text>/<tspan>, so it stays crisp at any zoom or
 * scale factor, unlike a rasterized screenshot.
 *
 * Sizing is derived from the parsed content (longest line's character
 * count, total row count) rather than hardcoded — including the animated
 * command/loading rows' own (longer) text, since the box must be wide
 * enough for those even though they're not literally in file.content — so
 * the window's aspect ratio always matches what it's actually rendering.
 *
 * The `playback` prop (see useTerminalPlayback) is optional and defaults to
 * a fully-settled "done" state, which is what makes this component usable
 * standalone without wiring up the playback hook.
 */
export function TerminalWindowSvg({
  content,
  playback = DEFAULT_PLAYBACK,
}: {
  content: string;
  playback?: TerminalPlaybackState;
}) {
  const { lines, width, height, textX } = useMemo(() => {
    const parsedLines = parseTerminalContent(content);

    let cursorY = HEADER_H + PAD_TOP;
    let contentIndex = 0;
    let maxCols = Math.max(
      PROMPT_PREFIX.length + COMMAND_TEXT.length,
      ...LOADING_MESSAGES.map((m) => m.length),
    );

    const laidOut: LineLayout[] = [];
    for (const parsed of parsedLines) {
      if (parsed.kind === 'blank') {
        cursorY += BLANK_H;
        continue;
      }
      maxCols = Math.max(maxCols, parsed.text.length);
      const baseline = cursorY + FONT_SIZE * 0.8;
      const isCommandOrLoading = parsed.kind === 'command' || parsed.kind === 'muted';
      laidOut.push({
        parsed,
        baseline,
        contentIndex: isCommandOrLoading ? undefined : contentIndex++,
        isLast: false,
      });
      cursorY += LINE_H;
    }
    if (laidOut.length > 0) laidOut[laidOut.length - 1].isLast = true;

    const contentHeight = cursorY + PAD_BOTTOM;
    const naturalWidth = PAD_X * 2 + maxCols * CHAR_W;
    const boxWidth = Math.max(naturalWidth, Math.round(contentHeight * MIN_ASPECT));

    return {
      lines: laidOut,
      width: boxWidth,
      height: contentHeight,
      // Centers the text block when MIN_ASPECT widened the window beyond
      // what the content itself needs — the traffic lights stay pinned to
      // the true left edge (DOT_START_X) regardless, since that's fixed
      // window chrome, not part of the text block being centered.
      textX: PAD_X + (boxWidth - naturalWidth) / 2,
    };
  }, [content]);

  const showStartCursor = playback.phase === 'prompt' || playback.phase === 'typing';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Hiring Evaluation terminal report: candidate review for Arijit Das, status proposed, risk low, final decision accept"
    >
      <rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={RADIUS}
        ry={RADIUS}
        fill="#111318"
        stroke="#2d2d30"
        strokeWidth={1}
      />

      {/* Title bar: a real application window, not just chrome floating
          over the content — a hairline separates it from the report body,
          same border color as the window's own edge. */}
      <line x1={0.5} y1={HEADER_H} x2={width - 0.5} y2={HEADER_H} stroke="#2d2d30" strokeWidth={1} />

      {DOT_COLORS.map((color, i) => (
        <circle key={color} cx={DOT_START_X + i * DOT_GAP} cy={HEADER_H / 2} r={DOT_R} fill={color} />
      ))}

      <text
        x={width / 2}
        y={HEADER_H / 2 + TITLE_FONT_SIZE * 0.35}
        textAnchor="middle"
        fontFamily="'Roboto Mono', ui-monospace, SFMono-Regular, monospace"
        fontSize={TITLE_FONT_SIZE}
        fontWeight={500}
        fill={TITLE_COLOR}
      >
        {TITLE_TEXT}
      </text>

      {lines.map(({ parsed, baseline, contentIndex, isLast }, i) => {
        const textProps = {
          x: textX,
          y: baseline,
          fontFamily: "'Roboto Mono', ui-monospace, SFMono-Regular, monospace",
          fontSize: FONT_SIZE,
          xmlSpace: 'preserve' as const,
        };

        // The command line renders the real shell prompt plus whatever of
        // COMMAND_TEXT has been "typed" so far, instead of the raw file
        // content's plain "$ review candidate" — a typewriter caret trails
        // the typed text while the prompt/typing phases are active.
        if (parsed.kind === 'command') {
          return (
            <text key={i} {...textProps}>
              <tspan fill="#569cd6">{PROMPT_PREFIX}</tspan>
              <tspan fill="#ffffff">{playback.typedCommand}</tspan>
              {showStartCursor && (
                <tspan className="typing-reveal-cursor" fill={CURSOR_COLOR}>
                  {CURSOR_GLYPH}
                </tspan>
              )}
            </text>
          );
        }

        // The loading/status row cycles through a few fake engine steps
        // before settling on the literal "Loading profile..." — hidden
        // entirely until the command has finished "typing".
        if (parsed.kind === 'muted') {
          if (playback.phase === 'prompt' || playback.phase === 'typing') return null;
          const text = playback.phase === 'loading' ? playback.loadingText : parsed.text;
          return (
            <text key={i} {...textProps}>
              <tspan fill="#8b949e">{text}</tspan>
            </text>
          );
        }

        // Every other line is the report itself, printed in order once the
        // command + loading flourish above have finished.
        if ((contentIndex ?? 0) >= playback.revealedContentLines) return null;

        return (
          <text key={i} {...textProps}>
            {parsed.kind === 'field' ? (
              <>
                <tspan fill="#569cd6">{parsed.label}</tspan>
                <tspan fill="#6e7681">{parsed.dots}</tspan>
                <tspan fill="#ffffff"> {parsed.value}</tspan>
              </>
            ) : (
              <tspan fill={TEXT_COLOR[parsed.kind]}>{parsed.text}</tspan>
            )}
            {isLast && playback.phase === 'done' && (
              <tspan className="typing-reveal-cursor" fill={CURSOR_COLOR}>
                {' '}
                {CURSOR_GLYPH}
              </tspan>
            )}
          </text>
        );
      })}
    </svg>
  );
}
