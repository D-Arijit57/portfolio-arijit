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
                     # builder (M2), radialLayout (M3), the physics
                     # simulation (graph/motion/valueNoise.ts, driving
                     # hooks/useGraphSimulation.ts — as of M10 a real
                     # force-directed network: continuous link + capped
                     # many-body repulsion + centroid centering, with NO
                     # per-node anchor spring, so the graph deforms and
                     # STAYS deformed), the construction schedule
                     # (graph/motion/revealSchedule.ts, M10), and the
                     # Interaction Resolver (graph/interaction/{types,
                     # interactionResolver}.ts — pure, no React; single
                     # source of truth for node/edge visual state, M7)
                     # all shipped. Search and category filters not yet
                     # built (see ARCHITECTURE.md's "Knowledge Graph
                     # Renderer" section for the full milestone status).
  /components/graph # KnowledgeGraphScene/GraphNode/GraphEdgeLine/
                     # GraphBackground/InspectorPanel.tsx — the real
                     # renderer, an "Obsidian-feel" physics-driven motion
                     # engine (M8: critical damping, cluster-distance-
                     # decay, camera pan inertia + eased wheel-zoom), a
                     # data-driven Inspector Panel (M6), and hover/focus/
                     # selection driven entirely by the Interaction
                     # Resolver (M7), all shipped. GraphNode/GraphEdgeLine
                     # are React.memo'd with per-node-id cached handlers
                     # — a hover change only re-renders the nodes/edges
                     # whose own resolved state actually changed.
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
- **Sprint 11 (Knowledge Graph), Search + Category Filters**: the remaining unbuilt roadmap items. Milestone 10 (Graph Lifecycle & True Elastic Physics — construction animation, the anchor-spring removal, hard-pin/momentum correction, idle desynchronization, camera fit correction, bloom reduction) shipped 2026-08-02; see ARCHITECTURE.md §16. Two latent pre-existing bugs were found and fixed during it: drag ignored the SVG `viewBox` scale (nodes tracked the cursor at ~half speed), and the camera fit was double-transformed (the graph was clipped off the top edge). Original roadmap note follows.
- **Sprint 11 (Knowledge Graph), Milestone 9 (Search)**: next per the explicit roadmap order (Inspector Panel -> Node Selection -> Hover States -> Search -> Category Filters -> Advanced Physics Polish — Milestone 8 addressed motion/physics quality ahead of the "Advanced Physics Polish" slot, per explicit instruction, so that item may already be substantially satisfied by the time it's formally reached). Milestones 1-8 (registry/routing/loader, Graph Builder, Layout Engine, Renderer, Interaction & Motion Layer, Inspector Panel, a dedicated Interaction Resolver, and an "Obsidian-feel" critically-damped physics/camera motion engine) all shipped 2026-08-01; the renderer/layout/topology/spacing/color/Inspector-Panel/Interaction-Resolver baseline remains explicitly frozen. See ARCHITECTURE.md's "Knowledge Graph Renderer" section (particularly §15's own notes) for the full status.

## Known Limitations (Sprint 11, Milestone 10)
- The graph's resting positions are **no longer pixel-identical** to `radialLayout`'s output. M10 removed the per-node anchor spring (it was the direct cause of the "chewing gum on invisible nails" snap-back), so the network now relaxes into its own force equilibrium — nodes settle up to ~150 world units from their layout coordinates (mean ~50), and the graph sits ~7% roomier. This is inherent to the correction, was approved before implementation, and is documented in ARCHITECTURE.md §16.1.
- Parity with Obsidian is **not** claimed. Deformation, drag, momentum handoff and settling are genuinely force-driven; Barnes-Hut, Web Worker offload, WebGL, node sizing by backlink count, edge arrows, label fade, and user-facing physics sliders are all absent. At 44 nodes none are needed — but this is an Obsidian-*equivalent* interaction model at small scale, not a reimplementation of its renderer.
- The graph is roughly square while its editor panel is wide and short, so a no-clipping fit leaves substantial left/right margin. Filling the width would crop the height.
- Existing Playwright regression scripts that probe hover/selection ~1.5s after opening `skills.graph` now land **mid-construction** (the reveal runs ~1.6s) and will report every node at full opacity. That is a stale timing assumption in the tests, not a regression — probes must wait for the reveal plus the force settle (~7s) before reading resolved visual state.

## Known Limitations (Sprint 11, Milestone 8)
- Search and category filters are not built yet — the only ways to navigate `skills.graph` today are the graph's own layout, hover/selection/keyboard-focus, dragging, and the Inspector Panel's clickable related/prerequisite/category-children chips.
- Keyboard focus produces the same visual state as hover (Tab reaches a node, `outline: none` + the resolved state substitutes for a native focus ring), but `Tab` order is plain DOM order (not graph-aware) and `Enter`/`Space` don't yet trigger selection — genuine graph-aware keyboard navigation is deferred to a later milestone.
- A known layout-level node/label proximity issue (`langchain`/`vercel`, ~34 world units apart) makes `langchain` unreliable to hover/drag at its exact circle center — reported, not fixed, since the Layout Engine is frozen (see ARCHITECTURE.md §11.4/§12.8).
- `server/types/vfs.types.ts`'s `FILE_TYPES` runtime array and the `FileType` TS union are two hand-maintained sources of truth that don't derive from each other — adding a new `FileType` value requires updating both, and only one is caught by `tsc`. This bit Milestone 1's own backend startup once; noted here so it isn't hit again by future work rather than only living in ARCHITECTURE.md's history.
