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

export const editorTabDomId = (pane: 'left' | 'right', fileId: string) => `editor-tab-${pane}-${fileId}`;

export function EditorTabs({ pane }: { pane: 'left' | 'right' }) {
  const { openedTabs, activeFileId, setActiveFile, closeFile, reorderTabs, draftContent } = useStore();
  const tabsInPane = openedTabs.filter(t => t.pane === pane);

  if (tabsInPane.length === 0) {
    return <div className="flex bg-[#252526] h-[35px]" />;
  }

  const handleReorder = (newOrder: EditorTab[]) => {
    const otherTabs = openedTabs.filter(t => t.pane !== pane);
    reorderTabs([...otherTabs, ...newOrder]);
  };

  // Phase 5: WAI-ARIA "automatic activation" tabs — matches the roving-
  // tabindex convention already established in ExperienceTerminalTwo.tsx/
  // StageDetail.tsx (arrow keys move focus AND selection together, one
  // Tab-stop for the whole strip). Delete/Backspace closes the focused
  // tab rather than making the X its own Tab-stop — a second focusable
  // control per tab would break that single-stop model (WAI-ARIA APG's
  // "tabs with dismiss button" pattern).
  const focusTabAt = (idx: number) => {
    const file = getFileById(tabsInPane[idx].fileId);
    if (!file) return;
    setActiveFile(file.id);
    // Synchronous: the target tab is already rendered (it's an existing
    // sibling, not new), and .focus() works regardless of its current
    // tabIndex value — no need to wait for the tabIndex=0/-1 re-render.
    document.getElementById(editorTabDomId(pane, file.id))?.focus();
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, fileId: string, idx: number) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        focusTabAt((idx + 1) % tabsInPane.length);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusTabAt((idx - 1 + tabsInPane.length) % tabsInPane.length);
        break;
      case 'Home':
        e.preventDefault();
        focusTabAt(0);
        break;
      case 'End':
        e.preventDefault();
        focusTabAt(tabsInPane.length - 1);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        handleCloseViaKeyboard(fileId);
        break;
      default:
        break;
    }
  };

  const handleCloseViaKeyboard = (fileId: string) => {
    closeFile(fileId);
    // Zustand's set() applies synchronously (independent of React's own
    // render/commit timing), so reading getState() immediately after
    // closeFile() already reflects the post-close tab list — and the
    // surviving target tab, if any, is an existing element already in the
    // DOM, not something still waiting on a re-render to appear.
    const remaining = useStore.getState().openedTabs.filter(t => t.pane === pane);
    if (remaining.length === 0) {
      document.getElementById('activity-bar-explorer-toggle')?.focus();
      return;
    }
    const activeId = useStore.getState().activeFileId;
    const targetId = remaining.find(t => t.fileId === activeId)?.fileId ?? remaining[remaining.length - 1].fileId;
    document.getElementById(editorTabDomId(pane, targetId))?.focus();
  };

  // Roving tabindex position: whichever tab in this pane is active (the
  // same fallback EditorRenderer/Breadcrumbs already use), so Tab always
  // lands on the file actually being shown, not an arbitrary first tab.
  const rovingFileId = tabsInPane.find(t => t.fileId === activeFileId)?.fileId ?? tabsInPane[tabsInPane.length - 1]?.fileId;

  return (
    <div className="flex bg-[#252526] h-[35px] overflow-x-auto no-scrollbar border-b border-[#1e1e1e]">
      <Reorder.Group
        axis="x"
        values={tabsInPane}
        onReorder={handleReorder}
        role="tablist"
        aria-label={`Open editors${pane === 'right' ? ', right pane' : ''}`}
        className="flex h-full w-max"
      >
        <AnimatePresence initial={false}>
          {tabsInPane.map((tab, idx) => {
            const file = getFileById(tab.fileId);
            if (!file) return null;

            const isActive = activeFileId === file.id;
            const icon = FileIconMap[file.type] || FileIconMap.default;
            const draft = draftContent[file.id];
            const isDirty = draft !== undefined && draft !== file.content;

            return (
              <Reorder.Item
                key={tab.id}
                value={tab}
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                id={editorTabDomId(pane, file.id)}
                role="tab"
                aria-selected={isActive}
                tabIndex={file.id === rovingFileId ? 0 : -1}
                onClick={() => setActiveFile(file.id)}
                onFocus={() => setActiveFile(file.id)}
                onKeyDown={(e) => handleTabKeyDown(e, file.id, idx)}
                className={cn(
                  "flex items-center min-w-fit px-4 py-1 cursor-pointer group select-none border-r border-[#3c3c3c] text-[13px] relative focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#4fc1ff]",
                  isActive ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d2d] text-[#969696] hover:bg-[#2b2b2b] opacity-60 hover:opacity-100"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#007acc]" />
                )}
                <span className="mr-2">{icon}</span>
                <span className="mr-2">{file.name}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Close ${file.name}`}
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
                </button>
              </Reorder.Item>
            );
          })}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
}
