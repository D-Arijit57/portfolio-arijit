import { create } from 'zustand';
import { EditorTab, Notification, VirtualFile, VirtualFolder } from '../types';
import { workspaceSeed, getAllFiles } from '../content/workspaceSeed';
import { fetchWorkspaceTree, updateFile } from '../lib/api/vfsClient';

export type SavingState = 'idle' | 'saving' | 'success' | 'error';

interface StoreState {
  activeFileId: string | null;
  openedTabs: EditorTab[];
  explorerState: {
    isOpen: boolean;
    expandedFolders: string[];
  };
  terminalState: {
    isOpen: boolean;
    history: { command: string; output: string }[];
  };
  commandPalette: {
    isOpen: boolean;
  };
  notifications: Notification[];
  editorSplit: boolean;

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

  // Actions
  setActiveFile: (id: string | null) => void;
  openFile: (id: string, pane?: 'left' | 'right') => void;
  closeFile: (id: string) => void;
  toggleExplorer: () => void;
  toggleFolder: (id: string) => void;
  toggleTerminal: () => void;
  addTerminalHistory: (command: string, output: string) => void;
  clearTerminal: () => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  toggleEditorSplit: () => void;
  reorderTabs: (tabs: EditorTab[]) => void;
  hydrateVFS: () => Promise<void>;
  setDraftContent: (id: string, content: string) => void;
  saveFile: (id: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  activeFileId: 'readme',
  openedTabs: [
    { id: 'tab-readme', fileId: 'readme', pane: 'left' },
    { id: 'tab-playground', fileId: 'playground', pane: 'right' }
  ],
  explorerState: {
    isOpen: true,
    expandedFolders: ['root', 'projects', 'cortexa', 'about', 'experience', 'skills', 'contact']
  },
  terminalState: {
    isOpen: true,
    history: [
      { command: '', output: "Welcome to Arijit Das's workspace." },
      { command: '', output: "Type 'help' to see available commands." }
    ]
  },
  commandPalette: { isOpen: false },
  notifications: [
    { id: 'notif-1', source: 'GitHub', message: '3 commits pushed to portfolio-v2 today.', timestamp: Date.now() - 10000 },
    { id: 'notif-2', source: 'LeetCode', message: 'Solved 542 problems. Current streak: 12 days.', timestamp: Date.now() }
  ],
  editorSplit: true,

  workspaceTree: workspaceSeed,
  workspaceFiles: getAllFiles(workspaceSeed),
  vfsLoaded: false,
  vfsLoading: false,
  vfsError: null,

  draftContent: {},
  savingState: {},

  setActiveFile: (id) => set({ activeFileId: id }),
  
  openFile: (id, pane) => set((state) => {
    const existingTab = state.openedTabs.find(t => t.fileId === id);
    if (existingTab) {
      return { activeFileId: id };
    }
    const targetPane = pane || (state.editorSplit ? 'left' : 'left');
    const newTab = { id: `tab-${Date.now()}`, fileId: id, pane: targetPane };
    return {
      openedTabs: [...state.openedTabs, newTab],
      activeFileId: id,
    };
  }),

  closeFile: (id) => set((state) => {
    const newTabs = state.openedTabs.filter(t => t.fileId !== id);
    return {
      openedTabs: newTabs,
      activeFileId: state.activeFileId === id ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].fileId : null) : state.activeFileId
    };
  }),

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

  toggleTerminal: () => set((state) => ({
    terminalState: { ...state.terminalState, isOpen: !state.terminalState.isOpen }
  })),

  addTerminalHistory: (command, output) => set((state) => ({
    terminalState: {
      ...state.terminalState,
      history: [...state.terminalState.history, { command, output }]
    }
  })),

  clearTerminal: () => set((state) => ({
    terminalState: { ...state.terminalState, history: [] }
  })),

  setCommandPaletteOpen: (isOpen) => set({ commandPalette: { isOpen } }),

  addNotification: (notif) => set((state) => ({
    notifications: [...state.notifications, { ...notif, id: `notif-${Date.now()}`, timestamp: Date.now() }]
  })),

  dismissNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  toggleEditorSplit: () => set((state) => {
    if (state.editorSplit) {
      // Merging back to one pane
      return {
        editorSplit: false,
        openedTabs: state.openedTabs.map(t => ({ ...t, pane: 'left' }))
      };
    }
    return { editorSplit: true };
  }),

  reorderTabs: (tabs) => set({ openedTabs: tabs }),

  hydrateVFS: async () => {
    if (get().vfsLoading) return;
    set({ vfsLoading: true, vfsError: null });
    try {
      const tree = await fetchWorkspaceTree();
      const files = getAllFiles(tree);
      set({
        workspaceTree: tree,
        workspaceFiles: files,
        vfsLoaded: true,
        vfsLoading: false,
        vfsError: null,
      });
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
        return {
          workspaceFiles: state.workspaceFiles.map(f => f.id === id ? result.file : f),
          draftContent: remainingDrafts,
          savingState: { ...state.savingState, [id]: 'success' },
        };
      });
    } else {
      set((state) => ({
        savingState: { ...state.savingState, [id]: 'error' },
      }));
    }
  },
}));
