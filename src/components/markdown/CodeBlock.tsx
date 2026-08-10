import React, { useEffect, useMemo, useState } from 'react';
import { codeToHtml } from '../../lib/shikiHighlighter';
import { Check, Copy } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { reactNodeToText } from './reactNodeToText';

/**
 * VS-Code-styled fenced code block, shared by every markdown renderer
 * (MarkdownFileView's reveal-pre override and the Project Documentation
 * Viewer's documentationComponents.tsx) — a language badge + copy button
 * above real Shiki-highlighted code, matching the same editorTheme the rest
 * of the workspace's code editors use. Only reached for fences that aren't a
 * registered MARKDOWN_WIDGETS tag (checked upstream by each caller's own
 * `pre` override) — this is the "ordinary code sample" path. Falls back to
 * plain (unhighlighted) text if Shiki has no grammar for the fence's
 * language tag, rather than failing to render the code at all.
 */
export function CodeBlock({ language, children }: { language: string | undefined; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const editorTheme = useStore((state) => state.editorTheme);
  const rawCode = useMemo(() => reactNodeToText(children), [children]);

  useEffect(() => {
    let cancelled = false;
    codeToHtml(rawCode, { lang: (language ?? 'text') as any, theme: editorTheme })
      .then((html) => {
        if (!cancelled) setHighlightedHtml(html);
      })
      .catch(() => {
        if (!cancelled) setHighlightedHtml('');
      });
    return () => {
      cancelled = true;
    };
  }, [rawCode, language, editorTheme]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(rawCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="my-6 overflow-hidden rounded-md border border-[#3c3c3c] bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-[#3c3c3c] bg-[#252526] px-3 py-1.5">
        <span className="font-mono text-[11px] text-[#858585]">{language ?? 'text'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[#858585] transition-colors hover:bg-[#2d2d2d] hover:text-[#cccccc]"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {highlightedHtml ? (
        <div
          className="overflow-x-auto p-4 font-mono text-[13px] [&_pre]:!bg-transparent"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="overflow-x-auto p-4">
          <code className="font-mono text-[13px] text-[#cccccc]">{children}</code>
        </pre>
      )}
    </div>
  );
}
