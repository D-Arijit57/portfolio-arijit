import React from 'react';
import { ChevronRight, ChevronDown, FileText, FileJson, FileCode2, Terminal as TerminalIcon, File as FileIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { fileSystem, getFileById } from '../../content/fileSystem';
import { ExplorerNode, VirtualFile, VirtualFolder } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const FileIconMap: Record<string, React.ReactNode> = {
  markdown: <FileText size={16} className="text-[#519aba]" />,
  python: <FileCode2 size={16} className="text-[#3572A5]" />,
  typescript: <FileCode2 size={16} className="text-[#3178c6]" />,
  json: <FileJson size={16} className="text-[#cbcb41]" />,
  yaml: <FileJson size={16} className="text-[#cb3837]" />,
  shell: <TerminalIcon size={16} className="text-[#4d5a5e]" />,
  mermaid: <FileText size={16} className="text-[#ff3670]" />,
  default: <FileIcon size={16} className="text-[#cccccc]" />,
};

export function Explorer() {
  const { explorerState } = useStore();

  if (!explorerState.isOpen) return null;

  return (
    <div className="w-[220px] bg-[#252526] shrink-0 border-r border-[#3c3c3c] flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 uppercase tracking-wider text-[11px] font-bold text-[#858585]">
        <span>Explorer</span>
        <span>...</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <FolderNode node={fileSystem} level={0} />
      </div>
    </div>
  );
}

function FolderNode({ node, level }: { node: VirtualFolder; level: number }) {
  const { explorerState, toggleFolder } = useStore();
  const isExpanded = explorerState.expandedFolders.includes(node.id);

  return (
    <div>
      <div 
        className={cn(
          "flex items-center py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] select-none",
          level === 0 ? "font-bold text-[11px] uppercase tracking-wider px-2" : "text-[13px]"
        )}
        style={{ paddingLeft: level === 0 ? '8px' : `${level * 12 + 8}px` }}
        onClick={() => toggleFolder(node.id)}
      >
        <span className="mr-1 w-4 h-4 flex items-center justify-center">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children.map(child => {
              if ('content' in child) {
                return <FileNode key={child.id} node={child as VirtualFile} level={level + 1} />;
              }
              return <FolderNode key={child.id} node={child as VirtualFolder} level={level + 1} />;
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FileNode({ node, level }: { node: VirtualFile; level: number }) {
  const { activeFileId, openFile } = useStore();
  const isActive = activeFileId === node.id;
  const icon = FileIconMap[node.type] || FileIconMap.default;

  return (
    <div 
      className={cn(
        "flex items-center py-1 px-2 cursor-pointer text-[13px] select-none",
        isActive ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]"
      )}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
      onClick={() => openFile(node.id)}
    >
      <span className="mr-2 shrink-0">{icon}</span>
      <span className="truncate">{node.name}</span>
    </div>
  );
}
