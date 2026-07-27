import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { codeToHtml } from 'shiki';
import { motion } from 'motion/react';
import { useFileRevealSequence } from './useFileRevealSequence';
import { groupLinesForReveal, splitHighlightedHtmlByLine } from '../lib/shikiLineReveal';

const MAX_STAGGER_UNITS = 60;

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
   * editing), or an array of staggered motion.span line-groups while
   * revealing. */
  highlightNode: string | ReactNode;
  containerRef: ReturnType<typeof useFileRevealSequence>['containerRef'];
  isComplete: boolean;
}

/**
 * Shared by every Shiki HTML consumer (ShikiEditor, ManifestYamlBlock,
 * WorkHistoryYamlBlock) that wants a per-line reveal instead of dumping one
 * flat highlighted blob. Tokenizes the whole file in one codeToHtml() call
 * (correct for multi-line syntax) and only staggers the *display* of the
 * already-correct per-line output.
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
  const unitCount = Math.min(sourceLines.length, MAX_STAGGER_UNITS);

  const sequence = useFileRevealSequence({ fileId, unitCount, enabled });

  const lineGroups = useMemo(() => {
    const lines = splitHighlightedHtmlByLine(highlighted, sourceLines);
    return groupLinesForReveal(lines, MAX_STAGGER_UNITS);
  }, [highlighted, sourceLines]);

  const highlightNode = useMemo<string | ReactNode>(() => {
    if (!highlighted) return '';

    if (sequence.isComplete) {
      return lineGroups.map((group) => group.join('\n')).join('\n');
    }

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
  }, [highlighted, lineGroups, sequence]);

  return { highlightNode, containerRef: sequence.containerRef, isComplete: sequence.isComplete };
}
