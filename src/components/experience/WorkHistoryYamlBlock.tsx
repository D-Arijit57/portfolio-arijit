import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { codeToHtml } from 'shiki';
import { useStore } from '../../store/useStore';
import type { FileRevealSequenceResult } from '../../hooks/useFileRevealSequence';
import { parseLineToCharTokens, type CharToken } from '../../lib/shikiLineReveal';

// Markdown typography & animation redesign: work_history.yaml is a
// programming/data file, not documentation — it types in character-by-
// character like every other source file now, instead of fading in whole
// rows. Each row still enters at its own row-level moment (sequence's
// existing per-line stagger, unchanged — the "row sliding up" already read
// well), and its own characters type out in a small fixed step starting
// from that same moment, decoupled from the shared sequence's own
// even-spacing formula (a work_history.yaml row is short enough that a
// flat local step reads as calm, deliberate typing without needing the
// full jitter/grouping machinery useShikiRevealHighlight uses for whole
// files).
const LOCAL_CHAR_STEP_S = 0.02;

interface RenderedLine {
  html: string;
  /** Leading 2-space indent depth (0 = top level). */
  indentUnits: number;
  /**
   * Indent depth used only to decide how many guide lines to draw. Equal to
   * `indentUnits` for real content; for a blank separator line (no leading
   * whitespace of its own to measure) this borrows the next non-blank
   * line's depth instead, so guides run continuously through it rather than
   * gapping — matching how VS Code's own indent guides treat blank lines
   * inside a still-open block.
   */
  guideIndentUnits: number;
  /** Whether the (trimmed) line starts with a YAML list-item dash. */
  isListItem: boolean;
}

function computeIndentUnits(line: string): number {
  const leading = /^ */.exec(line)?.[0].length ?? 0;
  return Math.floor(leading / 2);
}

/** Blank lines borrow the next non-blank line's depth (falling back to the previous one at EOF) so indent guides don't gap at a separator row. */
function computeGuideIndentUnits(rawLines: string[], indentUnits: number[]): number[] {
  const result = [...indentUnits];
  for (let i = 0; i < rawLines.length; i++) {
    if (rawLines[i].trim().length > 0) continue;
    const next = rawLines.slice(i + 1).findIndex((l) => l.trim().length > 0);
    if (next !== -1) {
      result[i] = indentUnits[i + 1 + next];
    } else {
      const prev = [...rawLines].slice(0, i).reverse().findIndex((l) => l.trim().length > 0);
      result[i] = prev !== -1 ? indentUnits[i - 1 - prev] : 0;
    }
  }
  return result;
}

/**
 * Line-aware, indent-guide-drawing YAML block for work_history.yaml's left
 * pane. Split out from the plain "dump Shiki's HTML in one div" approach
 * (which the manifest.yaml/architecture.mmd viewers can get away with,
 * since their lines are short) because work_history.yaml's `highlights`
 * entries are long enough to wrap — this renders each source line as its
 * own row so it can (a) draw the indent guide lines VS Code shows for
 * nested YAML, and (b) apply a CSS hanging indent per row so a wrapped
 * highlight's continuation lines align just past its "- " marker instead
 * of falling back to the container's left edge.
 *
 * Sprint: Workspace-Wide File Opening Animation System — `sequence` (one
 * unit per source line, matching this component's one-row-per-line
 * rendering exactly rather than grouping rows the way
 * useShikiRevealHighlight does for editable files) staggers each row in; a
 * trailing cursor row appears once complete.
 *
 * Its caller is now the pipeline's "view source" toggle
 * (PipelineVisualization.tsx), which passes a *disabled* sequence: the
 * source is a reference the reader opens deliberately, so it renders at its
 * final state instantly rather than typing itself out again on every
 * toggle.
 */
export function WorkHistoryYamlBlock({
  code,
  lang,
  sequence,
}: {
  code: string;
  lang: string;
  sequence: FileRevealSequenceResult;
}) {
  const editorTheme = useStore((state) => state.editorTheme);
  const [lines, setLines] = useState<RenderedLine[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const rawLines = code.split('\n');
    const indentUnits = rawLines.map(computeIndentUnits);
    const guideIndentUnits = computeGuideIndentUnits(rawLines, indentUnits);

    const fallback = () =>
      rawLines.map((line, i) => ({
        html: line,
        indentUnits: indentUnits[i],
        guideIndentUnits: guideIndentUnits[i],
        isListItem: /^\s*-\s/.test(line),
      }));

    codeToHtml(code, { lang: lang as any, theme: editorTheme })
      .then((fullHtml) => {
        if (cancelled) return;
        const match = fullHtml.match(/<code>([\s\S]*?)<\/code>/);
        if (!match) {
          setLines(fallback());
          return;
        }
        // Shiki puts exactly one `<span class="line">...</span>` per source
        // line, newline-separated in the raw output — splitting on '\n' is
        // what safely isolates each line's full wrapper (a naive non-greedy
        // regex across the whole block would stop at the first inner
        // token's `</span>` instead of the line's own).
        const htmlLines = match[1].split('\n');
        setLines(
          rawLines.map((line, i) => ({
            html: htmlLines[i] ?? line,
            indentUnits: indentUnits[i],
            guideIndentUnits: guideIndentUnits[i],
            isListItem: /^\s*-\s/.test(line),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setLines(fallback());
      });

    return () => {
      cancelled = true;
    };
  }, [code, lang, editorTheme]);

  const lineTokens = useMemo<CharToken[][]>(
    () => (lines ? lines.map((line) => parseLineToCharTokens(line.html)) : []),
    [lines],
  );

  if (!lines) return null;

  const lastLineIndex = lines.length - 1;

  return (
    <div ref={sequence.containerRef as React.RefObject<HTMLDivElement>} className="font-mono text-[14px] leading-[1.7]">
      {lines.map((line, i) => {
        // VS Code doesn't draw a guide for the column-0 boundary, only
        // between nested scopes — a depth-N line gets N-1 guides.
        const guideCount = Math.max(0, line.guideIndentUnits - 1);
        // Hanging indent: wrapped continuation aligns past the line's own
        // indent, and past its "- " marker when it's a list item — not at
        // column 0. padding-left + text-indent cancel out for the first
        // (unwrapped) row, since the source's real leading spaces are
        // already part of `line.html` itself; only wrapped rows are
        // actually shifted by padding-left.
        const hangCh = line.indentUnits * 2 + (line.isListItem ? 2 : 0);
        const tokens = lineTokens[i] ?? [];
        const rowDelay = sequence.getUnitDelaySeconds(i);
        // A blank last line has no character to carry the "fully revealed"
        // signal (see the per-character onAnimationComplete below) — the
        // row's own fade-in is the only animation that ever completes for
        // it, so it has to own the signal in that one case.
        const isLastLineBlank = i === lastLineIndex && tokens.length === 0;

        return (
          <motion.div
            key={i}
            className="relative"
            initial="hidden"
            animate="visible"
            custom={i}
            variants={sequence.unitVariants}
            transition={sequence.isComplete ? { duration: 0 } : undefined}
            onAnimationComplete={isLastLineBlank ? sequence.onLastUnitComplete : undefined}
          >
            {Array.from({ length: guideCount }, (_, g) => (
              <span
                key={g}
                aria-hidden="true"
                className="absolute bottom-0 top-0 w-px bg-[#333333]"
                style={{ left: `${(g + 1) * 2}ch` }}
              />
            ))}
            {sequence.isComplete ? (
              <div
                style={{ paddingLeft: `${hangCh}ch`, textIndent: `-${hangCh}ch` }}
                className="whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: line.html || '&nbsp;' }}
              />
            ) : (
              <div
                style={{ paddingLeft: `${hangCh}ch`, textIndent: `-${hangCh}ch` }}
                className="whitespace-pre-wrap break-words"
              >
                {tokens.length === 0
                  ? ' '
                  : tokens.map((token, ci) => {
                      const isLastChar = i === lastLineIndex && ci === tokens.length - 1;
                      return (
                        <motion.span
                          key={ci}
                          style={{ color: token.color }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.15, delay: rowDelay + ci * LOCAL_CHAR_STEP_S, ease: 'easeOut' }}
                          onAnimationComplete={isLastChar ? sequence.onLastUnitComplete : undefined}
                        >
                          {token.char}
                        </motion.span>
                      );
                    })}
              </div>
            )}
          </motion.div>
        );
      })}
      {sequence.showCursor && (
        <span className="typing-reveal-cursor inline-block w-[7px] h-[15px] bg-[#cccccc] align-text-bottom" />
      )}
    </div>
  );
}
