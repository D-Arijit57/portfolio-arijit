import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

function reactNodeToText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return reactNodeToText(node.props.children);
  return '';
}

/**
 * VS-Code-styled fenced code block: a small header showing the detected
 * language and a copy button, above the actual code. Only reached for
 * fences that aren't a registered MARKDOWN_WIDGETS tag (documentationComponents.tsx
 * checks that first) — this is the "ordinary code sample" path.
 */
export function CodeBlock({ language, children }: { language: string | undefined; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(reactNodeToText(children)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="my-4 overflow-hidden rounded-md border border-[#3c3c3c] bg-[#1e1e1e]">
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
      <pre className="overflow-x-auto p-4">
        <code className="font-mono text-[13px] text-[#cccccc]">{children}</code>
      </pre>
    </div>
  );
}
