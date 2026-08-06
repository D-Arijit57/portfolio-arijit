import React from 'react';
import type { Components } from 'react-markdown';
import { tryExtractFeatureList } from '../../documentation/featureList';
import { tryExtractLinkCards } from '../../documentation/linkCards';
import { tryDetectCallout } from '../../documentation/callout';
import { collectText, type HastLikeNode } from '../../documentation/hastLike';
import { FeatureGrid } from './FeatureGrid';
import { LinkFileList } from './LinkFileList';
import { Callout } from './Callout';
import { TransitionGlyph } from './TransitionGlyph';
import { CodeBlock } from '../markdown/CodeBlock';
import { InlineCode } from '../markdown/InlineCode';
import { PROSE_CLASSNAMES } from '../markdown/proseClassNames';
import { getFenceCodeClassName, fenceLanguageFromClassName, isFencedLanguageClassName } from '../markdown/fenceLanguage';
import { widgetForLanguage } from './documentationWidgets';

/**
 * Shared react-markdown Components map for the Project Documentation
 * Viewer, used by every DocumentationSection's own render pass (and the
 * intro, if present). `ul`/`blockquote` are where the FeatureGrid/
 * LinkCardGrid/Callout detection lives — all three need every child of the
 * node in one call, which react-markdown naturally gives a per-tag override
 * (the `node` prop is the raw hast element; `children` is already the
 * recursively-rendered React tree for that node's descendants).
 *
 * A factory, not a static object, because LinkCardGrid needs to resolve
 * relative link-card targets (documentation/resolveLinkTarget.ts) against
 * the *current* document's own folder — `basePath` is closed over here
 * rather than threaded through every component's props individually.
 */
// Documentation Redesign: a subtle glyph (its own standalone paragraph, blank-
// line-separated in the source markdown) between two sections — e.g. Problem
// Statement's body ending in a bare "↓" before the next section begins.
// Recognizing a small fixed set rather than any single character keeps this
// intentional (a real "—" or "-" em-dash paragraph should never be swallowed).
const TRANSITION_GLYPHS = new Set(['→', '↓', '===>']);

export function createDocumentationComponents(basePath: string): Components {
  return {
    // h1/h2 are rare in section body markdown (the document's title comes
    // from DocumentationHero, and each section's own H2 is rendered by
    // DocumentationSection itself — see its doc comment) but kept here for
    // parity with every other markdown surface, same shared classNames.
    h1({ children }) {
      return <h1 className={PROSE_CLASSNAMES.h1}>{children}</h1>;
    },
    h2({ children }) {
      return <h2 className={PROSE_CLASSNAMES.h2}>{children}</h2>;
    },
    h3({ children }) {
      return <h3 className={PROSE_CLASSNAMES.h3}>{children}</h3>;
    },
    h4({ children }) {
      return <h4 className={PROSE_CLASSNAMES.h4}>{children}</h4>;
    },
    h5({ children }) {
      return <h5 className={PROSE_CLASSNAMES.h5}>{children}</h5>;
    },
    h6({ children }) {
      return <h6 className={PROSE_CLASSNAMES.h6}>{children}</h6>;
    },
    p({ node, children }) {
      const text = node ? collectText(node as unknown as HastLikeNode).trim() : '';
      if (TRANSITION_GLYPHS.has(text)) {
        return <TransitionGlyph glyph={text} />;
      }
      return <p className={PROSE_CLASSNAMES.p}>{children}</p>;
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
    hr() {
      return <hr className={PROSE_CLASSNAMES.hr} />;
    },
    img({ src, alt }) {
      return <img src={src} alt={alt} className={PROSE_CLASSNAMES.img} />;
    },
    ul({ node, children }) {
      const rawNode = node as unknown as HastLikeNode | undefined;

      const featureItems = rawNode ? tryExtractFeatureList(rawNode) : undefined;
      if (featureItems) return <FeatureGrid items={featureItems} />;

      const linkItems = rawNode ? tryExtractLinkCards(rawNode) : undefined;
      if (linkItems) return <LinkFileList items={linkItems} basePath={basePath} />;

      return <ul className={PROSE_CLASSNAMES.ul}>{children}</ul>;
    },
    ol({ children }) {
      return <ol className={PROSE_CLASSNAMES.ol}>{children}</ol>;
    },
    li({ children }) {
      return <li className={PROSE_CLASSNAMES.li}>{children}</li>;
    },
    blockquote({ node, children }) {
      const info = node ? tryDetectCallout(node as unknown as HastLikeNode) : undefined;
      if (info) return <Callout info={info}>{children}</Callout>;
      return <blockquote className={PROSE_CLASSNAMES.blockquote}>{children}</blockquote>;
    },
    table({ children }) {
      return (
        <div className={PROSE_CLASSNAMES.tableWrapper}>
          <table className={PROSE_CLASSNAMES.table}>{children}</table>
        </div>
      );
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
    pre({ node, children }) {
      const classNameStr = getFenceCodeClassName(node);

      if (widgetForLanguage(classNameStr)) {
        return <>{children}</>;
      }

      return <CodeBlock language={fenceLanguageFromClassName(classNameStr)}>{children}</CodeBlock>;
    },
    code({ className, children }) {
      const Widget = widgetForLanguage(className);
      if (Widget) return <Widget />;
      // react-markdown calls this for both inline code and the `<code>`
      // nested inside a fenced block's `<pre>` — stay a bare passthrough for
      // the latter and let the `pre` override above own the fence's whole
      // presentation (CodeBlock), rather than double-wrapping its content in
      // an inline-code pill.
      if (isFencedLanguageClassName(className)) return <>{children}</>;
      return <InlineCode>{children}</InlineCode>;
    },
  };
}
