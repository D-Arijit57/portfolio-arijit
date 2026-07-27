import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';
import Editor from 'react-simple-code-editor';
import { useShikiRevealHighlight } from '../../hooks/useShikiRevealHighlight';

function resolveShikiLang(fileType: string): string {
  if (fileType === 'typescript') return 'ts';
  if (fileType === 'shell') return 'bash';
  if (fileType === 'markdown') return 'md';
  return fileType;
}

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
  const [isFocused, setIsFocused] = useState(false);

  const { highlightNode, containerRef, isComplete } = useShikiRevealHighlight({
    fileId,
    code: content,
    lang: file ? resolveShikiLang(file.type) : 'text',
    theme: editorTheme,
    enabled: Boolean(file),
  });

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

  // The decorative resting cursor only makes sense once revealed and while
  // the user isn't actually editing — a real browser caret takes over the
  // instant the textarea is focused, and showing both at once would read as
  // a bug. Only assembled in that resting state; every other render (mid-
  // reveal, or focused/editing) keeps passing highlightNode straight
  // through, so steady-state typing cost is unchanged from before this
  // sprint.
  const highlightWithCursor =
    isComplete && !isFocused
      ? [
          typeof highlightNode === 'string' ? (
            <span key="code" dangerouslySetInnerHTML={{ __html: highlightNode }} />
          ) : (
            highlightNode
          ),
          <span
            key="cursor"
            className="typing-reveal-cursor inline-block w-[7px] h-[15px] bg-[#cccccc] align-text-bottom"
          />,
        ]
      : highlightNode;

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>} className="h-full w-full bg-[#1e1e1e] overflow-y-auto font-mono text-[14px]">
      <Editor
        value={content}
        onValueChange={(value) => setDraftContent(fileId, value)}
        highlight={() => highlightWithCursor}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        padding={16}
        style={{
          fontFamily: "var(--font-mono)",
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
