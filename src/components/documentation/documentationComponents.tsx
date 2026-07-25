import React from 'react';
import type { Components } from 'react-markdown';
import { tryExtractFeatureList } from '../../documentation/featureList';
import { tryExtractLinkCards } from '../../documentation/linkCards';
import { tryDetectCallout } from '../../documentation/callout';
import type { HastLikeNode } from '../../documentation/hastLike';
import { FeatureGrid } from './FeatureGrid';
import { LinkCardGrid } from './LinkCardGrid';
import { Callout } from './Callout';
import { CodeBlock } from './CodeBlock';
import { widgetForLanguage } from './documentationWidgets';

function classNameToString(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.join(' ');
  if (typeof value === 'string') return value;
  return undefined;
}

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
export function createDocumentationComponents(basePath: string): Components {
  return {
    h3({ children }) {
      return <h3 className="mb-3 mt-6 text-[16px] font-semibold text-white">{children}</h3>;
    },
    h4({ children }) {
      return <h4 className="mb-2 mt-4 text-[14px] font-semibold text-white">{children}</h4>;
    },
    p({ children }) {
      return <p className="mb-4 leading-relaxed text-[#cccccc]">{children}</p>;
    },
    a({ href, children }) {
      return (
        <a href={href} className="text-[#007acc] hover:underline" target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    },
    strong({ children }) {
      return <strong className="text-white">{children}</strong>;
    },
    ul({ node, children }) {
      const rawNode = node as unknown as HastLikeNode | undefined;

      const featureItems = rawNode ? tryExtractFeatureList(rawNode) : undefined;
      if (featureItems) return <FeatureGrid items={featureItems} />;

      const linkItems = rawNode ? tryExtractLinkCards(rawNode) : undefined;
      if (linkItems) return <LinkCardGrid items={linkItems} basePath={basePath} />;

      return <ul className="mb-4 ml-6 list-disc space-y-2 text-[#cccccc]">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="mb-4 ml-6 list-decimal space-y-2 text-[#cccccc]">{children}</ol>;
    },
    li({ children }) {
      return <li className="pl-1 leading-relaxed">{children}</li>;
    },
    blockquote({ node, children }) {
      const info = node ? tryDetectCallout(node as unknown as HastLikeNode) : undefined;
      if (info) return <Callout info={info}>{children}</Callout>;
      return (
        <blockquote className="my-4 border-l-2 border-[#3c3c3c] bg-[#252526] px-4 py-2 text-[13px] italic text-[#9d9d9d] [&>p]:mb-0">
          {children}
        </blockquote>
      );
    },
    table({ children }) {
      return (
        <div className="my-4 overflow-x-auto rounded-md border border-[#3c3c3c]">
          <table className="w-full border-collapse text-[13px]">{children}</table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-[#252526]">{children}</thead>;
    },
    tbody({ children }) {
      return <tbody>{children}</tbody>;
    },
    tr({ children }) {
      return <tr className="border-b border-[#3c3c3c] last:border-0">{children}</tr>;
    },
    th({ children }) {
      return <th className="px-3 py-2 text-left font-semibold text-white">{children}</th>;
    },
    td({ children }) {
      return <td className="px-3 py-2 text-[#cccccc]">{children}</td>;
    },
    pre({ node, children }) {
      const codeNode = node?.children?.find(
        (child): child is typeof child & { tagName: 'code' } =>
          child.type === 'element' && (child as { tagName?: string }).tagName === 'code'
      );
      const classNameStr = classNameToString(
        (codeNode as { properties?: Record<string, unknown> } | undefined)?.properties?.className
      );

      if (widgetForLanguage(classNameStr)) {
        return <>{children}</>;
      }

      const language = /language-([\w-]+)/.exec(classNameStr ?? '')?.[1];
      return <CodeBlock language={language}>{children}</CodeBlock>;
    },
    code({ className, children }) {
      const Widget = widgetForLanguage(className);
      if (Widget) return <Widget />;
      return <>{children}</>;
    },
  };
}
