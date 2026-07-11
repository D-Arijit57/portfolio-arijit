import React from 'react';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';
import { ChevronRight, FileText, FileCode2, FileJson, Terminal as TerminalIcon, File as FileIcon } from 'lucide-react';

const FileIconMap: Record<string, React.ReactNode> = {
  markdown: <FileText size={14} className="text-[#519aba]" />,
  python: <FileCode2 size={14} className="text-[#3572A5]" />,
  typescript: <FileCode2 size={14} className="text-[#3178c6]" />,
  tsx: <FileCode2 size={14} className="text-[#3178c6]" />,
  json: <FileJson size={14} className="text-[#cbcb41]" />,
  yaml: <FileJson size={14} className="text-[#cb3837]" />,
  toml: <FileJson size={14} className="text-[#cb3837]" />,
  shell: <TerminalIcon size={14} className="text-[#4d5a5e]" />,
  mermaid: <FileText size={14} className="text-[#ff3670]" />,
  default: <FileIcon size={14} className="text-[#cccccc]" />,
};

export function Breadcrumbs({ pane }: { pane?: 'left' | 'right' }) {
  const { activeFileId, openedTabs } = useStore();
  
  let currentFileId = activeFileId;
  if (pane) {
    const activeTabInPane = openedTabs.find(t => t.fileId === activeFileId && t.pane === pane) 
      || openedTabs.filter(t => t.pane === pane).pop();
    currentFileId = activeTabInPane?.fileId || null;
  }

  if (!currentFileId) return <div className="h-[26px] bg-[#1e1e1e]" />;

  const file = getFileById(currentFileId);
  if (!file) return null;

  const parts = file.path.split('/').filter(Boolean);
  
  return (
    <div className="flex items-center px-4 py-1.5 text-[12px] text-[#858585] bg-[#1e1e1e]">
      <span>JOURNEY</span>
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={14} className="mx-1" />
          {idx === parts.length - 1 ? (
            <span className="flex items-center text-[#cccccc]">
              <span className="mr-1">{FileIconMap[file.type] || FileIconMap.default}</span>
              <span>{part}</span>
            </span>
          ) : (
            <span>{part}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
