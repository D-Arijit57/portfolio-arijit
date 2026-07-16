import { VirtualFolder, VirtualFile } from '../types';
import { useStore } from '../store/useStore';

export { getAllFiles } from './workspaceSeed';

/**
 * Read facade over the hydrated Zustand store (VFS_DESIGN.md, BACKEND_BOOTSTRAP.md
 * "Ownership of Responsibilities"). Owns no state itself — `workspaceTree`/
 * `workspaceFiles` in useStore.ts are the single source of truth, seeded
 * statically until Sprint 3C wires hydrateVFS() into App.tsx.
 *
 * `fileSystem`/`allFiles` are `let`, not `const`, and reassigned via
 * store subscription so that existing importers — which read them as plain
 * module bindings, not through useStore() — see fresh data the moment the
 * store updates (ES module named exports are live bindings). This is what
 * lets Explorer and CommandPalette re-render with real data once hydration
 * runs, without either component changing how it imports or reads these
 * values.
 */
export let fileSystem: VirtualFolder = useStore.getState().workspaceTree;
export let allFiles: VirtualFile[] = useStore.getState().workspaceFiles;

useStore.subscribe((state) => {
  fileSystem = state.workspaceTree;
  allFiles = state.workspaceFiles;
});

export function getFileById(id: string): VirtualFile | undefined {
  return useStore.getState().workspaceFiles.find(f => f.id === id);
}

export function getFileByPath(path: string): VirtualFile | undefined {
  return useStore.getState().workspaceFiles.find(f => f.path === path);
}
