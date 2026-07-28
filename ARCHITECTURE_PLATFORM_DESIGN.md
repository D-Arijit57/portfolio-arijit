# Architecture Platform — Frozen Design

## Status

**Frozen as of 2026-07-25.** This document is the canonical domain-model and rendering-pipeline specification for the Architecture Platform: the reusable engine behind every per-project architecture view (Mermaid source, Interactive Canvas today; Sequence/Deployment/Runtime/Dependency views in the future). It supersedes the current `MermaidViewer.tsx`, which is a hardcoded mockup, not a real renderer.

This earns a standalone document rather than an `ARCHITECTURE.md` section — the usual home for new subsystems in this project — because, per the user's explicit direction, it introduces a new domain model, a pluggable multi-renderer pipeline, and a synchronization strategy comparable in scope to the VFS and Terminal, and is expected to become the reference point as further architecture-related views are added. Design only; no code is written yet. Implementation begins only after this document is signed off.

No code is defined here. Interface and method descriptions are contracts to implement against, not implementations.

**Revision note (2026-07-25, Phase 1 implementation)**: Phase 1 (§13) built the data layer, category registry, Architecture Registry, Cortexa's canonical model, and the Mermaid renderer — no code changes to §1–§15's frozen decisions were required. Two documentation refinements were added based on what implementation surfaced: §6.1 and §5 now state explicitly why `workspaceSeed.ts` calls `modelToMermaid()` directly rather than through the registry (an authoring-time/runtime distinction implicit in the original text but not stated outright), and §9 now notes a real duplication site — `server/repositories/seed/workspaceSeed.ts` — discovered during implementation, not mentioned in §1's original grounding. Neither changes any frozen contract; both are clarifications of what was already true. Re-frozen as of 2026-07-25.

**Revision note (2026-07-29, Portfolio Polish Sprint)**: §9's pane-aware split (raw Mermaid source in the left `ShikiEditor`, Architecture Canvas in the right pane) is superseded. Per the sprint brief, a portfolio visitor must never see raw Mermaid source — `architecture.mmd` is now a dedicated full-screen visualization: `EditorRenderer.tsx` renders the Architecture Canvas for `file.type === 'mermaid'` in *every* pane, and `useStore.ts`'s `openFile()` no longer self-mirrors it into a permanent dual-pane split (that behavior is now exclusive to manifest.json, which still pairs with its project's architecture.mmd). Opening `architecture.mmd` alone takes the full editor area; opening it while another file is open splits beside that file (mirroring `openToSide()`'s placement) instead of replacing it. The tab keeps its `architecture.mmd` title, Mermaid icon, and breadcrumb (`EditorTabs.tsx`/`Breadcrumbs.tsx` are unaffected — both are generic on `file.type`/`file.path`, not on how the active pane renders the file). No change to the renderer itself (§6.2), the domain model, or the toolbar/zoom/mode controls — only to which pane(s) show it and what those panes render. Re-frozen as of 2026-07-29.

## Non-Goals

The Architecture Platform is explicitly not intended to become:

- a draw.io replacement
- a Mermaid editor
- a collaborative architecture tool
- a general-purpose diagram editor

Its purpose is to help visitors understand the design of projects through interactive visualizations generated from a structured architecture model. Every design decision in this document — the model being hand-authored data rather than freeform-editable diagram state (§3, §7), the deliberately narrow synchronization mechanism (§7), the absence of collaborative or multi-user concerns anywhere in this document — follows from this scope. Features that belong to a diagram editor (freehand node placement, drag-to-reposition persisted back to the model, multi-user cursors, arbitrary shape/connector editing) are out of scope by design, not deferred technical debt.

---

## 1. Grounding — What Exists Today

- `src/components/editor/MermaidViewer.tsx` is not a renderer: it prints the raw `.mmd` text, then a **static hardcoded string** below it that never reflects file content. There is no `mermaid`, `reactflow`, `dagre`, or `d3` dependency in `package.json`, and no `src/architecture/` module exists — this is greenfield.
- `EditorRenderer.tsx` dispatches purely on `file.type === 'mermaid'`; the `pane` prop is unused for this branch, so a split view would render the identical fake preview in both panes.
- Exactly one project (`Cortexa`, `src/content/workspaceSeed.ts`) has an `architecture.mmd`, hand-written as raw Mermaid syntax with no structured metadata behind it (no category, technology, description, dependencies, tradeoffs, status).
- Nothing in the codebase today resolves "which project's architecture is this" from an open file — that resolution mechanism doesn't exist and is part of what this document specifies (§5).

## 2. Platform Layers

```
ArchitectureModel (per project, typed data — the source of truth)
       │
       ▼
Category Registry              — category → { icon, accentColor, style }, shared across every renderer
       │
       ▼
Architecture Registry          — resolves "current project" → its ArchitectureModel (the Provider abstraction, §5)
       │
       ▼
Renderers                      — pure functions/components: ArchitectureModel → output
       ├── modelToMermaid(model): string        (generates architecture.mmd's text)
       ├── ArchitectureCanvas                    (interactive React canvas — this sprint)
       └── (future) sequenceRenderer, deploymentRenderer, runtimeRenderer, dependencyRenderer
       │
       ▼
Sync Layer                     — id-token resolution shared by every hover/select-capable renderer (§7)
```

Mermaid and the Interactive Canvas are the first two renderers, not the platform itself. Nothing about the Model, Category Registry, or Architecture Registry is Mermaid-aware or Canvas-aware — this is what lets future renderers plug in without touching them (§12).

## 3. Domain Model

```ts
// src/architecture/types.ts

export type ArchitectureCategory =
  | 'client' | 'frontend' | 'gateway' | 'backend' | 'ai' | 'auth'
  | 'queue' | 'database' | 'infrastructure' | 'storage' | 'messaging' | 'external';

export type NodeStatus = 'active' | 'planned' | 'deprecated';

export interface ArchitectureNode {
  id: string;                      // stable, unique within a project; also the Mermaid node identifier (§6, §7)
  title: string;
  category: ArchitectureCategory;
  technology?: string;
  description?: string;
  responsibilities?: string[];
  dependencies?: string[];         // node ids; informational — edges (below) are the render-authoritative relationships
  status?: NodeStatus;
  icon?: string;                   // optional override of the category's default icon (lucide-react icon name)
  documentation?: string;          // free-form link or path
  runtime?: string;
  deployment?: string;
  tradeoffs?: string;
}

export interface ArchitectureEdge {
  from: string;                    // ArchitectureNode.id
  to: string;                      // ArchitectureNode.id
  label?: string;
  kind?: 'sync' | 'async' | 'data';
}

export interface ArchitectureModel {
  projectKey: string;              // matches the registry key (§5) — carried on the model itself for self-description
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}
```

`dependencies` (on the node) and `edges` (on the model) are deliberately both present but not redundant: `edges` is what every renderer draws; `dependencies` is descriptive metadata for a node's detail panel (§9) that may reference something not worth drawing as a full edge. A renderer never needs to reconcile them — it only ever reads `edges`.

## 4. Semantic Categories

```ts
// src/architecture/categories.ts

export interface CategoryStyle {
  icon: string;          // lucide-react icon name
  accentColor: string;   // hex, used by every renderer that supports color
}

export const CATEGORY_STYLES: Record<ArchitectureCategory, CategoryStyle> = {
  client:         { icon: 'Monitor',       accentColor: '#569cd6' },
  frontend:       { icon: 'LayoutPanelLeft', accentColor: '#4ec9b0' },
  gateway:        { icon: 'Waypoints',     accentColor: '#c586c0' },
  backend:        { icon: 'Server',        accentColor: '#dcdcaa' },
  ai:             { icon: 'BrainCircuit',  accentColor: '#ff3670' },
  auth:           { icon: 'ShieldCheck',   accentColor: '#ce9178' },
  queue:          { icon: 'ListOrdered',   accentColor: '#d7ba7d' },
  database:       { icon: 'Database',      accentColor: '#569cd6' },
  infrastructure: { icon: 'Cloud',         accentColor: '#9cdcfe' },
  storage:        { icon: 'HardDrive',     accentColor: '#b5cea8' },
  messaging:      { icon: 'MessagesSquare', accentColor: '#d7ba7d' },
  external:       { icon: 'ExternalLink',  accentColor: '#858585' },
};
```

A node with a category not in this table is a TypeScript compile error, not a runtime concern — `ArchitectureCategory` is a closed union, so "unknown category" (§11) only ever arises from a bug, never from valid project data. Every renderer looks up styling through this table and never hardcodes a color/icon per project or per node — this is the whole point of "semantic, not project-specific" styling.

## 5. Architecture Registry — the Provider Abstraction

This is the refinement the user asked for explicitly: **no renderer imports a concrete project's model directly.** Every renderer resolves "the current model" through one small registry module.

```ts
// src/architecture/registry.ts

const models = new Map<string, ArchitectureModel>();

export function registerArchitecture(model: ArchitectureModel): void {
  models.set(model.projectKey, model);
}

export function getArchitectureModel(projectKey: string): ArchitectureModel | undefined {
  return models.get(projectKey);
}

export function projectKeyFromPath(path: string): string | undefined {
  const match = /^\/projects\/([^/]+)\//.exec(path);
  return match ? match[1].toLowerCase() : undefined;
}
```

Each project's data module self-registers on import:

```ts
// src/content/architecture/cortexa.ts
export const cortexaArchitecture: ArchitectureModel = { projectKey: 'cortexa', nodes: [...], edges: [...] };
registerArchitecture(cortexaArchitecture);
```

`workspaceSeed.ts` imports `cortexaArchitecture` (to generate `architecture.mmd`'s content via `modelToMermaid`, §6) — this import is also what guarantees registration has happened before the app renders anything, since `workspaceSeed.ts` runs at module load, before hydration. **This ordering constraint is real and worth stating plainly**: any project's architecture module must be imported by something that runs before its first render, exactly the same "module load = registration" pattern this codebase already uses for the terminal command registry and the search index cache — not a new kind of fragility, but worth not silently assuming.

`ArchitectureCanvas` (and every future renderer) resolves its model like this, and only this:

```ts
const projectKey = projectKeyFromPath(openFile.path);
const model = projectKey ? getArchitectureModel(projectKey) : undefined;
```

If `model` is `undefined` — wrong path shape, or a project with no registered architecture — the renderer shows an explicit "no architecture model for this project" state (§11), never a crash and never a fallback to some default project's data.

**Why a registry instead of a switch statement or a prop drilled down from `EditorRenderer`**: a switch on `projectKey` inside the Canvas would need editing every time a project is added, which is exactly the coupling this whole document exists to remove (§15 covers this rejection explicitly). The registry keeps `ArchitectureCanvas` at zero project-specific lines of code, permanently.

**Authoring-time generation vs. runtime resolution (clarified during Phase 1 implementation)**: the registry exists to resolve *the current project* at *runtime* — a question only a renderer running inside the live app needs to ask, because it doesn't know in advance which file is open. `workspaceSeed.ts` is not in that position: it is the one place that already knows, by construction, exactly which model produces which file's content (`modelToMermaid(cortexaArchitecture)`, §6.1). Calling the registry there would mean registering a model solely so the same module could immediately look its own import back up by string key — a detour, not a use of the abstraction. This is why §6.1's Mermaid generation calls `modelToMermaid()` directly on the imported model, while `ArchitectureCanvas` and every future renderer (§6.3) resolve through `getArchitectureModel()`/`projectKeyFromPath()` and never import a concrete project's model at all. The distinction is what "the current project" means: fixed and known at authoring/build time for generation, discovered at runtime for rendering.

## 6. Renderers

### 6.1 Mermaid Renderer

```ts
// src/architecture/renderers/mermaidRenderer.ts
export function modelToMermaid(model: ArchitectureModel): string;
```

Pure function: walks `model.nodes` to emit one Mermaid node definition per node (using `node.id` as the literal Mermaid identifier — this is what makes §7's sync mechanism free), then `model.edges` as Mermaid edge lines, then a `classDef`/`class` block per category using `CATEGORY_STYLES[category].accentColor` so Mermaid's own coloring matches the Canvas's. Its output becomes `architecture.mmd`'s static `content` string in `workspaceSeed.ts`, computed by calling `modelToMermaid(cortexaArchitecture)` directly on the imported model — an authoring-time call, not a runtime lookup through the registry (§5 explains why this is not an inconsistency). The left editor keeps showing ordinary, valid, hand-readable Mermaid text — nothing about the editing experience changes.

**Implementation note (Phase 1)**: this codebase has a second, literal duplicate of every seed file's content in `server/repositories/seed/workspaceSeed.ts` (the backend can't import from `src/` — the same convention already governing `RESUME_MARKDOWN`). §9 documents this for `architecture.mmd` specifically, since §1's original grounding didn't mention it.

### 6.2 Interactive Canvas

`ArchitectureCanvas` (React component, `src/components/architecture/ArchitectureCanvas.tsx`) resolves its model via the registry (§5) and renders nodes/edges directly from `model.nodes`/`model.edges` — it never touches Mermaid syntax. Responsibilities: pan/zoom/fit-to-screen/reset, category-driven node styling (§4), hover-highlight-connected/soften-unrelated, click-to-select contextual popover (not a permanent sidebar, per the brief's "remove static UI" requirement).

### 6.3 Future Renderer Contract

Any future renderer is a function or component with the same shape: `(model: ArchitectureModel) => output`. It resolves its model via the same registry (§5), styles nodes via the same category table (§4), and requires zero change to `types.ts`, `categories.ts`, or `registry.ts`. §12 evaluates four concrete future renderers against this contract.

## 7. Synchronization

Hover/select needs to stay connected between the raw Mermaid text (left) and the Canvas (right) without building a full Mermaid grammar parser — rejected in §15 as over-engineered for this project's scale, the same reasoning this codebase already used to reject a real inverted index for Search.

Because `modelToMermaid` (§6.1) always emits each node's canonical `id` as the leading token of its definition line, resolution is a one-line lookup, not a parse:

```ts
// src/architecture/sync.ts
export function nodeIdFromMermaidLine(line: string): string | undefined;
```

- **Editor → Canvas**: the editor's cursor-line changes → `nodeIdFromMermaidLine(currentLine)` → if it resolves, dispatch to the store (below); the Canvas highlights that node.
- **Canvas → Editor**: hovering/selecting a node dispatches the node's `id` to the same store field; the editor (optionally, future polish) can scroll-to/underline the matching line.

**Ownership of the transient hover/select state**: this is cross-component session state (Editor and Canvas both read and write it), which this codebase's own precedent (search/terminal/notification state) always puts in the Zustand store, never component-local React state — a new `architectureState: { hoveredNodeId: string | null; selectedNodeId: string | null }` slice, with `setHoveredArchitectureNode`/`setSelectedArchitectureNode` actions. `nodeIdFromMermaidLine` itself stays a pure function with no store/React import, mirroring `searchEngine.ts`'s and `notificationQueue.ts`'s separation of pure logic from reactive mirror.

**Explicit scope cut, stated rather than silently implied**: this resolves hover/select sync, not full bidirectional editing. Typing a structural edit into the raw Mermaid text (adding a node, renaming an id) does not re-derive a new `ArchitectureModel` — the model remains the hand-authored source of truth in `src/content/architecture/<project>.ts`. Free-form text edits can desync the `.mmd` file from the model until the project data is updated to match. This is a deliberate, flagged limitation, not an oversight (§14).

## 8. Ownership

| Concern | Owner | Notes |
|---|---|---|
| `ArchitectureModel` data (per project) | `src/content/architecture/<project>.ts` | Hardcoded, like every other VFS content in this codebase today — no backend exists yet. Immutable at runtime; nothing mutates it. |
| Category styling | `src/architecture/categories.ts` | Pure lookup table, one row per category, zero project-specific entries. |
| Model resolution | `src/architecture/registry.ts` | The only place "which project" is resolved. Renderers are consumers, never construct or mutate a model. |
| Generated Mermaid text | `mermaidRenderer.ts`'s pure output, embedded once into `workspaceSeed.ts` | Same category as any other static `VirtualFile.content` — authored once, not regenerated at runtime. |
| Hover/select state | `store.architectureState` | Reactive mirror both Editor and Canvas read/write, exactly as `searchState`/`terminalState`/`notificationState` already work in this codebase. |
| Line→id resolution logic | `src/architecture/sync.ts` | Pure function, no React/Zustand import — same layering `searchEngine.ts` and `notificationQueue.ts` already establish. |
| Canvas layout/rendering | `ArchitectureCanvas.tsx` | Pure consumer of model + category styles + `architectureState`; owns pan/zoom/animation, nothing else. |

No concern above has two owners.

## 9. Workspace Integration

**Superseded by the 2026-07-29 revision note above.** As originally written, this section had `EditorRenderer.tsx` become pane-aware for `.mmd` files: left pane rendering the existing `ShikiEditor` (raw source), right pane rendering `ArchitectureCanvas`. The Portfolio Polish Sprint replaced that with a single rule — every pane renders `ArchitectureCanvas` for `file.type === 'mermaid'`, full stop, so a portfolio visitor never sees raw Mermaid source. This still replaces `MermaidViewer.tsx` entirely; nothing else in `EditorRenderer` changes for other file types.

Per-project file layout stays exactly what the brief specifies:

```
projects/
  cortexa/
    architecture.mmd   — generated text (§6.1), what the left editor shows
    README.md
```

`ArchitectureModel` data itself is not a VFS-visible file (no `architecture.json` node in the Explorer tree) — it lives in `src/content/architecture/cortexa.ts`, the same place every other piece of this app's hardcoded content lives (`workspaceSeed.ts` itself is the "database" stand-in). Making it a VFS file would require either a JSON-in-VFS parsing path with no current precedent, or a second editable-and-must-stay-valid text format live in the Explorer — neither is required by the brief's actual requirement ("adding a node should require updating project data only"), which is satisfied by editing a TypeScript file, same as everywhere else in this repo.

**Backend seed duplication (discovered during Phase 1 implementation, not in §1's original grounding)**: `server/repositories/seed/workspaceSeed.ts` holds a second, literal copy of every seed file's content, including `architecture.mmd` — the backend can't import from `src/`, so it can't call `modelToMermaid()` itself. This is not a new problem this platform introduces; it's the same duplication convention already governing `RESUME_MARKDOWN` in both seed files. The generated Mermaid string is pasted into the backend seed by hand, with a comment pointing back to `cortexa.ts` as the canonical source, and must be updated there whenever `cortexaArchitecture` changes — otherwise `hydrateVFS()` would silently revert `architecture.mmd` to stale text once the backend seed replaces the pre-hydration one. No architectural decision changes because of this; it's a maintenance note for whoever edits a project's `ArchitectureModel` next.

## 10. Performance

- Each project's `ArchitectureModel` is a plain, immutable object, constructed once at module load — never recreated per render.
- `ArchitectureCanvas`'s node/edge layout is memoized (`useMemo`) keyed on the model reference, so it is computed once per project, not per render.
- Hover/select only changes a *highlight set* (which nodes/edges are dimmed vs. emphasized) — a separate, cheap memoization keyed on `(model, hoveredNodeId)`, deliberately kept independent from layout so hovering never triggers a full graph relayout. This is the concrete mechanism behind the brief's "avoid rebuilding the entire graph unnecessarily."

## 11. Failure Handling

| Case | Handling |
|---|---|
| No project resolved from path (`projectKeyFromPath` returns `undefined`) | Canvas renders an explicit "no architecture model for this file" state — not a crash, not a fallback to another project's data. |
| Project resolved but nothing registered under that key | Same explicit empty state — distinguishable in dev from the above (logged), identical to the user. |
| Edge references a node id not present in `model.nodes` | Renderer filters the dangling edge defensively rather than throwing; flagged as a data-authoring bug, not a runtime failure mode to design around. |
| Unknown category | Not reachable at runtime — `ArchitectureCategory` is a closed TypeScript union (§4); this is a compile-time guarantee, not a handled runtime case. |
| Cursor line doesn't resolve to any node id (`nodeIdFromMermaidLine` returns `undefined`) | No highlight change — same as "nothing hovered." Not an error. |

## 12. Future Extensibility

Evaluating the four future views the brief names against the platform built above:

| Future renderer | Fits current contract without redesign? |
|---|---|
| Sequence View | Yes — reads `model.nodes`/`model.edges` (edge `kind: 'sync' \| 'async'` already carries the distinction a sequence diagram needs for solid vs. dashed arrows); resolves its model via the same registry. |
| Deployment View | Yes — reads `node.deployment`/`node.runtime`, already reserved fields on `ArchitectureNode` (§3), unused by Mermaid/Canvas today but present for exactly this future consumer. |
| Runtime Flow | Yes — same node/edge graph, animated as a trace rather than a static layout; no new data needed beyond what §3 already models. |
| Dependency Graph | Yes — `edges` already is a dependency graph; this is arguably the same renderer as the Canvas with a different layout algorithm, not a new data requirement at all. |

No candidate above requires a change to `types.ts`, `categories.ts`, or `registry.ts` — every one is "a new renderer function/component consuming the same `ArchitectureModel`," which is the concrete proof the four-layer split (§2) delivers the "future-proof data model" the brief asks for.

## 13. Implementation Plan (phased, matching this project's incremental-delivery convention)

1. **Data layer** — `src/architecture/types.ts`, `categories.ts`, `registry.ts`. No visible UI change.
2. **Model → Mermaid pipeline** — author `cortexaArchitecture` in `src/content/architecture/cortexa.ts`, generate `architecture.mmd`'s content via `modelToMermaid`; output should render identically to today's hand-written file.
3. **Real split rendering** — make `EditorRenderer` pane-aware for `.mmd` (left: `ShikiEditor`, right: `ArchitectureCanvas`), replacing `MermaidViewer.tsx`.
4. **Canvas interactivity** — pan/zoom/fit/reset, category-driven styling, hover-highlight/soften, click → contextual popover.
5. **Sync + polish** — `sync.ts`'s line→id resolution wired to `architectureState`, subtle grid, calm settle-state animation.
6. *(Later, separate sign-off)* — Sequence/Deployment/Runtime/Dependency renderers (§12); a second project (e.g. Atlas) as the real test of the registry generalizing past one instance, the same way `LeetCodeProvider` was the real test of the `ContentProvider` pattern generalizing past GitHub.

Each phase is reviewed before the next begins, per this project's existing working agreement.

## 14. Technical Debt (intentional, flagged now)

- No live bidirectional edit-to-model sync (§7) — structural edits to the raw Mermaid text do not regenerate `ArchitectureModel` data. Flagged, not silently implied as solved.
- No schema validation beyond TypeScript types on hand-authored `ArchitectureModel` data — consistent with the rest of this codebase's hardcoded-content convention, not a gap unique to this platform.
- The registry pattern (§5) is unproven past a single project (`cortexa`) until a second project is actually added — same posture `VFS_DESIGN.md` §11.6 and the LeetCode Provider section took toward `ContentProvider` before a second instance existed.
- `modelToMermaid`'s output is generated once, by hand-running it during authoring, not by an automated build step — acceptable at current scale, worth revisiting if projects (and their `.mmd` files) start changing frequently.

## 15. Alternative Designs Considered — and Rejected

| Alternative | Rejected because |
|---|---|
| Canvas imports each project's model directly (e.g. `import { cortexaArchitecture } from '...'`) | Exactly the coupling this document exists to remove — every new project would require a code change inside the Canvas. Replaced by the registry (§5), the user's explicit first refinement. |
| A `switch (projectKey)` inside `ArchitectureCanvas` | Same coupling as above in a different shape — still requires editing renderer code per project. |
| Full Mermaid grammar parser for source↔canvas sync | Over-engineered for this project's scale and explicitly rejected for the same reason this codebase's Search design rejected a real inverted index / Fuse.js — a line-token lookup (§7) is sufficient because the renderer controls the emitted format. |
| `architecture.json` as a VFS-visible file, parsed at runtime | No current precedent for JSON-as-editable-VFS-content parsed into a typed model at render time; the brief's actual requirement (data-only changes) is already satisfied by a hardcoded TS module, consistent with how every other piece of this app's content is authored. |
| Hover/select as component-local React state instead of store state | Cross-component sync (Editor and Canvas both need it) requires shared state — the same reasoning that already put terminal input and search query in the store rather than component state. |
| Building full bidirectional live-edit sync now | Explicitly out of scope for this phase; flagged as technical debt (§14) rather than either silently ignored or over-built before a second project even exists to stress-test the simpler version. |
| Treating this as an `ARCHITECTURE.md` section instead of a standalone document | Rejected per the user's explicit direction — this introduces a new domain model, rendering pipeline, sync strategy, and multi-view extensibility story on the same order as VFS/Terminal, not a subsystem validation or a narrow addition. |

---

## Sign-off

This freezes the Non-Goals scope boundary, the domain model (§3), the semantic category system (§4), the Architecture Registry as the sole *runtime* model-resolution mechanism (§5, clarified against §6.1's authoring-time generation call in the 2026-07-25 revision), the renderer contract and the two concrete renderers built against it (§6), the synchronization strategy and its explicit scope cut (§7), ownership (§8), workspace/file-layout integration including the backend seed duplication note (§9), performance strategy (§10), failure handling (§11), and the future-extensibility evaluation (§12).

**Phase 1 (§13) is complete and approved as of 2026-07-25**: the data layer, category registry, Architecture Registry, Cortexa's canonical model, and the Mermaid renderer are implemented exactly against §1–§15, with zero visible behavior change. Phase 2 begins only after its own scope is confirmed; each subsequent phase is reviewed before the next begins. Any deviation discovered during implementation comes back here for a documented update, not a silent drift.
