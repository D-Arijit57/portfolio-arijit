import React, { createContext, useContext, type RefObject } from 'react';
import { motion } from 'motion/react';
import type { Components } from 'react-markdown';
import type { FileRevealSequenceResult } from '../../../hooks/useFileRevealSequence';
import { widgetAwareComponents, widgetForLanguage } from '../../documentation/documentationWidgets';

/** Set by every top-level reveal block before rendering its children, so a
 * paragraph inside a blockquote (etc.) renders bare instead of claiming its
 * own index/stagger — the spec treats "blockquote" as one unit, not
 * blockquote+paragraph as two. */
export const RevealNestingContext = createContext(false);

type BlockTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'ul' | 'ol' | 'blockquote';

const MOTION_TAG: Record<BlockTag, any> = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  p: motion.p,
  ul: motion.ul,
  ol: motion.ol,
  blockquote: motion.blockquote,
};

/**
 * Builds a react-markdown Components map that reveals top-level blocks
 * (headings, paragraphs, lists, blockquotes, fences) one at a time via
 * useFileRevealSequence, instead of MarkdownFileView's old blanket
 * clip-path wipe.
 *
 * Every override is a real substitution of the block's own tag
 * (motion.h1 still renders a literal <h1>, motion.pre a literal <pre>) —
 * never an added wrapper div — so MarkdownFileView's existing
 * `[&>h1]`/`[&>p]`/`[&>pre]`/etc. direct-child Tailwind selectors keep
 * matching exactly as before.
 *
 * `sequenceRef` (not `sequence` directly) is what lets these block
 * components stay referentially stable across re-renders — the caller
 * memoizes this map's construction per file, and each block reads
 * `sequenceRef.current` fresh at its own render time, so a live
 * `isComplete` flip (natural finish or user-interrupt) is picked up
 * without rebuilding component identities and remounting the whole tree.
 * Once `isComplete` is true, a block renders its bare tag with no motion
 * wrapper at all — mirroring useShikiRevealHighlight's "collapse to plain
 * output once done" approach, and incidentally what makes an interrupt feel
 * instant (no in-flight transition to race).
 */
export function createRevealMarkdownComponents(sequenceRef: RefObject<FileRevealSequenceResult>): Components {
  let index = 0;

  function revealBlock(tag: BlockTag) {
    const Tag = MOTION_TAG[tag];
    const Plain = tag as any;

    return function RevealBlockComponent({ children }: { children?: React.ReactNode }) {
      const insideBlock = useContext(RevealNestingContext);
      if (insideBlock) {
        return <Plain>{children}</Plain>;
      }

      const i = index++;
      const sequence = sequenceRef.current;

      if (sequence.isComplete) {
        return (
          <RevealNestingContext.Provider value={true}>
            <Plain>{children}</Plain>
          </RevealNestingContext.Provider>
        );
      }

      return (
        <RevealNestingContext.Provider value={true}>
          <Tag
            initial="hidden"
            animate="visible"
            custom={i}
            variants={sequence.unitVariants}
            onAnimationComplete={sequence.isLastUnit(i) ? sequence.onLastUnitComplete : undefined}
          >
            {children}
          </Tag>
        </RevealNestingContext.Provider>
      );
    };
  }

  function isWidgetFence(children: React.ReactNode): boolean {
    const child = React.isValidElement<{ className?: string }>(children) ? children : null;
    return child ? Boolean(widgetForLanguage(child.props.className)) : false;
  }

  function RevealPre({ children }: { children?: React.ReactNode }) {
    const insideBlock = useContext(RevealNestingContext);
    // Mirrors widgetAwareComponents.pre's own widget-vs-plain-fence check —
    // duplicated rather than delegated to avoid calling that component as a
    // bare function outside JSX.
    const isWidget = isWidgetFence(children);

    if (insideBlock) {
      return isWidget ? <>{children}</> : <pre>{children}</pre>;
    }

    const i = index++;
    const sequence = sequenceRef.current;

    if (sequence.isComplete) {
      return (
        <RevealNestingContext.Provider value={true}>
          {isWidget ? <>{children}</> : <pre>{children}</pre>}
        </RevealNestingContext.Provider>
      );
    }

    const Wrapper = isWidget ? motion.div : motion.pre;
    return (
      <RevealNestingContext.Provider value={true}>
        <Wrapper
          initial="hidden"
          animate="visible"
          custom={i}
          variants={sequence.unitVariants}
          onAnimationComplete={sequence.isLastUnit(i) ? sequence.onLastUnitComplete : undefined}
        >
          {children}
        </Wrapper>
      </RevealNestingContext.Provider>
    );
  }

  return {
    h1: revealBlock('h1'),
    h2: revealBlock('h2'),
    h3: revealBlock('h3'),
    h4: revealBlock('h4'),
    h5: revealBlock('h5'),
    h6: revealBlock('h6'),
    p: revealBlock('p'),
    ul: revealBlock('ul'),
    ol: revealBlock('ol'),
    blockquote: revealBlock('blockquote'),
    pre: RevealPre,
    code: widgetAwareComponents.code,
  };
}
