# Architecture

## Component Hierarchy
```text
App
 └── VSCodeShell
      ├── ActivityBar (Left Rail)
      ├── Explorer (Sidebar)
      ├── Main Content Area
      │    ├── EditorArea (or SplitEditorArea)
      │    │    ├── EditorTabs
      │    │    ├── Breadcrumbs
      │    │    └── EditorRenderer
      │    │         ├── ShikiEditor
      │    │         ├── WorkHistoryViewer
      │    │         └── MermaidViewer
      │    └── Terminal (Bottom Panel)
      ├── StatusBar (Footer)
      ├── CommandPalette (Modal Overlay)
      └── Notifications (Toast Overlay)
```

## Data Flow
- **State Ownership**: All core state is held in `useStore` (Zustand).
- **Mutations**: Components dispatch actions (e.g., `openFile('readme')`).
- **Reactions**: 
  - Subscribed components re-render automatically.
  - The `useRouterSync` hook observes `activeFileId` and updates the browser URL.
- **Terminal Execution**: The `<Terminal />` component currently processes strings locally and updates the `terminalState.history` in the store.

## Reusable Systems
- **Virtual File System (VFS)**: Defines a strict schema (`VirtualFile`, `VirtualFolder`) ensuring any UI component can safely traverse or render files.
- **ShikiEditor**: A reusable, syntax-highlighted editor component wrapping `react-simple-code-editor` and `shiki`.
- **Router Sync**: `resolveUrlPathToFile` maps string URLs back to VFS nodes.

## Shared Utilities
- `cn` (`clsx` + `tailwind-merge`): Resolves Tailwind class conflicts safely.
- Type definitions (`src/types/index.ts`): Enforces shapes for tabs, files, and notifications.

## Existing Patterns
- **Early Returns for Visibility**: Components like `Explorer`, `Terminal`, and `CommandPalette` check their `isOpen` state and return `null` immediately if closed, keeping the DOM clean.
- **Pane-Aware Rendering**: The EditorArea passes a `pane="left" | "right"` prop down to tabs and renderers to support split views easily.
- **Extension-based Rendering**: `EditorRenderer` switches the mounted component based on file ID or type (e.g., custom renderers for `work_history` or `.mmd` files).

## Weaknesses
- **Monolithic State**: The Zustand store is becoming large. Combining UI transient state (isCommandPaletteOpen) with persistent domain state (fileContents, terminalHistory) might cause unnecessary re-renders.
- **Hardcoded Path Resolution**: The `useRouterSync` hook has hardcoded fallback rules (e.g., stripping `/profile.md` to `/about`). This breaks if the file system changes.

## Extension Points
- **VFS Source**: The `allFiles` export in `fileSystem.ts` can easily be swapped with an asynchronous fetch to a database.
- **Terminal Parsing**: The `handleCommand` switch statement in `Terminal.tsx` can be replaced with an HTTP call to a backend shell emulator.
- **Custom Renderers**: `EditorRenderer.tsx` is designed to easily accept new custom React components for specific file extensions.

## Backend Integration Points
1. **File Fetching**: Replace the static `fileSystem` object with an initialization fetch on app load.
2. **Terminal API**: Send raw string input to `/api/terminal/execute` and append the response to history.
3. **Notification Webhooks/Polling**: Fetch real data for GitHub/LeetCode streaks to populate the `notifications` array.
4. **Search API**: Command palette file searching could be offloaded to the backend if the file tree becomes massive.
