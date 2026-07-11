import React, { useState, useEffect } from 'react';
import { codeToHtml } from 'shiki';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';
import Editor from 'react-simple-code-editor';

export function ShikiEditor({ fileId }: { fileId: string }) {
  const file = getFileById(fileId);
  const { setFileDirty } = useStore();
  const [content, setContent] = useState(file?.content || '');
  const [highlighted, setHighlighted] = useState<string>('');

  useEffect(() => {
    if (file && file.content !== content) {
      setContent(file.content);
    }
  }, [fileId]);

  useEffect(() => {
    if (!file) return;

    let lang: string = file.type;
    if (lang === 'typescript') lang = 'ts';
    if (lang === 'shell') lang = 'bash';
    if (lang === 'markdown') lang = 'md';

    // We only need the inner HTML of the <code> tag for react-simple-code-editor
    // Or we can just use codeToHtml and extract it
    codeToHtml(content, {
      lang: lang as any,
      theme: 'dark-plus'
    }).then((fullHtml) => {
      // Shiki outputs: <pre class="shiki ..."><code>...</code></pre>
      // We extract what's inside <code>...</code>
      const match = fullHtml.match(/<code>([\s\S]*?)<\/code>/);
      if (match && match[1]) {
        setHighlighted(match[1]);
      } else {
        setHighlighted(content);
      }
    }).catch(() => {
      setHighlighted(content);
    });
    
    setFileDirty(file.id, content !== file.content);
  }, [content, file]);

  if (!file) return null;

  return (
    <div className="h-full w-full bg-[#1e1e1e] overflow-y-auto font-mono text-[14px]">
      <Editor
        value={content}
        onValueChange={setContent}
        highlight={() => highlighted}
        padding={16}
        style={{
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          minHeight: '100%',
          backgroundColor: '#1e1e1e'
        }}
        textareaClassName="focus:outline-none"
      />
    </div>
  );
}
