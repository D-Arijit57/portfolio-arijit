import React, { useCallback, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, FileText, FileJson, FileCode2, Terminal as TerminalIcon, File as FileIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { fileSystem } from '../../content/fileSystem';
import { VirtualFile, VirtualFolder } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { SearchPanel } from './SearchPanel';
import { ExplorerPanels } from './ExplorerPanels';
import { ResizeHandle } from '../shared/ResizeHandle';
import { shouldRunOnboarding } from '../../lib/onboardingScope';

const FileIconMap: Record<string, React.ReactNode> = {
  markdown: <FileText size={16} className="text-[#519aba]" />,
  python: <FileCode2 size={16} className="text-[#3572A5]" />,
  typescript: <FileCode2 size={16} className="text-[#3178c6]" />,
  json: <FileJson size={16} className="text-[#cbcb41]" />,
  yaml: <FileJson size={16} className="text-[#cb3837]" />,
  shell: <TerminalIcon size={16} className="text-[#4d5a5e]" />,
  log: <TerminalIcon size={16} className="text-[#4d5a5e]" />,
  mermaid: <FileText size={16} className="text-[#ff3670]" />,
  default: <FileIcon size={16} className="text-[#cccccc]" />,
};

const explorerRowId = (id: string) => `explorer-row-${id}`;

/** Flattens the tree into the exact rows FolderNode/FileNode render right
 * now (same startup-log filter, same expand-state gating) — the roving
 * tabindex/arrow-key model needs one ordered list of *visible* rows,
 * independent of the recursive component tree that renders them. */
interface FlatRow {
  id: string;
  level: number;
  isFolder: boolean;
}

function flattenVisible(node: VirtualFolder, expandedFolders: string[], level = 0): FlatRow[] {
  const rows: FlatRow[] = [{ id: node.id, level, isFolder: true }];
  if (!expandedFolders.includes(node.id)) return rows;

  for (const child of node.children.filter((c) => c.id !== 'startup-log')) {
    if ('content' in child) {
      rows.push({ id: child.id, level: level + 1, isFolder: false });
    } else {
      rows.push(...flattenVisible(child as VirtualFolder, expandedFolders, level + 1));
    }
  }
  return rows;
}

export function Explorer() {
  const { explorerState, setExplorerWidth, toggleFolder, openFile, activeFileId } = useStore();
  // Portfolio UX Sprint: computed once per Explorer mount (i.e. once per
  // page load, same as EditorArea's `booting` — Explorer never remounts as
  // the user navigates between files) so the already-expanded tree
  // stagger-reveals like VS Code restoring a workspace, exactly once, only
  // when the onboarding sequence is running.
  const [staggerReveal] = useState(() => shouldRunOnboarding());

  const flat = useMemo(
    () => flattenVisible(fileSystem, explorerState.expandedFolders),
    [explorerState.expandedFolders],
  );

  // Phase 5: roving tabindex — only one row is ever a Tab-stop. Local
  // interaction state, not derived from `activeFileId`: once the user has
  // started navigating the tree with the keyboard, opening a different
  // file some other way (Command Palette, a link) shouldn't silently move
  // where Tab lands next time they come back to Explorer. Initialized to
  // the active file if it's visible, otherwise the root row.
  const [focusedId, setFocusedId] = useState(
    () => flat.find((r) => r.id === activeFileId)?.id ?? flat[0]?.id ?? fileSystem.id,
  );
  const currentFocusedId = flat.some((r) => r.id === focusedId) ? focusedId : (flat[0]?.id ?? fileSystem.id);

  const focusRow = useCallback((id: string) => {
    setFocusedId(id);
    // Synchronous, not rAF-deferred: .focus() works on an element
    // regardless of its *current* tabIndex value (tabIndex=-1 elements
    // are still programmatically focusable, just not Tab-reachable), so
    // this doesn't need to wait for the tabIndex=0/-1 re-render to land.
    document.getElementById(explorerRowId(id))?.focus();
  }, []);

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      const idx = flat.findIndex((r) => r.id === id);
      if (idx === -1) return;
      const row = flat[idx];

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = flat[Math.min(idx + 1, flat.length - 1)];
          if (next) focusRow(next.id);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = flat[Math.max(idx - 1, 0)];
          if (prev) focusRow(prev.id);
          break;
        }
        case 'Home': {
          e.preventDefault();
          if (flat[0]) focusRow(flat[0].id);
          break;
        }
        case 'End': {
          e.preventDefault();
          const last = flat[flat.length - 1];
          if (last) focusRow(last.id);
          break;
        }
        case 'ArrowRight': {
          if (!row.isFolder) break;
          e.preventDefault();
          const isExpanded = explorerState.expandedFolders.includes(row.id);
          if (!isExpanded) {
            toggleFolder(row.id);
          } else {
            const next = flat[idx + 1];
            if (next && next.level > row.level) focusRow(next.id);
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (row.isFolder && explorerState.expandedFolders.includes(row.id)) {
            toggleFolder(row.id);
          } else {
            for (let i = idx - 1; i >= 0; i--) {
              if (flat[i].level < row.level) {
                focusRow(flat[i].id);
                break;
              }
            }
          }
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (row.isFolder) toggleFolder(row.id);
          else openFile(row.id);
          break;
        }
        default:
          return;
      }
    },
    [flat, explorerState.expandedFolders, toggleFolder, openFile, focusRow],
  );

  if (!explorerState.isOpen) return null;

  const isSearchView = explorerState.view === 'search';

  return (
    <div
      id="explorer-panel"
      style={{ width: explorerState.width }}
      className="relative bg-[#252526] shrink-0 border-r border-[#3c3c3c] flex flex-col h-full"
    >
      <div className="flex items-center justify-between px-4 py-3 uppercase tracking-wider text-[11px] font-bold text-[#858585]">
        <span>{isSearchView ? 'Search' : 'Explorer'}</span>
        {!isSearchView && <span>...</span>}
      </div>
      <div className="flex-1 overflow-y-auto" role={isSearchView ? undefined : 'tree'} aria-label={isSearchView ? undefined : 'Explorer'}>
        {isSearchView ? (
          <SearchPanel />
        ) : staggerReveal ? (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <FolderNode
              node={fileSystem}
              level={0}
              staggerReveal
              focusedId={currentFocusedId}
              onRowKeyDown={handleRowKeyDown}
              onRowFocus={setFocusedId}
            />
          </motion.div>
        ) : (
          <FolderNode
            node={fileSystem}
            level={0}
            focusedId={currentFocusedId}
            onRowKeyDown={handleRowKeyDown}
            onRowFocus={setFocusedId}
          />
        )}
      </div>
      {/* Sprint 17 (RESUME.md spec §6): pinned below the tree, not inside
          its scroll area — they're sibling panels in VS Code, and putting
          them in the scroller would bury them under a tall file tree. */}
      {!isSearchView && <ExplorerPanels />}
      <ResizeHandle
        direction="horizontal"
        onResize={setExplorerWidth}
        className="absolute top-0 bottom-0 right-0 -mr-0.5"
      />
    </div>
  );
}

interface RowProps {
  focusedId: string;
  onRowKeyDown: (e: React.KeyboardEvent, id: string) => void;
  onRowFocus: (id: string) => void;
}

function FolderNode({
  node,
  level,
  staggerReveal,
  focusedId,
  onRowKeyDown,
  onRowFocus,
}: { node: VirtualFolder; level: number; staggerReveal?: boolean } & RowProps) {
  const { explorerState, toggleFolder } = useStore();
  const isExpanded = explorerState.expandedFolders.includes(node.id);
  const isRoving = focusedId === node.id;
  const reduceMotion = prefersReducedMotion();

  return (
    <div role="group">
      <div
        id={explorerRowId(node.id)}
        role="treeitem"
        aria-expanded={isExpanded}
        aria-level={level + 1}
        tabIndex={isRoving ? 0 : -1}
        className={cn(
          "flex items-center py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#4fc1ff]",
          level === 0 ? "font-bold text-[11px] uppercase tracking-wider px-2" : "text-[13px]"
        )}
        style={{ paddingLeft: level === 0 ? '8px' : `${level * 12 + 8}px` }}
        onClick={() => {
          onRowFocus(node.id);
          toggleFolder(node.id);
        }}
        onFocus={() => onRowFocus(node.id)}
        onKeyDown={(e) => onRowKeyDown(e, node.id)}
      >
        <span className="mr-1 w-4 h-4 flex items-center justify-center">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="overflow-hidden"
          >
            {node.children
              // startup.log is a boot-sequence artifact, always paired
              // statically with welcome.md's right pane (see useStore.ts's
              // openedTabs/splitTrigger) — never a file the user should
              // browse to or open independently via the Explorer tree.
              .filter((child) => child.id !== 'startup-log')
              .map((child, i) => {
                const content = 'content' in child
                  ? <FileNode node={child as VirtualFile} level={level + 1} focusedId={focusedId} onRowKeyDown={onRowKeyDown} onRowFocus={onRowFocus} />
                  : <FolderNode node={child as VirtualFolder} level={level + 1} staggerReveal={staggerReveal} focusedId={focusedId} onRowKeyDown={onRowKeyDown} onRowFocus={onRowFocus} />;

                if (!staggerReveal) {
                  return <React.Fragment key={child.id}>{content}</React.Fragment>;
                }

                return (
                  <motion.div
                    key={child.id}
                    initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : 0.05 + i * 0.04, ease: 'easeOut' }}
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

function FileNode({ node, level, focusedId, onRowKeyDown, onRowFocus }: { node: VirtualFile; level: number } & RowProps) {
  const { activeFileId, openFile } = useStore();
  const isActive = activeFileId === node.id;
  const isRoving = focusedId === node.id;
  const icon = FileIconMap[node.type] || FileIconMap.default;

  return (
    <div
      id={explorerRowId(node.id)}
      role="treeitem"
      aria-selected={isActive}
      aria-level={level + 1}
      tabIndex={isRoving ? 0 : -1}
      className={cn(
        "flex items-center py-1 px-2 cursor-pointer text-[13px] select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#4fc1ff]",
        isActive ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]"
      )}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
      onClick={() => {
        onRowFocus(node.id);
        openFile(node.id);
      }}
      onFocus={() => onRowFocus(node.id)}
      onKeyDown={(e) => onRowKeyDown(e, node.id)}
    >
      <span className="mr-2 shrink-0">{icon}</span>
      <span className="truncate">{node.name}</span>
    </div>
  );
}
