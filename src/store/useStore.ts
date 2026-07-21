import { create } from 'zustand';
import { EditorTab, VirtualFile, VirtualFolder } from '../types';
import { workspaceSeed, getAllFiles } from '../content/workspaceSeed';
import { fetchWorkspaceTree, updateFile } from '../lib/api/vfsClient';
import type { CommandContext, ExecutionStatus, HistoryEntry } from '../terminal/types';
import { parseCommand } from '../terminal/parser';
import { executeCommand } from '../terminal/executor';
import { resolveVfsPath } from '../terminal/vfsPath';
import { registerBuiltinCommands } from '../terminal/commands';
import { buildIndex } from '../search/searchIndex';
import { search as runSearch } from '../search/searchEngine';
import { namespaceOf } from '../search/types';
import type { SearchResult } from '../search/types';
import { notificationService } from '../notifications/notificationService';
import type { Notification } from '../notifications/types';

export type SavingState = 'idle' | 'saving' | 'success' | 'error';
export type SearchStatus = 'idle' | 'searching' | 'done';

// Human-readable label per generated namespace for the hydration-time
// provider-sync approximation (ARCHITECTURE.md "Notification Service" §8) —
// a future namespace not listed here still gets a sensible generic label,
// so adding a provider never requires touching this file's notification
// wiring beyond this one map entry (optional).
const GENERATED_NAMESPACE_SYNCED_TITLE: Record<string, string> = {
  github: 'GitHub synchronized',
  leetcode: 'LeetCode refreshed',
};

// Sprint 10G: namespaces kept fully fetchable (workspaceFiles stays
// unfiltered — ProfileSidebar's GitHub widgets read github:activity/
// github:contributions directly by id, see RecentActivityLog.tsx /
// GitHubContributionGraph.tsx) but deliberately excluded from every surface
// a user can *browse* to them from: Explorer/Terminal (both read
// workspaceTree), Search (reads the built index), and Command Palette
// (reads allFiles directly, bypassing the tree). One set, three call sites.
const HIDDEN_BROWSE_NAMESPACES = new Set(['github']);

function isBrowsable(file: VirtualFile): boolean {
  return !HIDDEN_BROWSE_NAMESPACES.has(namespaceOf(file));
}

function hideBrowseNamespaceFolders(tree: VirtualFolder): VirtualFolder {
  return { ...tree, children: tree.children.filter((child) => !HIDDEN_BROWSE_NAMESPACES.has(child.id)) };
}

// Session-local bookkeeping for the hydration-time notification producer —
// not store state, not the notification queue's concern; purely "have we
// already told the user about this namespace / this session's boot" so a
// hypothetical second hydrateVFS() call doesn't re-notify.
const notifiedGeneratedNamespaces = new Set<string>();
let workspaceIndexedNotified = false;

// Composition root for the command registry (TERMINAL_DESIGN.md §2, §18.7) —
// registered once at module load, same pattern as instantiating a repository
// once rather than holding it as reactive state.
registerBuiltinCommands();

// Initial search index build (ARCHITECTURE.md §8 lists hydrateVFS()/saveFile()
// success as rebuild triggers; this seeds the index at module load so search
// is never stale/empty during the brief pre-hydration window).
const initialWorkspaceFiles = getAllFiles(workspaceSeed);
buildIndex(initialWorkspaceFiles.filter(isBrowsable));

// Sprint 10C.1: the two fileIds the README+Playground onboarding pairing is
// built from — named once here so openFile()'s onboarding logic and the
// initial boot state can't drift out of sync with each other.
const README_FILE_ID = 'readme';
const PLAYGROUND_FILE_ID = 'playground';

const MAX_TERMINAL_HISTORY = 200;

function capHistory(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.length > MAX_TERMINAL_HISTORY
    ? entries.slice(entries.length - MAX_TERMINAL_HISTORY)
    : entries;
}

/**
 * WA-01: the one place pane placement is decided for every openFile() call
 * that doesn't pass an explicit pane — Explorer, Search, Terminal commands,
 * Command Palette, and router deep-links all go through this. Previously a
 * dead ternary (`pane || (state.editorSplit ? 'left' : 'left')`) always
 * resolved to 'left', so the right pane could never be repopulated once its
 * last tab closed. Strategy: reuse whichever pane is empty; if both panes
 * are occupied (or both empty), open alongside whatever's currently active,
 * the same way a real IDE opens new files into the last-focused group.
 *
 * Sprint 10C: this only decides *which* pane ordinary navigation targets —
 * openFile() always replaces whatever tab already lives in that pane (see
 * openFile()'s own comment) rather than adding a tab, so it never grows the
 * split beyond what openToSide() explicitly created.
 */
function resolveTargetPane(state: Pick<StoreState, 'openedTabs' | 'editorSplit' | 'activeFileId'>): 'left' | 'right' {
  if (!state.editorSplit) return 'left';

  const leftCount = state.openedTabs.filter((t) => t.pane === 'left').length;
  const rightCount = state.openedTabs.filter((t) => t.pane === 'right').length;

  if (leftCount === 0 && rightCount > 0) return 'left';
  if (rightCount === 0 && leftCount > 0) return 'right';

  const activeTab = state.openedTabs.find((t) => t.fileId === state.activeFileId);
  return activeTab?.pane ?? 'left';
}

interface StoreState {
  activeFileId: string | null;
  openedTabs: EditorTab[];
  explorerState: {
    isOpen: boolean;
    expandedFolders: string[];
    view: 'files' | 'search';
    // WA-06: drag-resizable width (px), clamped in setExplorerWidth.
    width: number;
  };
  // Terminal session state (Sprint 5B). The store is the single owner of
  // every terminal concern — command history, current input, cwd, execution
  // status, and history-recall cursor. The command registry is deliberately
  // NOT here (TERMINAL_DESIGN.md §2) — commands are code, held in a
  // module-level Map in src/terminal/registry.ts.
  terminalState: {
    isOpen: boolean;
    input: string;
    status: ExecutionStatus;
    cwd: string;
    history: HistoryEntry[];
    historyCursor: number | null;
    // WA-06: drag-resizable height (px), clamped in setTerminalHeight.
    height: number;
  };
  commandPalette: {
    isOpen: boolean;
  };
  // Search session state (Sprint 7B, ARCHITECTURE.md §2). The store owns
  // query/results/activeResultIndex/status and orchestrates calls into
  // src/search/searchEngine.ts; it never matches or ranks anything itself.
  // The index itself is explicitly NOT here — it's a module-level cache in
  // src/search/searchIndex.ts (§2), same reasoning as the terminal command
  // registry.
  searchState: {
    query: string;
    results: SearchResult[];
    activeResultIndex: number | null;
    status: SearchStatus;
  };
  // Notification session state (Sprint 9B, ARCHITECTURE.md "Notification
  // Service" §2). NOT authoritative — a reactive mirror of
  // src/notifications/notificationQueue.ts, kept in sync via
  // notificationService.subscribe() (wired once, right after this store is
  // created, below). Producers never call a store action to create a
  // notification; they call notificationService directly, the same as any
  // other consumer would.
  notificationState: {
    visible: Notification[];
  };
  // Sprint 10E.2: true from store creation until the first-load boot
  // terminal (EditorArea/BootTerminal) finishes or is skipped. Reactive
  // (unlike lib/bootSequence.ts's plain `booted` flag) because Notifications
  // needs to re-render when it flips, to suppress hydration-time toasts
  // ("Workspace indexed", etc.) until the boot illusion is done.
  bootActive: boolean;
  editorSplit: boolean;
  // WA-06: fraction (0-1) of the split editor's width given to the left
  // pane, clamped in setSplitRatio. Only meaningful while editorSplit is
  // true; irrelevant to (and untouched by) single-pane layout.
  splitRatio: number;
  // Sprint 10C: the fileId of the tab that caused an *automatic* split via
  // openToSide() (e.g. Playground), or null if the current split is either
  // absent or was turned on manually (Command Palette's "Toggle Split
  // Editor"). closeFile() only reverts editorSplit back to false when the
  // closed tab is the one that owns the split — a manual split stays put
  // regardless of which files close, exactly like the manual toggle already
  // behaves today.
  splitTrigger: string | null;

  // VFS state (Sprint 3A/3B). Seeded statically below so fileSystem.ts's
  // facade (src/content/fileSystem.ts) always has valid data to read, even
  // before hydrateVFS() runs — Sprint 3C wires that call and, on success,
  // overwrites this seed with the real backend tree. See VFS_DESIGN.md /
  // BACKEND_BOOTSTRAP.md.
  workspaceTree: VirtualFolder;
  workspaceFiles: VirtualFile[];
  vfsLoaded: boolean;
  vfsLoading: boolean;
  vfsError: string | null;

  // Save pipeline (Sprint 4B). Keyed by file id rather than a single global
  // value — the editor already supports multiple open tabs across two split
  // panes, so a lone draft/savingState pair would let editing one file stomp
  // another's in-flight draft or saving indicator. draftContent holds the
  // user's uncommitted edits; workspaceFiles stays the last confirmed
  // backend state and is never written to except via reconciliation after a
  // successful save. Dirty state is derived (draft !== saved content), never
  // stored — see fileIsDirty().
  draftContent: Record<string, string>;
  savingState: Record<string, SavingState>;

  // Editor syntax-highlighting theme (Sprint 5B `theme` command target).
  // Presentation-only — never affects IDE chrome/layout.
  editorTheme: string;

  // Actions
  setActiveFile: (id: string | null) => void;
  openFile: (id: string, pane?: 'left' | 'right') => void;
  /** Sprint 10C: the one explicit "open beside the current file" action — see openToSide()'s own comment. */
  openToSide: (id: string) => void;
  closeFile: (id: string) => void;
  toggleExplorer: () => void;
  toggleFolder: (id: string) => void;
  setExplorerView: (view: 'files' | 'search') => void;
  setExplorerWidth: (deltaPx: number) => void;
  toggleTerminal: () => void;
  setTerminalHeight: (deltaPx: number) => void;
  clearTerminal: () => void;
  setTerminalInput: (value: string) => void;
  submitTerminalCommand: () => Promise<void>;
  navigateHistory: (direction: 'up' | 'down') => void;
  setEditorTheme: (theme: string) => void;
  setBootActive: (active: boolean) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  /** Thin passthrough to notificationService.dismiss() — the store isn't a privileged caller (ARCHITECTURE.md §4). */
  dismissNotification: (id: string) => void;
  toggleEditorSplit: () => void;
  setSplitRatio: (deltaPx: number, containerWidthPx: number) => void;
  reorderTabs: (tabs: EditorTab[]) => void;
  hydrateVFS: () => Promise<void>;
  setDraftContent: (id: string, content: string) => void;
  saveFile: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => Promise<void>;
  setActiveResultIndex: (index: number | null) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  activeFileId: README_FILE_ID,
  // Sprint 10C.1: the boot state is exactly what openFile(README_FILE_ID)
  // itself would produce (see its onboarding branch below) — README is
  // always shown paired with Playground, on boot and any time the user
  // navigates back to it.
  openedTabs: [
    { id: 'tab-readme', fileId: README_FILE_ID, pane: 'left' },
    { id: 'tab-playground', fileId: PLAYGROUND_FILE_ID, pane: 'right' },
  ],
  explorerState: {
    isOpen: true,
    expandedFolders: ['root', 'projects', 'cortexa', 'about', 'experience', 'skills', 'contact'],
    view: 'files',
    width: 220
  },
  terminalState: {
    isOpen: true,
    input: '',
    status: 'idle',
    cwd: '/',
    height: 200,
    history: [
      {
        id: 'hist-welcome-1',
        command: '',
        cwd: '/',
        output: [{ type: 'text', text: "Welcome to Arijit Das's workspace." }],
        timestamp: Date.now(),
      },
      {
        id: 'hist-welcome-2',
        command: '',
        cwd: '/',
        output: [{ type: 'text', text: "Type 'help' to see available commands." }],
        timestamp: Date.now(),
      },
    ],
    historyCursor: null,
  },
  commandPalette: { isOpen: false },
  searchState: { query: '', results: [], activeResultIndex: null, status: 'idle' },
  notificationState: { visible: [] },
  bootActive: true,
  editorSplit: true,
  splitRatio: 0.5,
  // 'playground' owns the split whether it got there via the README
  // onboarding pairing (boot, or openFile(README_FILE_ID) later) or via the
  // manual `playground` command (openToSide) — closeFile() collapses to a
  // single editor either way with no extra branching required.
  splitTrigger: PLAYGROUND_FILE_ID,

  workspaceTree: workspaceSeed,
  workspaceFiles: initialWorkspaceFiles,
  vfsLoaded: false,
  vfsLoading: false,
  vfsError: null,

  draftContent: {},
  savingState: {},

  editorTheme: 'dark-plus',

  setActiveFile: (id) => set({ activeFileId: id }),
  
  // Sprint 10C: the single path for *ordinary* navigation (Explorer, Search,
  // Terminal's `open`, Command Palette, router deep-links). It never grows
  // the tab list — it replaces whatever tab currently occupies the target
  // pane, so normal navigation has exactly one obvious outcome and can never
  // accumulate tabs or force a split into existence. openToSide() is the
  // only action that adds a tab alongside an existing one.
  //
  // Sprint 10C.1: README is the one centralized exception to "ordinary
  // navigation never creates a split" — every caller listed above goes
  // through this same function, so the onboarding rule lives here once
  // rather than as scattered README checks in Explorer/Search/etc.
  openFile: (id, pane) => set((state) => {
    // Landing on README always (re)establishes the onboarding pairing with
    // Playground, replacing whatever the workspace was showing — the same
    // outcome whether this is the very first render or a return visit.
    if (id === README_FILE_ID) {
      const ts = Date.now();
      return {
        editorSplit: true,
        splitTrigger: PLAYGROUND_FILE_ID,
        openedTabs: [
          { id: `tab-${ts}-readme`, fileId: README_FILE_ID, pane: 'left' },
          { id: `tab-${ts}-playground`, fileId: PLAYGROUND_FILE_ID, pane: 'right' },
        ],
        activeFileId: README_FILE_ID,
      };
    }

    // Leaving the README+Playground onboarding pairing for any other file
    // quietly closes Playground and returns to a single editor. Derived
    // from the current tabs rather than a stored flag, so it only fires for
    // this specific pairing and never collapses a split the `playground`
    // command created around some other file (openToSide()'s own
    // splitTrigger ownership is untouched by this branch).
    const isReadmeOnboarding = state.editorSplit &&
      state.openedTabs.some(t => t.fileId === README_FILE_ID) &&
      state.openedTabs.some(t => t.fileId === PLAYGROUND_FILE_ID);

    if (isReadmeOnboarding) {
      return {
        editorSplit: false,
        splitTrigger: null,
        openedTabs: [{ id: `tab-${Date.now()}`, fileId: id, pane: 'left' as const }],
        activeFileId: id,
      };
    }

    const existingTab = state.openedTabs.find(t => t.fileId === id);
    if (existingTab) {
      return { activeFileId: id };
    }
    const targetPane = pane ?? resolveTargetPane(state);
    const newTab = { id: `tab-${Date.now()}`, fileId: id, pane: targetPane };
    const tabsWithoutTargetPane = state.openedTabs.filter(t => t.pane !== targetPane);
    return {
      openedTabs: [...tabsWithoutTargetPane, newTab],
      activeFileId: id,
    };
  }),

  // Sprint 10C: the one explicit "split for a reason" action — used today by
  // the `playground` terminal command, and the mechanism a future "Open to
  // Side" command or Atlas comparison view would call too. Unlike openFile(),
  // this never replaces the current tab: it turns split on if needed and
  // opens the file into the *other* pane, beside whatever's active. If a
  // split didn't already exist, this call becomes its owner (splitTrigger) so
  // closeFile() knows to revert to a single editor once this file closes — a
  // split that was already on (e.g. via the manual "Toggle Split Editor"
  // command) is left owned by whatever turned it on originally.
  openToSide: (id) => set((state) => {
    const existingTab = state.openedTabs.find(t => t.fileId === id);
    if (existingTab) {
      return { activeFileId: id, editorSplit: true };
    }

    const activeTab = state.openedTabs.find(t => t.fileId === state.activeFileId);
    const currentPane = activeTab?.pane ?? 'left';
    const sidePane: 'left' | 'right' = currentPane === 'left' ? 'right' : 'left';

    const tabsWithoutSidePane = state.openedTabs.filter(t => t.pane !== sidePane);
    const newTab = { id: `tab-${Date.now()}`, fileId: id, pane: sidePane };

    return {
      editorSplit: true,
      splitTrigger: state.editorSplit ? state.splitTrigger : id,
      openedTabs: [...tabsWithoutSidePane, newTab],
      activeFileId: id,
    };
  }),

  closeFile: (id) => {
    set((state) => {
      const newTabs = state.openedTabs.filter(t => t.fileId !== id);
      // Sprint 10C: only collapse back to a single editor when the tab
      // closing is the one that automatically opened the split — a manually
      // toggled split (or one owned by some other still-open file) persists.
      const ownsSplit = state.splitTrigger === id;
      return {
        openedTabs: ownsSplit ? newTabs.map(t => ({ ...t, pane: 'left' as const })) : newTabs,
        activeFileId: state.activeFileId === id ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].fileId : null) : state.activeFileId,
        editorSplit: ownsSplit ? false : state.editorSplit,
        splitTrigger: ownsSplit ? null : state.splitTrigger,
      };
    });

    // WA-08: closing the playground is the one file-close producers were
    // asked to surface — points the user at the `playground` command
    // (WA-08) rather than leaving the restore path undiscoverable.
    if (id === PLAYGROUND_FILE_ID) {
      notificationService.info({
        title: 'Playground closed',
        message: "Run 'playground' in the terminal to restore it.",
        source: 'Editor',
        duration: 6000,
      });
    }
  },

  toggleExplorer: () => set((state) => ({
    explorerState: { ...state.explorerState, isOpen: !state.explorerState.isOpen }
  })),

  toggleFolder: (id) => set((state) => {
    const isExpanded = state.explorerState.expandedFolders.includes(id);
    return {
      explorerState: {
        ...state.explorerState,
        expandedFolders: isExpanded 
          ? state.explorerState.expandedFolders.filter(fId => fId !== id)
          : [...state.explorerState.expandedFolders, id]
      }
    };
  }),

  setExplorerView: (view) => set((state) => ({
    explorerState: { ...state.explorerState, view, isOpen: true }
  })),

  // WA-06: delta-based, clamped to a usable range (170-480px) so a fast
  // drag can never collapse Explorer to unreadable or runaway width.
  setExplorerWidth: (deltaPx) => set((state) => ({
    explorerState: {
      ...state.explorerState,
      width: Math.min(480, Math.max(170, state.explorerState.width + deltaPx)),
    },
  })),

  toggleTerminal: () => set((state) => ({
    terminalState: { ...state.terminalState, isOpen: !state.terminalState.isOpen }
  })),

  // WA-06: dragging the handle up (negative deltaY) grows the terminal, so
  // height is decremented by deltaY. Clamped to a usable range, with the
  // upper bound leaving room for the editor above it.
  setTerminalHeight: (deltaPx) => set((state) => {
    const maxHeight = typeof window !== 'undefined' ? Math.max(160, window.innerHeight - 200) : 600;
    return {
      terminalState: {
        ...state.terminalState,
        height: Math.min(maxHeight, Math.max(100, state.terminalState.height - deltaPx)),
      },
    };
  }),

  clearTerminal: () => set((state) => ({
    terminalState: { ...state.terminalState, history: [], historyCursor: null }
  })),

  setTerminalInput: (value) => set((state) => ({
    terminalState: { ...state.terminalState, input: value }
  })),

  // The only orchestrator for terminal execution (TERMINAL_DESIGN.md §1, §6).
  // Parses and delegates to the executor/registry; never contains a command
  // switch statement itself.
  submitTerminalCommand: async () => {
    const raw = get().terminalState.input;
    const trimmed = raw.trim();

    if (trimmed === '') {
      const entry: HistoryEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        command: '',
        cwd: get().terminalState.cwd,
        output: [],
        timestamp: Date.now(),
      };
      set((state) => ({
        terminalState: {
          ...state.terminalState,
          history: capHistory([...state.terminalState.history, entry]),
          input: '',
          historyCursor: null,
        },
      }));
      return;
    }

    set((state) => ({ terminalState: { ...state.terminalState, status: 'executing' } }));

    const parsed = parseCommand(raw);
    const ctx: CommandContext = {
      args: parsed.args,
      raw,
      cwd: get().terminalState.cwd,
      history: get().terminalState.history.map((h) => h.command).filter(Boolean),
      openFile: get().openFile,
      openToSide: get().openToSide,
      resolvePath: (path) => resolveVfsPath(get().workspaceTree, get().terminalState.cwd, path),
      setCwd: (path) => set((state) => ({ terminalState: { ...state.terminalState, cwd: path } })),
      clearHistory: () => get().clearTerminal(),
      getEditorTheme: () => get().editorTheme,
      setEditorTheme: (theme) => set({ editorTheme: theme }),
    };

    const result = await executeCommand(parsed, ctx);

    const entry: HistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      command: raw,
      cwd: get().terminalState.cwd,
      output: result.output,
      timestamp: Date.now(),
    };

    set((state) => ({
      terminalState: {
        ...state.terminalState,
        history: capHistory([...state.terminalState.history, entry]),
        input: '',
        historyCursor: null,
        status: 'idle',
      },
    }));
  },

  // ↑ recalls further back, ↓ recalls forward; commandLog is derived from
  // history, never a second stored array (TERMINAL_DESIGN.md §8).
  navigateHistory: (direction) => set((state) => {
    const commandLog = state.terminalState.history.map((h) => h.command).filter(Boolean);
    if (commandLog.length === 0) return {};

    const { historyCursor } = state.terminalState;

    if (direction === 'up') {
      const nextIndex = historyCursor === null ? commandLog.length - 1 : Math.max(0, historyCursor - 1);
      return {
        terminalState: { ...state.terminalState, historyCursor: nextIndex, input: commandLog[nextIndex] },
      };
    }

    if (historyCursor === null) return {};
    const nextIndex = historyCursor + 1;
    if (nextIndex >= commandLog.length) {
      return { terminalState: { ...state.terminalState, historyCursor: null, input: '' } };
    }
    return {
      terminalState: { ...state.terminalState, historyCursor: nextIndex, input: commandLog[nextIndex] },
    };
  }),

  setEditorTheme: (theme) => set({ editorTheme: theme }),

  setBootActive: (active) => set({ bootActive: active }),

  setCommandPaletteOpen: (isOpen) => set({ commandPalette: { isOpen } }),

  dismissNotification: (id) => {
    notificationService.dismiss(id);
  },

  toggleEditorSplit: () => set((state) => {
    if (state.editorSplit) {
      // Merging back to one pane
      return {
        editorSplit: false,
        splitTrigger: null,
        openedTabs: state.openedTabs.map(t => ({ ...t, pane: 'left' }))
      };
    }
    // Manually requested split — not owned by any specific file, so closing
    // files never auto-collapses it (see closeFile()'s ownsSplit check).
    return { editorSplit: true, splitTrigger: null };
  }),

  // WA-06: converts a pixel delta into a ratio delta against the measured
  // container width (passed by the caller, which owns that DOM ref — the
  // store stays DOM-agnostic), then clamps so neither pane can be dragged
  // below a 200px-equivalent minimum.
  setSplitRatio: (deltaPx, containerWidthPx) => set((state) => {
    if (containerWidthPx <= 0) return {};
    const minRatio = Math.min(0.4, 200 / containerWidthPx);
    const next = state.splitRatio + deltaPx / containerWidthPx;
    return { splitRatio: Math.min(1 - minRatio, Math.max(minRatio, next)) };
  }),

  reorderTabs: (tabs) => set({ openedTabs: tabs }),

  hydrateVFS: async () => {
    if (get().vfsLoading) return;
    set({ vfsLoading: true, vfsError: null });
    try {
      const tree = await fetchWorkspaceTree();
      const files = getAllFiles(tree);
      buildIndex(files.filter(isBrowsable)); // ARCHITECTURE.md §8: hydrateVFS() success rebuilds the index
      set({
        workspaceTree: hideBrowseNamespaceFolders(tree),
        workspaceFiles: files,
        vfsLoaded: true,
        vfsLoading: false,
        vfsError: null,
      });

      // Notification Service integration (ARCHITECTURE.md "Notification
      // Service" §8). GitHubProvider/LeetCodeProvider run in the backend
      // process and cannot call notificationService directly — this is the
      // documented approximation: fire one "synchronized" notification per
      // generated namespace the first time it's observed present in a
      // hydrated tree this session (not a true "just synced" signal).
      if (!workspaceIndexedNotified) {
        workspaceIndexedNotified = true;
        notificationService.info({ title: 'Workspace indexed', source: 'Hydration', duration: 2500 });
      }
      const generatedNamespaces = new Set(files.map(namespaceOf).filter((ns) => ns !== 'workspace'));
      for (const namespace of generatedNamespaces) {
        if (notifiedGeneratedNamespaces.has(namespace)) continue;
        notifiedGeneratedNamespaces.add(namespace);
        notificationService.info({
          title: GENERATED_NAMESPACE_SYNCED_TITLE[namespace] ?? `${namespace} synchronized`,
          source: 'Hydration',
          duration: 2500,
        });
      }
    } catch (err) {
      set({
        vfsLoading: false,
        vfsError: err instanceof Error ? err.message : 'Failed to load workspace',
      });
    }
  },

  setDraftContent: (id, content) => set((state) => ({
    draftContent: { ...state.draftContent, [id]: content },
  })),

  saveFile: async (id) => {
    const draft = get().draftContent[id];
    if (draft === undefined) return;

    set((state) => ({
      savingState: { ...state.savingState, [id]: 'saving' },
    }));

    const result = await updateFile(id, draft);

    if (result.status === 'success') {
      set((state) => {
        const { [id]: _saved, ...remainingDrafts } = state.draftContent;
        const updatedFiles = state.workspaceFiles.map(f => f.id === id ? result.file : f);
        buildIndex(updatedFiles.filter(isBrowsable)); // ARCHITECTURE.md §8: saveFile() success rebuilds the index
        return {
          workspaceFiles: updatedFiles,
          draftContent: remainingDrafts,
          savingState: { ...state.savingState, [id]: 'success' },
        };
      });
      notificationService.success({ title: 'File saved', message: id, source: 'Save Pipeline', dedupeKey: `save:${id}` });
    } else {
      set((state) => ({
        savingState: { ...state.savingState, [id]: 'error' },
      }));
      notificationService.error({ title: 'File save failed', message: result.message, source: 'Save Pipeline' });
    }
  },

  // The one orchestrator for search (ARCHITECTURE.md §1, mirrors
  // submitTerminalCommand's shape): updates query, delegates matching/ranking
  // to the Search Engine, stores results. Never matches or ranks itself.
  setSearchQuery: async (query) => {
    if (query.trim() === '') {
      set((state) => ({
        searchState: { ...state.searchState, query, results: [], activeResultIndex: null, status: 'idle' },
      }));
      return;
    }

    set((state) => ({ searchState: { ...state.searchState, query, status: 'searching' } }));

    const results = await runSearch(query);

    set((state) => {
      // Guard against an out-of-order resolution clobbering a newer query's
      // results — cheap now, load-bearing once search() is truly async (§9).
      if (state.searchState.query !== query) return {};
      return {
        searchState: {
          ...state.searchState,
          results,
          status: 'done',
          activeResultIndex: results.length > 0 ? 0 : null,
        },
      };
    });
  },

  setActiveResultIndex: (index) => set((state) => ({
    searchState: { ...state.searchState, activeResultIndex: index },
  })),
}));

// Store never owns notification state directly (ARCHITECTURE.md
// "Notification Service" §2/§4) — it mirrors notificationQueue by
// subscribing once here, the same "queue is authoritative, store just
// reflects it" relationship searchState.results has to the search index.
// This subscription is the ONLY place notificationState is ever set.
notificationService.subscribe(() => {
  useStore.setState({ notificationState: { visible: [...notificationService.getVisible()] } });
});
