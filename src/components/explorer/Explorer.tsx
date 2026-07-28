import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, FileJson, FileCode2, Terminal as TerminalIcon, File as FileIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { fileSystem, getFileById } from '../../content/fileSystem';
import { ExplorerNode, VirtualFile, VirtualFolder } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { SearchPanel } from './SearchPanel';
import { ResizeHandle } from '../shared/ResizeHandle';
import { shouldRunOnboarding } from '../../lib/onboardingScope';

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
  const { explorerState, setExplorerWidth } = useStore();
  // Portfolio UX Sprint: computed once per Explorer mount (i.e. once per
  // page load, same as EditorArea's `booting` — Explorer never remounts as
  // the user navigates between files) so the already-expanded tree
  // stagger-reveals like VS Code restoring a workspace, exactly once, only
  // when the onboarding sequence is running.
  const [staggerReveal] = useState(() => shouldRunOnboarding());

  if (!explorerState.isOpen) return null;

  const isSearchView = explorerState.view === 'search';

  return (
    <div
      style={{ width: explorerState.width }}
      className="relative bg-[#252526] shrink-0 border-r border-[#3c3c3c] flex flex-col h-full"
    >
      <div className="flex items-center justify-between px-4 py-3 uppercase tracking-wider text-[11px] font-bold text-[#858585]">
        <span>{isSearchView ? 'Search' : 'Explorer'}</span>
        {!isSearchView && <span>...</span>}
      </div>
      <div className="flex-1 overflow-y-auto">
        {isSearchView ? (
          <SearchPanel />
        ) : staggerReveal ? (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <FolderNode node={fileSystem} level={0} staggerReveal />
          </motion.div>
        ) : (
          <FolderNode node={fileSystem} level={0} />
        )}
      </div>
      <ResizeHandle
        direction="horizontal"
        onResize={setExplorerWidth}
        className="absolute top-0 bottom-0 right-0 -mr-0.5"
      />
    </div>
  );
}

function FolderNode({ node, level, staggerReveal }: { node: VirtualFolder; level: number; staggerReveal?: boolean }) {
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
            {node.children.map((child, i) => {
              const content = 'content' in child
                ? <FileNode node={child as VirtualFile} level={level + 1} />
                : <FolderNode node={child as VirtualFolder} level={level + 1} staggerReveal={staggerReveal} />;

              if (!staggerReveal) {
                return <React.Fragment key={child.id}>{content}</React.Fragment>;
              }

              return (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 + i * 0.04, ease: 'easeOut' }}
                >
                  {content}
                </motion.div>
              );
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
