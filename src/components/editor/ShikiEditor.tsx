import React, { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';
import Editor from 'react-simple-code-editor';

export function ShikiEditor({ fileId }: { fileId: string }) {
  const file = getFileById(fileId);
  const draft = useStore((state) => state.draftContent[fileId]);
  const savingState = useStore((state) => state.savingState[fileId]);
  const setDraftContent = useStore((state) => state.setDraftContent);
  const saveFile = useStore((state) => state.saveFile);
  const editorTheme = useStore((state) => state.editorTheme);

  // draftContent is the single source of truth for in-progress edits; when
  // no draft exists for this fileId, the editor falls back to the last
  // confirmed backend content (workspaceFiles, via getFileById).
  const content = draft !== undefined ? draft : file?.content ?? '';
  const [highlighted, setHighlighted] = useState<string>('');

  useEffect(() => {
    if (!file) return;

    let lang: string = file.type;
    if (lang === 'typescript') lang = 'ts';
    if (lang === 'shell') lang = 'bash';
    if (lang === 'markdown') lang = 'md';

    codeToHtml(content, {
      lang: lang as any,
      theme: editorTheme
    }).then((fullHtml) => {
      const match = fullHtml.match(/<code>([\s\S]*?)<\/code>/);
      if (match && match[1]) {
        setHighlighted(match[1]);
      } else {
        setHighlighted(content);
      }
    }).catch(() => {
      setHighlighted(content);
    });
  }, [content, file, editorTheme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFile(fileId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileId, saveFile]);

  if (!file) return null;

  return (
    <div className="h-full w-full bg-[#1e1e1e] overflow-y-auto font-mono text-[14px]">
      <Editor
        value={content}
        onValueChange={(value) => setDraftContent(fileId, value)}
        highlight={() => highlighted}
        padding={16}
        style={{
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          minHeight: '100%',
          backgroundColor: '#1e1e1e'
        }}
        textareaClassName="focus:outline-none"
      />
      {savingState === 'error' && (
        <div className="px-4 py-1 text-[12px] text-[#f48771] bg-[#5a1d1d]">
          Save failed. Your edits are preserved — press Cmd/Ctrl+S to retry.
        </div>
      )}
    </div>
  );
}
