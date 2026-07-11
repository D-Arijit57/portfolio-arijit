import React from 'react';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';
import Markdown from 'react-markdown';
import { WorkHistoryViewer } from './WorkHistoryViewer';
import { MermaidViewer } from './MermaidViewer';
import { ShikiEditor } from './ShikiEditor';

export function EditorRenderer({ pane }: { pane: 'left' | 'right' }) {
  const { activeFileId, openedTabs } = useStore();
  
  const activeTabInPane = openedTabs.find(t => t.fileId === activeFileId && t.pane === pane) 
    || openedTabs.filter(t => t.pane === pane).pop();

  if (!activeTabInPane) return null;

  const file = getFileById(activeTabInPane.fileId);
  if (!file) return null;

  if (file.type === 'markdown') {
    return (
      <div className="h-full overflow-y-auto bg-[#1e1e1e] p-8 text-[#cccccc]">
        <div className="max-w-3xl font-sans [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:border-b [&>h1]:border-[#3c3c3c] [&>h1]:pb-2 [&>h1]:text-white [&>h1]:mb-4 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:text-white [&>h2]:mb-4 [&>h2]:mt-8 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-4 [&>ul>li]:mb-2 [&>pre]:bg-[#1e1e1e] [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:border [&>pre]:border-[#333333] [&>pre]:my-4 [&>pre>code]:font-mono [&>pre>code]:text-[13px] [&_code:not(pre>code)]:bg-[#333333] [&_code:not(pre>code)]:px-1.5 [&_code:not(pre>code)]:py-0.5 [&_code:not(pre>code)]:rounded [&_code:not(pre>code)]:text-white [&_strong]:text-white [&_a]:text-[#007acc] [&_a]:hover:underline">
          <Markdown>{file.content}</Markdown>
        </div>
      </div>
    );
  }

  if (file.id === 'work_history') {
    return <WorkHistoryViewer />;
  }

  if (file.type === 'mermaid') {
    return <MermaidViewer content={file.content} />;
  }

  return <ShikiEditor fileId={file.id} />;
}
