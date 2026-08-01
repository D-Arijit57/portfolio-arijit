# Current State

## Folder Structure
```
/src
  /components
    /activity-bar   # Leftmost icon bar
    /command-palette# cmdk-based global search overlay
    /editor         # Tab management, split panes, Shiki editor
    /explorer       # File tree navigation
    /notifications  # Toast notification system
    /shell          # Main layout wrapper (VSCodeShell)
    /status-bar     # Bottom status information
    /terminal       # Interactive command line interface
  /content
    fileSystem.ts   # Static mock of the virtual file system
  /graph            # Generic Knowledge Graph engine (Sprint 11) — no
                     # "skills"-specific code; skills.graph is its first
                     # tenant. types/loader/fileMatch/registry (M1),
                     # builder (M2), radialLayout (M3), and the physics
                     # simulation (graph/motion/valueNoise.ts, driving
                     # hooks/useGraphSimulation.ts) all shipped. Search
                     # and category filters not yet built (see
                     # ARCHITECTURE.md's "Knowledge Graph Renderer"
                     # section for the full milestone status).
  /components/graph # KnowledgeGraphScene/GraphNode/GraphEdgeLine/
                     # GraphBackground/InspectorPanel.tsx — the real
                     # renderer, physics-driven motion, and a data-driven
                     # Inspector Panel (Milestone 6), all shipped.
  /hooks
    useRouterSync.ts# Synchronizes Zustand state with browser URL history
  /lib
    utils.ts        # Shared utilities (e.g., cn for Tailwind)
  /store
    useStore.ts     # Global Zustand state manager
  /types
    index.ts        # TypeScript interfaces and types
  App.tsx           # Entry point
  index.css         # Global styles and Tailwind directives
  main.tsx          # React DOM mounting
```

## Existing Components
- **VSCodeShell**: The overarching grid layout orchestrating all sub-panes.
- **Explorer**: A recursive file tree renderer for `VirtualFolder` and `VirtualFile`.
- **EditorArea / SplitEditorArea**: Manages active files, multiple tabs, and side-by-side split view.
- **EditorTabs**: Draggable, closable tab bar with active state indicators and dirty state dots.
- **ShikiEditor**: A functional text editor with syntax highlighting provided by Shiki.
- **Terminal**: A mock terminal processing basic commands (`ls`, `cat`, `open`, `clear`, `help`).
- **CommandPalette**: A global search modal triggered by `Cmd+K` for files and commands.
- **Breadcrumbs**: Path indicator in the editor header based on the active file.

## Existing Functionality
- **Virtual File System**: Browsing, opening, and viewing a predefined tree of files.
- **Routing**: Deep linking (e.g., `/journey/about`) synchronized perfectly with the active editor tab.
- **State Management**: Complex UI states (split panes, terminal visibility, explorer toggle, open tabs) handled globally via Zustand.
- **Tab Reordering**: Drag-and-drop tab organization using Framer Motion.
- **Editor Editing**: Files can be typed into, highlighting updates via Shiki, and a dirty (unsaved) indicator appears.

## Completed Features
- Full VS Code UI replica (dark mode).
- Centralized workspace store (`useStore.ts`).
- URL synchronization logic without page reloads.
- Syntax highlighted code editing.
- Split-pane editor layout.

## Missing Functionality
- **Data Persistence**: Changes to files are lost on reload.
- **Backend Sync**: The file system is entirely hardcoded in `src/content/fileSystem.ts`.
- **Advanced Terminal**: Terminal cannot execute complex scripts, track state properly, or communicate with a server.
- **Live Data**: Notifications and status bar metrics are currently hardcoded or static.

## Technical Debt
- **Tight Coupling to Static Data**: Features like `WorkHistoryViewer` use hardcoded line logic and data mapping instead of dynamic parsing.
- **Monolithic Store**: `useStore.ts` handles *everything* (UI state, file state, terminal state). It may need splitting if complexity grows.
- **Mock File System**: `fileSystem.ts` acts as a mock database, making the app strictly frontend-only for now.

## Current Frontend Architecture
The app follows a unidirectional data flow powered by **Zustand**. 
- Interactions (clicks, terminal commands) trigger Zustand actions.
- Zustand updates the global state.
- Components re-render based on state selectors.
- `useRouterSync` acts as a side-effect listener, mapping URL changes to Zustand `openFile` actions, and conversely pushing URL state when `activeFileId` changes.

## Immediate Next Steps
- Transition `src/content/fileSystem.ts` into a data-fetching layer communicating with a backend API.
- Re-route terminal command processing to a backend endpoint.
- Integrate real-time APIs for GitHub/LeetCode data injection.
- **Sprint 11 (Knowledge Graph), Milestone 7 (Search)**: next per the explicit roadmap order (Inspector Panel -> Node Selection -> Hover States -> Search -> Category Filters -> Advanced Physics Polish). Milestones 1-6 (registry/routing/loader, Graph Builder, Layout Engine, Renderer, Interaction & Motion Layer incl. a same-day physics-simulation rewrite, Inspector Panel) all shipped 2026-08-01; the renderer/layout/physics/visual baseline is now explicitly frozen — a dedicated Visual Polish sprint happens only after every remaining interaction milestone is implemented. See ARCHITECTURE.md's "Knowledge Graph Renderer" section (particularly §12.11's revision note) for the full status.

## Known Limitations (Sprint 11, Milestone 6)
- Search and category filters are not built yet — the only ways to navigate `skills.graph` today are the graph's own layout, hover/selection, and the Inspector Panel's clickable related/prerequisite/category-children chips.
- A known layout-level node/label proximity issue (`langchain`/`vercel`, ~34 world units apart) makes `langchain` unreliable to hover/drag at its exact circle center — reported, not fixed, since the Layout Engine is frozen (see ARCHITECTURE.md §11.4/§12.8).
- `server/types/vfs.types.ts`'s `FILE_TYPES` runtime array and the `FileType` TS union are two hand-maintained sources of truth that don't derive from each other — adding a new `FileType` value requires updating both, and only one is caught by `tsc`. This bit Milestone 1's own backend startup once; noted here so it isn't hit again by future work rather than only living in ARCHITECTURE.md's history.
