import React, { createContext, useContext, type RefObject } from 'react';
import { motion } from 'motion/react';
import type { Components } from 'react-markdown';
import type { FileRevealSequenceResult } from '../../../hooks/useFileRevealSequence';
import { widgetForLanguage } from '../../documentation/documentationWidgets';
import { CodeBlock } from '../../markdown/CodeBlock';
import { InlineCode } from '../../markdown/InlineCode';
import { PROSE_CLASSNAMES } from '../../markdown/proseClassNames';
import { getFenceCodeClassName, fenceLanguageFromClassName, isFencedLanguageClassName } from '../../markdown/fenceLanguage';

/** Set by every top-level reveal block before rendering its children, so a
 * paragraph inside a blockquote (etc.) renders bare instead of claiming its
 * own index/stagger — the spec treats "blockquote" as one unit, not
 * blockquote+paragraph as two. */
export const RevealNestingContext = createContext(false);

type BlockTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'ul' | 'ol' | 'blockquote' | 'hr';

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
  hr: motion.hr,
};

/**
 * Builds a react-markdown Components map that reveals top-level blocks
 * (headings, paragraphs, lists, blockquotes, rules, tables, fences) one at a
 * time via useFileRevealSequence, instead of MarkdownFileView's old blanket
 * clip-path wipe.
 *
 * Portfolio Polish Sprint: every block now also carries its styling —
 * PROSE_CLASSNAMES (src/components/markdown/proseClassNames.ts), the same
 * shared classNames the Project Documentation Viewer's
 * documentationComponents.tsx uses — directly on the substituted tag, so
 * MarkdownFileView's typography matches every other markdown surface
 * exactly rather than relying on a parent container's own CSS selectors.
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
    const className = PROSE_CLASSNAMES[tag];

    return function RevealBlockComponent({ children }: { children?: React.ReactNode }) {
      const insideBlock = useContext(RevealNestingContext);
      if (insideBlock) {
        return <Plain className={className}>{children}</Plain>;
      }

      const i = index++;
      const sequence = sequenceRef.current;

      if (sequence.isComplete) {
        return (
          <RevealNestingContext.Provider value={true}>
            <Plain className={className}>{children}</Plain>
          </RevealNestingContext.Provider>
        );
      }

      return (
        <RevealNestingContext.Provider value={true}>
          <Tag
            className={className}
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

  function RevealTable({ children }: { children?: React.ReactNode }) {
    const insideBlock = useContext(RevealNestingContext);
    const renderTable = () => (
      <div className={PROSE_CLASSNAMES.tableWrapper}>
        <table className={PROSE_CLASSNAMES.table}>{children}</table>
      </div>
    );

    if (insideBlock) {
      return renderTable();
    }

    const i = index++;
    const sequence = sequenceRef.current;

    if (sequence.isComplete) {
      return <RevealNestingContext.Provider value={true}>{renderTable()}</RevealNestingContext.Provider>;
    }

    return (
      <RevealNestingContext.Provider value={true}>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={i}
          variants={sequence.unitVariants}
          onAnimationComplete={sequence.isLastUnit(i) ? sequence.onLastUnitComplete : undefined}
        >
          {renderTable()}
        </motion.div>
      </RevealNestingContext.Provider>
    );
  }

  function RevealPre({ node, children }: { node?: unknown; children?: React.ReactNode }) {
    const insideBlock = useContext(RevealNestingContext);
    // Node-based (not children-based) so this stays correct regardless of
    // what the `code` component override below renders its children as —
    // mirrors documentationComponents.tsx's own `pre` override.
    const classNameStr = getFenceCodeClassName(node);
    const isWidget = Boolean(widgetForLanguage(classNameStr));
    const language = fenceLanguageFromClassName(classNameStr);

    const renderFence = () => (isWidget ? <>{children}</> : <CodeBlock language={language}>{children}</CodeBlock>);

    if (insideBlock) {
      return renderFence();
    }

    const i = index++;
    const sequence = sequenceRef.current;

    // Widgets (IdentityTerminals, RecentActivityLog's commit timeline,
    // ContributionsTerminal, etc.) can run their own long, independently
    // -timed animations — viewport triggers, multi-second sequences —
    // wholly unrelated to this *file's* own (much shorter) block-open
    // stagger. Collapsing the wrapper to a bare fragment once the file's
    // sequence completes is safe for a plain heading/paragraph, whose own
    // reveal is driven by this same sequence and is therefore already
    // finished by then, but for a widget still mid-animation it swaps the
    // wrapper's element type — motion.div to Fragment — which unmounts
    // and remounts the widget's whole subtree, killing any in-flight
    // animation and losing all its state. Widgets always keep the same
    // motion.div wrapper element, so React only ever updates it, never
    // remounts what's inside.
    if (isWidget) {
      return (
        <RevealNestingContext.Provider value={true}>
          <motion.div
            initial={sequence.isComplete ? false : 'hidden'}
            animate="visible"
            custom={i}
            variants={sequence.unitVariants}
            onAnimationComplete={
              !sequence.isComplete && sequence.isLastUnit(i) ? sequence.onLastUnitComplete : undefined
            }
          >
            {renderFence()}
          </motion.div>
        </RevealNestingContext.Provider>
      );
    }

    if (sequence.isComplete) {
      return <RevealNestingContext.Provider value={true}>{renderFence()}</RevealNestingContext.Provider>;
    }

    return (
      <RevealNestingContext.Provider value={true}>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={i}
          variants={sequence.unitVariants}
          onAnimationComplete={sequence.isLastUnit(i) ? sequence.onLastUnitComplete : undefined}
        >
          {renderFence()}
        </motion.div>
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
    hr: revealBlock('hr'),
    table: RevealTable,
    pre: RevealPre,
    // Every element below sits inside an already-revealed top-level block
    // (a list item, a table cell, a sentence) — none of them claim their own
    // reveal index, the same tier `code` already occupied before this
    // sprint; they only add the shared prose styling.
    li({ children }) {
      return <li className={PROSE_CLASSNAMES.li}>{children}</li>;
    },
    a({ href, children }) {
      return (
        <a href={href} className={PROSE_CLASSNAMES.a} target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    },
    strong({ children }) {
      return <strong className={PROSE_CLASSNAMES.strong}>{children}</strong>;
    },
    em({ children }) {
      return <em className={PROSE_CLASSNAMES.em}>{children}</em>;
    },
    img({ src, alt }) {
      return <img src={src} alt={alt} className={PROSE_CLASSNAMES.img} />;
    },
    thead({ children }) {
      return <thead className={PROSE_CLASSNAMES.thead}>{children}</thead>;
    },
    tbody({ children }) {
      return <tbody className={PROSE_CLASSNAMES.tbody}>{children}</tbody>;
    },
    tr({ children }) {
      return <tr className={PROSE_CLASSNAMES.tr}>{children}</tr>;
    },
    th({ children }) {
      return <th className={PROSE_CLASSNAMES.th}>{children}</th>;
    },
    td({ children }) {
      return <td className={PROSE_CLASSNAMES.td}>{children}</td>;
    },
    code({ className, children }) {
      const Widget = widgetForLanguage(className);
      if (Widget) return <Widget />;
      // Fenced code (a `language-*` className) is fully handled by the
      // `pre` override above (CodeBlock) — stay a bare passthrough so its
      // content isn't double-wrapped in an inline-code pill.
      if (isFencedLanguageClassName(className)) return <>{children}</>;
      return <InlineCode>{children}</InlineCode>;
    },
  };
}
