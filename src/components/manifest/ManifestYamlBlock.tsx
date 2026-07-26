import React, { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { useStore } from '../../store/useStore';

/**
 * Read-only, line-numbered YAML block. Uses the same real Shiki highlighter
 * ShikiEditor.tsx uses for actual files — same extraction of the inner
 * `<code>` markup, same theme — just without its editable textarea: this
 * YAML is synthesized fresh from the parsed manifest model on every render
 * (manifest/yamlFormat.ts), not a file with its own draft/save lifecycle,
 * so there's nothing here to edit.
 */
export function ManifestYamlBlock({ code }: { code: string }) {
  const editorTheme = useStore((state) => state.editorTheme);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    codeToHtml(code, { lang: 'yaml', theme: editorTheme })
      .then((fullHtml) => {
        if (cancelled) return;
        const match = fullHtml.match(/<code>([\s\S]*?)<\/code>/);
        setHighlighted(match ? match[1] : null);
      })
      .catch(() => {
        if (!cancelled) setHighlighted(null);
      });

    return () => {
      cancelled = true;
    };
  }, [code, editorTheme]);

  const lineCount = code.split('\n').length;

  return (
    <div className="flex overflow-x-auto bg-[#1e1e1e] font-mono text-[13px] leading-[1.7]">
      <div aria-hidden="true" className="select-none px-3 py-3 text-right text-[#5a5a5a]">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      {highlighted ? (
        <div
          className="min-w-0 flex-1 py-3 pr-4 [&_code]:whitespace-pre [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0"
          dangerouslySetInnerHTML={{ __html: `<pre><code>${highlighted}</code></pre>` }}
        />
      ) : (
        <pre className="min-w-0 flex-1 whitespace-pre py-3 pr-4 text-[#cccccc]">{code}</pre>
      )}
    </div>
  );
}
