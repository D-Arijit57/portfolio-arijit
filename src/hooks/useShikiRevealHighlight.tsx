import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { codeToHtml } from 'shiki';
import { motion } from 'motion/react';
import { useFileRevealSequence } from './useFileRevealSequence';
import {
  groupLinesForReveal,
  splitHighlightedHtmlByLine,
  parseLineToCharTokens,
  characterRevealPlan,
  type CharToken,
} from '../lib/shikiLineReveal';

// Markdown typography & animation redesign: programming files now type in
// character-by-character rather than fading in whole line-groups — "someone
// calmly writing code," not a documentation block appearing. Every real file
// in this workspace (playground.py, contact.sh, the skills/*.yaml files,
// americanchase.yaml) is comfortably under a few hundred characters, so full
// per-character fidelity costs nothing in practice; MAX_INDIVIDUAL_CHARS is
// a generous but real ceiling — a hypothetical future huge generated file
// gracefully falls back to the old whole-line-group fade (still bounded by
// MAX_STAGGER_UNITS) rather than mounting thousands of animated nodes.
const MAX_STAGGER_UNITS = 60;
const MAX_INDIVIDUAL_CHARS = 1000;

// Subtle per-character timing jitter layered on top of the shared engine's
// even spacing — "avoid robotic constant-speed typing." Computed once per
// highlighted result (useMemo), not per render, so it never destabilizes an
// in-flight animation.
const CHAR_JITTER_RANGE_MS: [number, number] = [-15, 15];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

interface UseShikiRevealHighlightOptions {
  fileId: string;
  code: string;
  lang: string;
  theme: string;
  enabled?: boolean;
}

interface UseShikiRevealHighlightResult {
  /** Hand directly to react-simple-code-editor's `highlight={() => ...}` —
   * a plain string once revealed (identical cost to today's steady-state
   * editing), or per-character motion.span nodes while typing. */
  highlightNode: string | ReactNode;
  containerRef: ReturnType<typeof useFileRevealSequence>['containerRef'];
  isComplete: boolean;
}

/**
 * Drives ShikiEditor's (and WorkHistoryYamlBlock's) type-and-reveal
 * animation: each character fades into visibility in document order, at a
 * calm, slightly-jittered pace, syntax-colored exactly as Shiki tokenized
 * it. Tokenization still happens exactly once, over the full file, via
 * codeToHtml() — only the *display* is split into per-character pieces,
 * post-hoc on already-correct output.
 */
export function useShikiRevealHighlight({
  fileId,
  code,
  lang,
  theme,
  enabled = true,
}: UseShikiRevealHighlightOptions): UseShikiRevealHighlightResult {
  const [highlighted, setHighlighted] = useState('');

  useEffect(() => {
    let cancelled = false;
    codeToHtml(code, { lang: lang as any, theme })
      .then((fullHtml) => {
        if (!cancelled) setHighlighted(fullHtml);
      })
      .catch(() => {
        if (!cancelled) setHighlighted('');
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang, theme]);

  const sourceLines = useMemo(() => code.split('\n'), [code]);

  const highlightedLines = useMemo(
    () => splitHighlightedHtmlByLine(highlighted, sourceLines),
    [highlighted, sourceLines],
  );

  // Per-character tokens, one array per source line — only computed once
  // Shiki's real output has arrived (parsing empty/placeholder HTML would
  // just waste work re-parsing on the next render anyway).
  const lineTokens = useMemo<CharToken[][]>(() => {
    if (!highlighted) return [];
    return highlightedLines.map((lineHtml) => parseLineToCharTokens(lineHtml));
  }, [highlighted, highlightedLines]);

  const totalChars = useMemo(
    () => lineTokens.reduce((sum, line) => sum + Math.max(line.length, 1), 0),
    [lineTokens],
  );

  const useCharacterReveal = highlighted !== '' && totalChars <= MAX_INDIVIDUAL_CHARS;

  const { unitCount: charUnitCount, groupSize: charGroupSize } = useMemo(
    () => characterRevealPlan(lineTokens, MAX_INDIVIDUAL_CHARS),
    [lineTokens],
  );

  // Stable per-character jitter — see CHAR_JITTER_RANGE_MS above.
  const jitterByIndex = useMemo(
    () => Array.from({ length: totalChars }, () => randomBetween(CHAR_JITTER_RANGE_MS[0], CHAR_JITTER_RANGE_MS[1])),
    [totalChars],
  );

  // Fallback path (huge file, or highlighting not resolved yet): the
  // original whole-line-group fade, capped the same way it always was.
  const lineGroups = useMemo(
    () => groupLinesForReveal(highlightedLines, MAX_STAGGER_UNITS),
    [highlightedLines],
  );

  const unitCount = useCharacterReveal ? charUnitCount : Math.min(sourceLines.length, MAX_STAGGER_UNITS);

  const sequence = useFileRevealSequence({ fileId, unitCount, enabled });

  const highlightNode = useMemo<string | ReactNode>(() => {
    if (!highlighted) return '';

    if (sequence.isComplete) return highlighted;

    if (!useCharacterReveal) {
      const lastIndex = lineGroups.length - 1;
      return lineGroups.map((group, index) => (
        <motion.span
          key={index}
          className="block"
          initial="hidden"
          animate="visible"
          custom={index}
          variants={sequence.unitVariants}
          onAnimationComplete={index === lastIndex ? sequence.onLastUnitComplete : undefined}
          dangerouslySetInnerHTML={{ __html: group.join('\n') }}
        />
      ));
    }

    let globalIndex = 0;
    return lineTokens.map((tokens, lineIndex) => {
      if (tokens.length === 0) {
        // A blank source line still occupies its own moment in the reveal
        // timeline (see characterRevealPlan's Math.max(line.length, 1)), and
        // — critically — still needs to be a real motion element: if the
        // *file's own last line* happens to be blank (a trailing newline is
        // common in generated content), this is the only place
        // onLastUnitComplete can ever fire from, so it can't be a plain,
        // non-animated <div>.
        const charIndex = globalIndex++;
        const unitIndex = Math.min(charUnitCount - 1, Math.floor(charIndex / charGroupSize));
        const isLastChar = charIndex === totalChars - 1;
        return (
          <motion.div
            key={lineIndex}
            style={{ whiteSpace: 'pre' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={sequence.getUnitTransition(unitIndex)}
            onAnimationComplete={isLastChar ? sequence.onLastUnitComplete : undefined}
          >
            {' '}
          </motion.div>
        );
      }

      return (
        <div key={lineIndex} style={{ whiteSpace: 'pre' }}>
          {tokens.map((token, tokenIndex) => {
            const charIndex = globalIndex++;
            const unitIndex = Math.min(charUnitCount - 1, Math.floor(charIndex / charGroupSize));
            const base = sequence.getUnitTransition(unitIndex);
            const jitterS = (jitterByIndex[charIndex] ?? 0) / 1000;
            const isLastChar = charIndex === totalChars - 1;
            return (
              <motion.span
                key={tokenIndex}
                style={{ color: token.color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...base, delay: Math.max(0, base.delay + jitterS) }}
                onAnimationComplete={isLastChar ? sequence.onLastUnitComplete : undefined}
              >
                {token.char}
              </motion.span>
            );
          })}
        </div>
      );
    });
  }, [
    highlighted,
    sequence,
    useCharacterReveal,
    lineGroups,
    lineTokens,
    charUnitCount,
    charGroupSize,
    jitterByIndex,
    totalChars,
  ]);

  return { highlightNode, containerRef: sequence.containerRef, isComplete: sequence.isComplete };
}
