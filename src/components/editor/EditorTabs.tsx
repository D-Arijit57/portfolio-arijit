import React from 'react';
import { X, Circle, FileText, FileJson, FileCode2, Terminal as TerminalIcon, File as FileIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';
import { cn } from '../../lib/utils';
import { VirtualFile, EditorTab } from '../../types';
import { Reorder, AnimatePresence } from 'motion/react';

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

export function EditorTabs({ pane }: { pane: 'left' | 'right' }) {
  const { openedTabs, activeFileId, setActiveFile, closeFile, reorderTabs } = useStore();
  const tabsInPane = openedTabs.filter(t => t.pane === pane);

  if (tabsInPane.length === 0) {
    return <div className="flex bg-[#252526] h-[35px]" />;
  }

  const handleReorder = (newOrder: EditorTab[]) => {
    const otherTabs = openedTabs.filter(t => t.pane !== pane);
    reorderTabs([...otherTabs, ...newOrder]);
  };

  return (
    <div className="flex bg-[#252526] h-[35px] overflow-x-auto no-scrollbar border-b border-[#1e1e1e]">
      <Reorder.Group 
        axis="x" 
        values={tabsInPane} 
        onReorder={handleReorder}
        className="flex h-full w-max"
      >
        <AnimatePresence initial={false}>
          {tabsInPane.map(tab => {
            const file = getFileById(tab.fileId);
            if (!file) return null;
            
            const isActive = activeFileId === file.id;
            const icon = FileIconMap[file.type] || FileIconMap.default;
            const isDirty = tab.isDirty;

            return (
              <Reorder.Item
                key={tab.id}
                value={tab}
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setActiveFile(file.id)}
                className={cn(
                  "flex items-center min-w-fit px-4 py-1 cursor-pointer group select-none border-r border-[#3c3c3c] text-[13px] relative",
                  isActive ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d2d] text-[#969696] hover:bg-[#2b2b2b] opacity-60 hover:opacity-100"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#007acc]" />
                )}
                <span className="mr-2">{icon}</span>
                <span className="mr-2">{file.name}</span>
                <div 
                  className={cn(
                    "p-0.5 rounded-md hover:bg-[#333333] flex items-center justify-center w-5 h-5",
                    (isActive || isDirty) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(file.id);
                  }}
                >
                  {isDirty ? (
                    <Circle size={10} fill="currentColor" className="group-hover:hidden" />
                  ) : null}
                  <X size={14} className={cn(isDirty && "hidden group-hover:block")} />
                </div>
              </Reorder.Item>
            );
          })}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
}
