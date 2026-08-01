# Architecture

## Status

This document originated as the Phase 1 (frontend-only) architecture snapshot. `BACKEND_BOOTSTRAP.md` supersedes it on backend matters, and `VFS_DESIGN.md`/`TERMINAL_DESIGN.md` are the canonical, frozen specifications for the VFS and Terminal subsystems respectively — this file does not duplicate their detail.

**Decision (2026-07-19, Sprint 7A)**: rather than adding a new standalone design document per subsystem indefinitely, `ARCHITECTURE.md` is the intended home for subsystem documentation that doesn't rise to the level of an independent, deeply-detailed engine like the VFS or Terminal — starting with Global Search below. Deep, implementation-guiding documents remain reserved for foundational subsystems with their own internal domain models and pipelines.

**Revision note (2026-07-19, Sprint 8A)**: added a "LeetCode Provider" section validating that `VFS_DESIGN.md` §11's `ContentProvider` pattern generalizes to a second concrete provider with zero contract changes. Documented here rather than as a `VFS_DESIGN.md` edit, since no framework change was needed — see that section's §0 for why.

**Revision note (2026-07-19, Sprint 9A)**: added a "Notification Service" section, resolving the open question `BACKEND_BOOTSTRAP.md`'s Integration APIs section explicitly left for "whoever designs the Notification Engine." Design only — no code written.

**Revision note (2026-07-31, Sprint 11 Milestone 1)**: added a "Knowledge Graph Renderer" section — the first consumer of a new, deliberately generic Visualization Registry (`skills.graph`, with `resume.graph`/`projects.graph` as future tenants of the same registry entry, not new special cases). Milestone 1 only: registry, file routing, YAML loader, Graph Model, and placeholder rendering plumbing. Graph Builder, Layout Engine, Physics, and the real node/edge renderer are not built yet.

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
4. ~~**Search API**: Command palette file searching could be offloaded to the backend if the file tree becomes massive.~~ **Superseded (Sprint 7A)** — see [Global Search Subsystem](#global-search-subsystem) below. Content is fully hydrated client-side (`VFS_DESIGN.md` §9.1); a backend search API would add network latency for data already in memory, with no correctness benefit.

---

## Global Search Subsystem

**Status: Frozen as of 2026-07-19 (Sprint 7A). Design only — nothing in this section is implemented yet.**

### 0. Grounding — what already exists

- No dedicated search subsystem exists today. `src/components/command-palette/CommandPalette.tsx` comes closest: it renders every file from `allFiles` (the live-binding facade over `store.workspaceFiles`, `src/content/fileSystem.ts`) into a `cmdk` `Command.List`, and `cmdk`'s own internal fuzzy matcher filters by `Command.Item value={file.name}` as the user types into local `Command.Input` state. This matches only `name`, never `path` or `content`, and nothing about it is reusable by Explorer, Editor, or Terminal.
- `store.workspaceFiles: VirtualFile[]` (`src/store/useStore.ts`) is already a flat, fully-hydrated array of every file — static and generated — produced by `getAllFiles(workspaceTree)` (`src/content/workspaceSeed.ts`), recomputed on every `hydrateVFS()` success and kept current after every `saveFile()` success. Search needs no new tree-walk; this array is exactly what it indexes.
- `VirtualFile.path` already encodes every ancestor folder name as a path segment (e.g. `/projects/cortexa/README.md`), and `VirtualFile.id` already encodes provenance via `VFS_DESIGN.md` §2's frozen id strategy: no colon for static content, `<namespace>:<key>` for generated content. Search reuses both facts directly rather than inventing new metadata.

**Revision note**: three earlier documents sketched a *backend* search path, written before the VFS's hydration model was frozen — `BACKEND_BOOTSTRAP.md`'s "Search Engine — Phase 3" section / Milestone 8 (`GET /api/search`, Postgres `tsvector`/Elasticsearch), `VFS_DESIGN.md` §3/§10 naming `FileNodeRepository.searchFiles(query)` as what "backs the Search Engine," and `TERMINAL_DESIGN.md` §14 describing a future `find`/`grep` command as reusing that same backend path. All three predate the frozen fact (`VFS_DESIGN.md` §9.1) that the entire workspace, content included, is hydrated client-side in one atomic fetch per session. This section supersedes that assumption: **Search is a frontend subsystem, operating entirely on the already-hydrated VFS.** `FileNodeRepository.searchFiles()` remains in the codebase (harmless, already implemented) but is not the path Explorer/Editor/Terminal/Command Palette search goes through. Small cross-reference updates were made to the three documents above pointing back here.

### 1. High-Level Architecture

```
User Types
   │  (future SearchPanel.tsx — not built in Sprint 7A)
   ▼
Search Store                store.searchState (query, status, results, activeResultIndex)
   │  setSearchQuery(value) orchestrates: update query → call engine → store results
   │  never matches or ranks anything itself
   ▼
Search Engine                src/search/searchEngine.ts — search(query, options?)
   │  reads the cached Index (src/search/searchIndex.ts), delegates to Matcher + Ranker
   ▼
VFS                          store.workspaceFiles — already hydrated, read-only from here
   │  Search Engine never fetches; it only reads what hydration already produced
   ▼
Results                      SearchResult[] — typed, includes file/matches/snippet/score/namespace
   ▼
Explorer / Editor / Terminal / Command Palette
   │  all consume store.searchState.results and call the existing store.openFile(id) —
   │  no new file-opening mechanism, no new inter-component reference
```

| Layer | File(s) | Responsibility | Must never |
|---|---|---|---|
| Search UI | *(future, not built)* | Render `searchState`, call `setSearchQuery`/`setActiveResultIndex` | Match or rank anything itself |
| Store | `useStore.ts` (`searchState` slice) | Own `SearchState`; orchestrate query → engine call → store results, same shape as `submitTerminalCommand()` | Contain matching/ranking/indexing logic |
| Search Engine | `src/search/searchEngine.ts` | `search(query, options?)` — the one entry point the store calls; ties index + matcher + ranker together | Know about React, Zustand, or any specific `ContentProvider`/namespace |
| Index | `src/search/searchIndex.ts` | `buildIndex(files)`, `getIndex()`, `invalidateIndex()` — precomputed, normalized view over `workspaceFiles` | Fetch data itself; only ever receives `files` from its caller (the store) |
| Matcher | `src/search/matcher.ts` | Pure functions: index entry + query → `SearchMatch[]` per field (`name`/`path`/`content`) | Rank, sort, or truncate |
| Ranker | `src/search/ranker.ts` | Pure function: raw per-file matches → sorted, scored `SearchResult[]` | Re-match or re-scan file content |

The Search Engine is the direct analogue of Terminal's `parser.ts` + `executor.ts` + `registry.ts` split (`TERMINAL_DESIGN.md` §6): several small pure modules, one orchestrating entry point, zero React.

### 2. Ownership

| Concern | Owner | Notes |
|---|---|---|
| Search query | `store.searchState.query: string` | Same pattern as `terminalState.input` — store-owned, not component-local, for the reason `TERMINAL_DESIGN.md` §2/§18.1 already established twice (editor draft, terminal input). |
| Search results | `store.searchState.results: SearchResult[]` | Stored, not recomputed on every render — same reasoning as `HistoryEntry.output`: the output of one search execution is a fact about that execution. |
| Active result | `store.searchState.activeResultIndex: number \| null` | Keyboard-navigation cursor, mirrors `terminalState.historyCursor`. |
| Search status | `store.searchState.status: 'idle' \| 'searching' \| 'done'` | Mirrors `terminalState.status`'s shape; `'searching'` is a reserved slot for future async execution (§9) — Sprint 7A's synchronous engine passes through it for a single tick. |
| The index itself | **Not store state.** Module-level cache in `src/search/searchIndex.ts`. | Same reasoning as the terminal command registry (`TERMINAL_DESIGN.md` §2): derived/cached data, not session data. Unlike the registry (built once, static), the index is rebuildable since its source (`workspaceFiles`) changes during a session — but it still never becomes reactive Zustand state. |
| Indexing state | Implicit in the module cache (`getIndex()` is `undefined` until first build). Not exposed to store/UI in Sprint 7A. | A future async index would need a real state field — reserved, not built now. |

No concern above has two owners.

### 3. Search Engine Internals

```ts
// src/search/searchEngine.ts
function search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
```

Returns a `Promise` even though Sprint 7A's implementation resolves synchronously — the same "reserve the async contract now, implement synchronously first" move `TERMINAL_DESIGN.md` made for `CommandDefinition.execute()`. This is what lets a future async/AI-backed search slot in as a drop-in implementation swap with zero change to the store's call site. The engine never imports `useStore` or any React module; the store is the only thing that calls `buildIndex()`/`invalidateIndex()` (§8).

### 4. Indexing Strategy

**Question**: scan the VFS every query, or maintain an index?

| Approach | Tradeoffs |
|---|---|
| Scan every query | Simplest, zero staleness risk. Cost is `O(files × avgContentLength)` **per keystroke** — repeated normalization work even when nothing changed. Fine today, degrades as provider growth (LeetCode, Blog, AI Notes) adds hundreds of files, which is the scale `VFS_DESIGN.md`'s own stress test already treats as the design's real target. |
| **Maintain an index, rebuilt on data-change (recommended)** | Normalization (lowercasing name/path/content) happens once per data-change event (hydration, save), not once per keystroke. Requires explicit invalidation triggers (§8) — the one added complexity. |
| Real inverted index / trie / tokenized full-text index | Sub-linear query time regardless of content size. Rejected for Sprint 7A: `Fuzzy search libraries` is an explicit constraint, and unjustified at current + foreseeable scale. Flagged as a future upgrade path, swappable behind the same `search()` contract. |

**Recommendation**: a lightweight index — a precomputed, lowercased flat array derived from `workspaceFiles`, rebuilt on explicit data-change events, not per keystroke, and not a real inverted index.

```ts
// src/search/types.ts
interface SearchIndexEntry {
  file: VirtualFile;
  namespace: string;      // derived from file.id, see §6 — not looked up anywhere
  nameLower: string;
  pathLower: string;
  contentLower: string;
}

interface SearchIndex {
  entries: SearchIndexEntry[];
  builtAt: number;
  fileCount: number;
}
```

```ts
// src/search/searchIndex.ts
function buildIndex(files: readonly VirtualFile[]): SearchIndex;
function getIndex(): SearchIndex | undefined;   // undefined until first buildIndex() call
function invalidateIndex(): void;
```

### 5. Search Scope

| Candidate | Searchable? | Reasoning |
|---|---|---|
| File name | Yes | `SearchIndexEntry.nameLower`. Highest-ranked match tier (§7). |
| Folder name | Yes, via path — not a separate index field | Every folder a file lives under is already a `path` segment. Matching `pathLower` covers folder search for free, without walking `workspaceTree`. A first-class "folder result" (reveal-in-Explorer instead of open-in-Editor) is deferred, not rejected (§11). |
| Markdown content | Yes | `SearchIndexEntry.contentLower`. Every `FileType` in this project is plain text — no binary type exists in the VFS domain model — so content is uniformly searchable with no type-based special-casing. |
| Generated GitHub markdown | Yes, automatically | `github/*.md` files are ordinary `VirtualFile` entries in `workspaceFiles` by the time Search sees them (`VFS_DESIGN.md` §11.5's "no code changes needed" guarantee already covers this). Search does not know `GitHubProvider` exists. |
| Future generated content (LeetCode, Blog, AI Notes) | Yes, automatically, zero Search Engine changes | Same mechanism as above — a future provider's reconciled files simply appear in `workspaceFiles` after the next hydration (§8). Concrete proof of "adding a ContentProvider requires no Search Engine changes." |
| Readonly files | Yes, no different from writable files | Readonly is a write-permission concern, orthogonal to searchability. The Editor's existing readonly rendering, unchanged by Search, is what prevents edits. |
| Hidden files | N/A — no such concept exists | `VirtualFile` has no visibility field today. If one is ever added, Search respects it the same way it already respects `isReadonly`, without owning the concept. |

### 6. Result Model

```ts
type MatchField = 'name' | 'path' | 'content';

interface SearchMatch {
  field: MatchField;
  index: number;      // character offset of the match within that field's raw value
  length: number;
}

interface SearchResult {
  file: VirtualFile;          // the whole VirtualFile — no new file abstraction
  namespace: string;           // 'workspace' for static content, or the generated-id prefix (e.g. 'github')
  matches: SearchMatch[];
  snippet?: string;              // bounded preview around the best content match
  score: number;
}
```

**`namespace`** is derived structurally from `file.id`, reusing `VFS_DESIGN.md` §2's frozen id format (static ids never contain `:`; generated ids are `<namespace>:<key>`):

```ts
function namespaceOf(file: VirtualFile): string {
  const i = file.id.indexOf(':');
  return i === -1 ? 'workspace' : file.id.slice(0, i);
}
```

No `ProviderRegistry` import (backend-only concept), no hardcoded list of known namespaces. A future `leetcode:`/`blog:` id namespace produces a correct value automatically — the proof that adding a provider requires zero Search Engine changes.

### 7. Ranking

**Philosophy**: match a human's instinct for "jump to a file," not just line up literal substring hits — the same convention VS Code's own quick-open uses, which the "IDE-level search system" framing sets as the bar. Name/path matches outrank content matches by default, since content matches are numerous and noisier.

| Tier | Match kind | Base score | Rationale |
|---|---|---|---|
| 1 | Exact filename (case-insensitive) | 1000 | Unambiguous navigation intent. |
| 2 | Filename starts with query | 800 | Classic quick-open prefix behavior. |
| 3 | Filename contains query | 600 | Still a name match, weaker positional signal. |
| 4 | Path/folder segment match — exact / prefix / contains | 400 / 350 / 300 | Same three-way split as filename, scaled down. |
| 5 | Content contains query | 100 (+ small capped bonus per extra occurrence) | Lowest tier — mentioning a term is weaker signal than being named after it. Capped so one large file can't outrank a real name match. |

Tie-breaking within a tier: shorter filename first, then earlier match position.

**Recency is explicitly not a Sprint 7A ranking signal.** No "recently opened files" tracking exists in `useStore.ts` today; inventing one is a separate ownership decision, not folded silently into this design (§11).

### 8. Refresh Lifecycle

| Trigger | Action | Notes |
|---|---|---|
| `hydrateVFS()` success | `buildIndex(workspaceFiles)` | Primary trigger — one full index build per session at startup. |
| `saveFile()` success | Rebuild (Sprint 7A: full `buildIndex(workspaceFiles)`) | An incremental single-entry patch is a valid future optimization (§11), not required for correctness at current scale. |
| Generated provider refresh (e.g. `GitHubProvider.refresh()`) | **Not live-pushed into an already-hydrated session.** | Inherited limitation, not new: `VFS_DESIGN.md` §9.1 already freezes hydration as one atomic fetch per session with no live-update channel. New/changed generated content becomes searchable on the *next* hydration, identical to how Explorer/Editor would also show stale generated content mid-session. |
| Future providers | Same as above — reach `workspaceFiles` via the next hydration, zero Search-specific wiring. | Extends the "no ContentProvider-specific code" guarantee to the refresh lifecycle. |

No trigger above is "every keystroke" — that is the point of maintaining an index (§4).

### 9. Failure Handling

| Case | Handling |
|---|---|
| Empty workspace | `buildIndex([])` → any query returns `[]`. Same path as "no matches." |
| No matches | `search()` resolves to `[]`; `status` becomes `'done'`. A future UI distinguishes "no results" from "no query yet" via `query === ''`, not a separate stored status. |
| Large files | Not a failure — addressed by indexing once (§4) and by bounded `snippet` length. |
| Malformed markdown | Not applicable by construction — Search treats `content` as an opaque string, never parses an AST. |
| Cancelled searches | Not implemented in Sprint 7A. Contract slot reserved: `SearchOptions.signal?: AbortSignal`, mirroring `CommandContext.signal` (also reserved-not-built in `TERMINAL_DESIGN.md`). |
| Future async indexing | Already accommodated — `search()` returns a `Promise` today (§3); `'searching'` status is already reserved (§2). No store contract change needed later. |

### 10. Integration Points

| Subsystem | How Search integrates | Coupling avoided |
|---|---|---|
| **Explorer** | Reads `store.searchState.results` for future highlighting/filtering. Never calls `src/search/*` directly. | Explorer doesn't know matching/ranking exists. |
| **Editor** | Selecting a result calls `store.openFile(result.file.id)` — the same action Explorer, Command Palette, and Terminal's `open` already call. | No new file-opening mechanism. |
| **Terminal** | `TERMINAL_DESIGN.md` §14's reserved `find`/`grep` placeholder gets one new `CommandContext` capability: `search: (query, options?) => Promise<SearchResult[]>`, following the existing capability-injection pattern (`openFile`, `resolvePath`). | Search Engine never imports terminal types; the command never imports `src/search/*` directly. |
| **Router** | None, directly — opening a result goes through `openFile()`, which `useRouterSync` already listens to. | Same "gains URL sync for free" story as Terminal. |
| **Hydration** | `hydrateVFS()` success is an index rebuild trigger (§8). Search is a passive consumer, same relationship Explorer/Editor/Terminal have. | No search-specific loading gate. |
| **Command Palette** | Not wired in Sprint 7A. Once it is, `CommandPalette.tsx`'s `allFiles.map()` + `cmdk`-fuzzy-filter (§0) is replaced by a `search()` call, so the palette, a future search panel, and Terminal's `find` share one implementation. | Deferred (§11). |

### 11. Future Extensibility

| Future addition | Mechanism already in place | New work required |
|---|---|---|
| Regex search | `SearchOptions.mode?: 'substring' \| 'regex' \| 'semantic'`, reserved, only `'substring'` implemented | New branch in `matcher.ts` |
| Case-sensitive search | `SearchOptions.caseSensitive?: boolean`, reserved (default `false`) | Skip normalization in the matcher when set |
| Whole-word search | `SearchOptions.wholeWord?: boolean`, reserved | Boundary check in `matcher.ts` only |
| Replace | Reuses the existing Sprint 4B save pipeline per matched file | New orchestration layer only; explicitly out of scope here |
| Command Palette | `search()` already returns the shape a palette needs | UI wiring only, no engine change |
| AI semantic search | `SearchOptions.mode: 'semantic'` reserved; `search()` already `Promise`-returning | A genuinely new engine implementation (embeddings, vector index) — only the contract shape is reserved, not the feature |
| Recency ranking | None yet — no "recently opened" tracking exists in the store | New store field + its own cap/eviction policy, scoped separately |
| Folder-as-result-kind | Path-substring matching already covers folder relevance for files | Discriminated-union addition + Explorer reveal/highlight behavior |

No item above requires touching `searchState`'s shape or Explorer/Editor/Terminal's integration points — every addition is a new `SearchOptions` field or a new engine implementation behind the unchanged `search()` signature.

### 12. Technical Debt (intentional, flagged now)

- No persistent index across page loads — rebuilt fresh every session on hydration, mirroring `VFS_DESIGN.md` §11.7's identical acceptance for generated content.
- No live-push of backend provider refresh into an already-hydrated session's index — inherited from `VFS_DESIGN.md` §9.1's hydration model, not new.
- `saveFile()` triggers a full index rebuild rather than a single-entry patch — fine at current scale.
- No recency ranking signal — no tracking mechanism exists yet.
- Folder matches are not a first-class result kind — path-substring matching covers this today.
- Regex, case-sensitive, whole-word, replace, semantic search — contract slots reserved, none implemented (explicit Sprint 7A constraints).
- No UI — `src/search/*` and `searchState` are consumable, but no `SearchPanel.tsx` or Explorer/Terminal/Command-Palette wiring is built this sprint.

### 13. Alternative Designs Considered — and Rejected

| Alternative | Rejected because |
|---|---|
| Search embedded inside `Explorer.tsx` | Contradicts "Search must become another independent subsystem, not a feature inside Explorer." Would force Editor/Terminal/Command Palette to reach into Explorer's internals. |
| Backend search API (`GET /api/search`, original `BACKEND_BOOTSTRAP.md` sketch) | The workspace is already hydrated client-side; a network round-trip per query adds latency for data already in memory — same reasoning `TERMINAL_DESIGN.md` §13.1 used for terminal commands. Revises `BACKEND_BOOTSTRAP.md` Milestone 8 (cross-reference added there). |
| `FileNodeRepository.searchFiles()` as the primary client search path | Same latency reasoning. The method stays in the codebase (harmless, already implemented) but isn't what `search()` calls — two divergent search implementations would be worse than one. |
| Real inverted index / trie / fuzzy-matching library (Fuse.js, etc.) | Explicitly out of scope (`Fuzzy search libraries` constraint) and unjustified at current + foreseeable scale. Flagged as a future upgrade path behind the unchanged `search()` contract. |
| Storing the index as reactive Zustand state | Same reasoning that keeps the terminal command registry out of the store — derived/cached data, not session data; would trigger unnecessary re-renders. |
| Recency as a Sprint 7A ranking input | No "recently opened" tracking exists anywhere today; inventing one silently inside a search design would hide a real, separate ownership decision. |
| Folder-name matches as a distinct `SearchResult` kind | Path-substring matching already covers folder relevance for every file under it, at zero extra indexing cost; a second discriminated-union branch has no consumer in a design-only, UI-excluded sprint. |

**This freezes**: ownership (§2), the end-to-end architecture and per-layer responsibilities (§1), the Search Engine's pure-module shape (§3), the indexing strategy and recommendation (§4), search scope (§5), the typed result model (§6), the ranking philosophy (§7), the refresh lifecycle (§8), failure handling (§9), integration boundaries (§10), and the extensibility contract slots (§11). No code was written in Sprint 7A; `src/search/*`, the `searchState` store slice, and every UI integration point remain unbuilt until a future sprint implements against this section.

---

## LeetCode Provider

**Status: Design only, frozen as of 2026-07-19 (Sprint 8A). Nothing in this section is implemented yet.**

### 0. Grounding — what already exists

`VFS_DESIGN.md` §11 froze a generic `ContentProvider` pattern (interface: `namespace` / `refresh()` / `getStatus()`; a four-stage internal pipeline: API Client → Transformer → Markdown Generator → VirtualFile Generator → `reconcileGeneratedSubtree`) and instantiated it once, concretely, as `GitHubProvider` (§11.5). §11.6 already named LeetCode as a future namespace requiring, in principle, "New provider implementation only." Sprint 8A's job is to actually validate that claim by designing `LeetCodeProvider` against the existing contract, not to extend or re-open it.

**This section does not modify `VFS_DESIGN.md`.** The validation below concludes the `ContentProvider` interface, `FileNodeRepository`, `FileSystemService`, and `reconcileGeneratedSubtree` need zero changes to support a second provider — so per this project's own documentation-strategy rule (only foundational engines with their own domain model get a standalone `*_DESIGN.md`; everything else lives here), `LeetCodeProvider` is documented as an `ARCHITECTURE.md` section, exactly like Global Search above, rather than as a `VFS_DESIGN.md` edit. If implementation later surfaces a real contract gap, that gap gets fixed in `VFS_DESIGN.md` §11 directly (the way Sprint 6A did for GitHub) — not forked into a parallel document.

### 1. Architectural Validation

**Yes — `LeetCodeProvider` is implementable against the current `ContentProvider` contract with zero interface changes.**

| Member | Why it already fits |
|---|---|
| `namespace: string` | `'leetcode'` is just another string value, exactly like `'github'`. No structural requirement on namespace values exists beyond §2's id-prefix convention, which LeetCode ids satisfy the same way GitHub ids do (`leetcode:<key>`). |
| `refresh(): Promise<void>` | LeetCode's source data (profile stats, solved-problem counts, contest history, recent submissions) is structurally the same shape as GitHub's (a profile plus a handful of bounded aggregate collections) — it fits the same fetch → transform → generate → reconcile pipeline (`VFS_DESIGN.md` §11.2) without a new stage or a different method signature. |
| `getStatus(): ProviderStatus` | LeetCode's failure modes (§9 below) all collapse into the existing `idle \| syncing \| error` states plus `lastSyncedAt`/`lastError` — nothing about them needs a new status shape. |

No change is required to `ContentProvider`, `FileNodeRepository`, `FileSystemService`, or `reconcileGeneratedSubtree`. Sprint 8A's brief asked to identify a gap only if one is real; there isn't one — this is the concrete proof that `VFS_DESIGN.md` §11.6's "no redesign" claim holds, not just an assertion of it.

### 2. High-Level Architecture

```
LeetCode (unofficial GraphQL endpoint — see §3's note)
   ↓
LeetCodeApiClient          — network I/O only, mirrors GitHubApiClient's role (VFS_DESIGN.md §11.2)
   ↓
LeetCodeTransformer         — pure: raw response → internal domain types
   ↓
LeetCodeMarkdownGenerator    — pure: one domain type in, one markdown string out
   ↓
LeetCodeVirtualFileGenerator  — wraps markdown into VirtualFiles (leetcode:<key> ids, isReadonly: true)
                                 + assembles the leetcode/ VirtualFolder
   ↓
reconcileGeneratedSubtree('leetcode', nodes)   — same repository entry point every provider uses
```

`LeetCodeProvider` is the orchestrator, running these four stages in sequence — identical shape to `GitHubProvider`, just a different upstream and a different set of output files (§4 below).

### 3. Ownership

Reuses `VFS_DESIGN.md` §11.4's ownership table verbatim — no new rows, no new owners:

| Concern | Owner | LeetCode-specific note |
|---|---|---|
| Fetched LeetCode data | `LeetCodeApiClient`, transient | Raw GraphQL response; never held durably |
| Transformed domain model | `LeetCodeTransformer`, transient | Pure output of one stage, input of the next |
| Generated markdown | `LeetCodeMarkdownGenerator`, transient | One markdown string per output file |
| Generated VirtualFiles | `LeetCodeVirtualFileGenerator`, transient until reconciled | Namespaced ids (`leetcode:profile`, etc.), `isReadonly: true` |
| Refresh state (cadence/scheduling) | `LeetCodeProvider`, via the same generic scheduler GitHub uses | Non-blocking startup + recurring interval, same strategy, conservative cadence given §3's endpoint-stability note |
| Provider status (loading/error) | `LeetCodeProvider.getStatus()` | In-memory only, never a `VirtualFile` field — same as GitHub |
| The reconciled content itself | `FileNodeRepository` | Same single durable copy; no LeetCode-specific cache |

**A note on the API Client stage, flagged rather than glossed over**: unlike GitHub, LeetCode has no official, documented public REST API. Public profile data is reachable through an unofficial GraphQL endpoint the LeetCode web client itself uses, which works unauthenticated for public profiles but isn't a stable, versioned, rate-limit-documented contract the way GitHub's REST API is. That's a real operational risk (schema drift, no `Retry-After` header), but it's entirely contained inside `LeetCodeApiClient` — it doesn't change the `ContentProvider` contract or anything above the API Client stage. See §9.

### 4. Workspace Layout

```
leetcode/
  README.md      — leetcode:readme    — index; links to the files below + last-synced timestamp
  profile.md      — leetcode:profile    — username, ranking, solved counts by difficulty, acceptance rate
  stats.md         — leetcode:stats      — solved/attempted breakdown, by category if the public query exposes it
  recent.md         — leetcode:recent     — bounded aggregate: most recent N submissions (title, difficulty,
                                            status, timestamp) — same top-N-cap pattern GitHub's repositories.md
                                            uses (VFS_DESIGN.md §11.5), for the same reason
  contests.md         — leetcode:contests   — contest rating + bounded recent-contest history; renders a
                                            "no contest history" note if the user has never entered one —
                                            a valid empty state, not a failure (§9)
  activity.md           — leetcode:activity   — submission-streak / calendar summary, same role as
                                            github/contributions.md
```

**Why aggregate files, not one file per problem**: rejected for the identical reason GitHub rejected `github/repos/<name>.md` (`VFS_DESIGN.md` §11.5) — a `leetcode/problems/<slug>.md`-per-problem layout makes namespace size proportional to solved-problem count (potentially hundreds), reintroducing the unbounded-tree-growth risk this project's VFS stress test already flagged. `recent.md`'s fixed top-N cap keeps `leetcode/`'s size constant regardless of how many problems the user has solved.

### 5. Readonly Policy

No new logic. `LeetCodeVirtualFileGenerator` sets `isReadonly: true` on every node it produces, exactly like `GitHubVirtualFileGenerator`. `FileSystemService.updateFile()`'s existing readonly rejection (`VFS_DESIGN.md` §3.1, already implemented and already exercised end-to-end by GitHub) requires zero LeetCode-specific code — it rejects writes against `isReadonly: true` nodes regardless of which provider produced them.

### 6. Hydration

Zero changes required. `getRootTree()` / `getFullTree()` / `hydrateVFS()` already return whatever is currently reconciled under every namespace, merged with static and `github` content indistinguishably (`VFS_DESIGN.md` §10's consistency guarantee). Nothing about hydration is namespace-aware — it walks whatever `FileNodeRepository` currently holds. Adding a second reconciled namespace exercises this guarantee a second time; it doesn't require re-proving it with new code.

### 7. Search Integration

Zero changes required, per this document's own Global Search Subsystem §5: "Future generated content (LeetCode, Blog, AI Notes) | Yes, automatically, zero Search Engine changes | ... a future provider's reconciled files simply appear in `workspaceFiles` after the next hydration." `src/search/*` indexes `VirtualFile`s by `name`/`path`/`content` and derives `namespace` structurally from `file.id` (`namespaceOf()`, Global Search §6) — `leetcode:` ids produce `namespace: 'leetcode'` automatically, with no `ProviderRegistry` import and no hardcoded namespace list. `LeetCodeProvider` is the first real exercise of a guarantee that was designed in ahead of time, not an assumption being made now.

### 8. Terminal Integration

Proposed, not frozen — same posture as `VFS_DESIGN.md` §11.5's still-unsigned-off GitHub proposal. Once `leetcode/README.md` is an ordinary reconciled `VirtualFile`, a future `leetcode` (or `open leetcode`) command needs no backend round-trip: it can be sugar for `open("leetcode/README.md")`, the same "named shortcut to `open`" pattern `TERMINAL_DESIGN.md` §10 already uses for `projects`/`contact`/`resume`. This is not a terminal command implementation — it's a one-line future registry addition once both the GitHub and LeetCode proposals are actually signed off (`TERMINAL_DESIGN.md` §13.1). No backend terminal command is introduced by this design.

### 9. Failure Handling

Generic policy is `VFS_DESIGN.md` §11.4 (on any pipeline-stage failure, keep the namespace's last-known-good content, retry next cycle). LeetCode-specific cases, same shape as GitHub's table (§11.5):

| Case | Handling |
|---|---|
| Invalid username | LeetCode's `matchedUser` query returns null/empty for a nonexistent username — treated as a configuration error, same as GitHub's 404 case: `getStatus()` reports a persistent `error` state; the provider retries on the normal schedule rather than a special backoff, since a misconfigured username won't resolve faster by retrying sooner. |
| API unavailable | Transient failure — `LeetCodeApiClient` throws, the provider keeps the namespace's last-known-good reconciled content untouched, retries next scheduled cycle. |
| Rate limiting | No documented `Retry-After`/rate-limit headers exist for the unofficial endpoint, unlike GitHub. Instead of header-driven backoff, `LeetCodeApiClient` applies a fixed, conservative self-imposed request cadence chosen well under any observed throttling threshold. This is the one place the LeetCode provider's *implementation* differs from GitHub's — it's contained entirely inside `LeetCodeApiClient`; the `ContentProvider` contract and scheduler are unaffected. |
| Timeout | Same generic handling — abort the fetch, keep last-known-good, retry next cycle. |
| Partial data | Same per-file granularity as GitHub: `profile.md` is the one required file; if it fails, the whole cycle aborts per the last-known-good rule. If a best-effort file (`stats`/`recent`/`contests`/`activity`) fails to fetch, only that file is regenerated from previous content (or a small inline note), not the whole cycle. A user with zero contests entered or zero recent submissions is a **valid empty result, not a failure** — `contests.md`/`recent.md` render a "no data yet" note rather than erroring. |

### 10. Future Extensibility

Evaluating the remaining sources named in the Sprint 8A brief against the same zero-redesign bar:

| Future source | Namespace | Fits current pattern without redesign? |
|---|---|---|
| Resume | `resume` | Yes — already named in `VFS_DESIGN.md` §11.6; a single small aggregate file, the simplest possible provider. |
| Blog | `blog` | Yes — already named in §11.6; posts are content, same aggregate-vs-per-post tradeoff §4 above already resolved (aggregate preferred, or a bounded top-N file if per-post is wanted). |
| Certificates | `certificates` | Yes — same shape: an aggregate `certificates.md` listing issuer/date/credential-link per entry; certificate counts don't grow unboundedly the way solved-problems or commits do, so even a per-entry layout would be low-risk, but aggregate stays consistent with every other provider. |
| Publications | `publications` | Yes — same shape: an aggregate `publications.md`; the same top-N-cap precedent applies if a per-publication layout were ever wanted. |

No candidate requires a `ContentProvider` interface change, a repository change, or a new consumer-side special case — every one is "implement the four pipeline stages, pick an aggregate-file layout, register with the scheduler," exactly what `VFS_DESIGN.md` §11.1–§11.4 already specify generically. This table is additive evaluation only; it does not modify `VFS_DESIGN.md` §11.6's existing table.

### 11. Technical Debt

- The unofficial-GraphQL-endpoint risk (schema drift, no formal rate-limit contract) is a real constraint, not resolved here — implementation must treat this endpoint as less stable than GitHub's official REST API and budget for it (conservative cadence, defensive parsing).
- Exact GraphQL query shape / which fields `LeetCodeTransformer` extracts is deferred to implementation.
- `stats.md`'s tag/category breakdown depends on what the public profile query actually exposes unauthenticated — may need to degrade to difficulty-only breakdown if category data turns out to require a logged-in session; deferred to implementation to confirm against the live API.
- The multi-provider scheduler stagger question `VFS_DESIGN.md` §11.7 already flagged (avoiding GitHub and LeetCode refreshing on the same tick) remains deferred, now slightly more relevant with a second concrete provider.
- Frontend readonly affordance — still out of scope, same as §11.7.
- Terminal `leetcode` command (§8 above) — proposed, not frozen, requires the same sign-off the `github` proposal still needs.

### 12. Alternative Designs Considered — and Rejected

| Alternative | Rejected because |
|---|---|
| `LEETCODE_PROVIDER_DESIGN.md` as a standalone document | Not an independent subsystem — it's a second instantiation of the already-frozen `ContentProvider` pattern. A standalone doc would duplicate `VFS_DESIGN.md` §11's already-frozen decisions instead of reusing them, and would undermine the exact thing Sprint 8A set out to prove (that the pattern generalizes without forking). |
| One markdown file per solved problem | Unbounded namespace growth proportional to solved-problem count — identical reasoning to GitHub's per-repository rejection (§4 above, `VFS_DESIGN.md` §11.5). |
| Modifying `ContentProvider` to add a LeetCode-specific method (e.g. `getSolvedCount()`) | Would break "every consumer reads the same reconciled tree with no source-awareness" (`VFS_DESIGN.md` §11.6) and reintroduce per-provider special-casing exactly where this pattern exists to prevent it. Nothing LeetCode needs falls outside `namespace`/`refresh()`/`getStatus()`. |
| Fetching LeetCode data at hydration time (no reconciliation/cache) | Reintroduces a request-time external dependency into hydration and multiplies upstream calls by concurrent hydration requests — worse here than for GitHub, given the unofficial endpoint's unknown throttling tolerance. Same rejection GitHub's alternatives table already made (`VFS_DESIGN.md` §11.8). |
| Treating "no contest history" / "no recent submissions" as an error state | Would conflate a legitimate empty result with an actual failure, causing `getStatus()` to report `error` for users who simply haven't used a feature. Handled instead as a valid empty-content case (§9). |

**This freezes**: nothing new architecturally — it validates that `VFS_DESIGN.md` §11's `ContentProvider` contract, pipeline shape, and ownership rules already cover a second provider unmodified (§1), and freezes `LeetCodeProvider`'s own concrete shape (workspace layout §4, failure handling §9) the same way `VFS_DESIGN.md` §11.5 froze GitHub's. No code was written in Sprint 8A.

---

## Notification Service

**Status: Design only, frozen as of 2026-07-19 (Sprint 9A). Nothing in this section is implemented yet.**

### 0. Grounding — what already exists

`src/types/index.ts` already defines a `Notification { id, source: 'GitHub' | 'LeetCode' | 'System', message, timestamp }` type, and `useStore.ts` already holds a flat `notifications: Notification[]` array with `addNotification()`/`dismissNotification()` actions. `src/components/notifications/Notifications.tsx` renders them as framer-motion toasts, bottom-right, with a hardcoded 5-second auto-dismiss driven by a `useEffect`/`setTimeout` inside the component itself. Today, nothing actually calls `addNotification()` except the store's own hardcoded seed data — no real producer exists yet.

This section keeps the animation feel this component already established (slide-and-fade entrance, fade-and-scale exit, bottom-right stack) but redesigns *where the logic lives*: the queue, auto-dismiss timers, and ordering move out of the component and out of a hardcoded severity/source union, into a framework-independent module every future subsystem can call into directly — which is the actual gap Sprint 9A is asked to close (`addNotification()` requires importing the Zustand store, which `src/search/*` and `src/terminal/*` are deliberately forbidden from doing, and which a backend `ContentProvider` cannot do at all — different runtime).

**A real, previously-flagged gap this section resolves**: `BACKEND_BOOTSTRAP.md`'s Integration APIs section already named `GET /api/notifications/poll (or WebSocket setup)` and explicitly left "whether real-time provider-sync notifications are needed, and how" as "an open question for whoever designs the Notification Engine, not decided here." Sprint 9A is that design. The answer (§8 below): a live backend→frontend push channel is **not** built now — it would be a real backend/infrastructure change, contradicting this sprint's "design only" scope — so provider-originated notifications are approximated from data the frontend already has (hydration results), with the gap this leaves explicitly flagged rather than papered over.

### 1. Architectural Goals — how each is met

| Goal | How |
|---|---|
| Globally accessible | `notificationService` is a singleton module, importable from anywhere — no provider/context wiring needed to reach it |
| Framework independent | `src/notifications/{types,notificationQueue,notificationService}.ts` are pure TypeScript — no React, no Zustand imports |
| React only renders | `Notifications.tsx` is the only file that imports React/framer-motion; it reads `store.notificationState` and calls `dismissNotification()`/hover handlers — it contains no ordering, timer, or overflow logic |
| Producer doesn't know who renders | Every producer calls `notificationService.notify(input)` and gets back an id; it never touches the store, a component, or knows a renderer exists |
| Reusable by future systems | Terminal, Atlas, Command Palette (§8) integrate through the exact same `notify()` call every existing producer uses — zero new API surface per subsystem |
| Queue-based | `notificationQueue.ts` is an ordered, mutable, module-level queue (§5) — not a single "latest toast" slot |
| Multiple simultaneous notifications | The queue holds an unbounded backlog and a bounded visible window (§5); the model and renderer both support N concurrent toasts |

### 2. Ownership

| Concern | Owner | Notes |
|---|---|---|
| `Notification` (the data record) | Created by the calling producer via `notificationService.notify()`; immutable once created | Same "the output of one execution is a fact about that execution" reasoning `TERMINAL_DESIGN.md` uses for `HistoryEntry.output` |
| `NotificationQueue` | Module-level, **not store state** — pure TS, in `src/notifications/notificationQueue.ts` | Same category of thing as `src/search/searchIndex.ts`'s cache and the terminal command registry — derived/session-lifetime data, not persisted, not Zustand |
| `NotificationService` | Module-level, **not store state** — pure TS, in `src/notifications/notificationService.ts` | Thin public API (`notify`/`dismiss`/`clear`/`pause`/`resume`/`subscribe`) wrapping the queue — mirrors `searchEngine.ts` sitting in front of `searchIndex.ts` |
| `NotificationState` (store slice) | `store.notificationState.visible: Notification[]` — a **reactive mirror** of the queue, kept in sync via `notificationService.subscribe()` | Not authoritative — same relationship `searchState.results` has to the search index: the queue is the source of truth, the store is what React reads |
| `NotificationRenderer` (`Notifications.tsx`) | React component; pure consumer of `notificationState` | Owns layout, stacking, animation, dismiss button, severity icon, hover detection (§6) |
| Auto-dismiss lifecycle — the timer itself | `NotificationQueue`, via plain `setTimeout`, independent of any component's mount lifecycle | This is the fix for the current implementation's bug class: today's `useEffect`-owned timers reset or leak on remount; a queue-owned timer doesn't |
| Auto-dismiss lifecycle — pause/resume trigger | `NotificationRenderer` detects the hover DOM event and calls `notificationService.pause(id)`/`resume(id)`; the queue remains the one place that knows whether a timer is actually running | React reports *that* the user is hovering; the queue decides *what that means* for the timer — keeps the interaction detection (a DOM/React concern) separate from the lifecycle authority (a queue concern) |
| Animations | `NotificationRenderer` only — entrance/exit/stack-reflow/progress-bar width are 100% presentational | The queue has no concept of pixels, easing, or motion; it only exposes `duration` and pause state |

No concern above has two owners.

### 3. High-Level Architecture

```
Subsystem (Save Pipeline, Search, Hydration, Terminal, Atlas, Command Palette, ...)
   │  notificationService.notify({ title, message?, severity, source, ... }) → id
   ▼
NotificationService          src/notifications/notificationService.ts
   │  thin public API; delegates every call to the queue; never imports React/Zustand
   ▼
NotificationQueue            src/notifications/notificationQueue.ts
   │  ordered, mutable, module-level; owns enqueue/dismiss/clear/pause/resume,
   │  max-visible windowing (§5), dedupe (§5), and every auto-dismiss timer
   │  notifies subscribers on every state change
   ▼
Store                        useStore.ts — notificationState.visible
   │  subscribes once at store creation; mirrors the queue's current visible
   │  list into reactive Zustand state; exposes dismissNotification(id) as a
   │  thin passthrough for the renderer's convenience
   ▼
Toast Renderer                src/components/notifications/Notifications.tsx
   │  reads store.notificationState only; renders, animates, detects hover,
   │  calls store.dismissNotification(id) on click
   ▼
Animated Toasts
```

**Per-layer responsibility, explicitly:**

| Layer | Responsibility | Must never |
|---|---|---|
| Subsystem (producer) | Call `notify()` with what happened | Know about the queue, the store, or React |
| `NotificationService` | Expose the public API; validate/default the input (severity defaults, duration defaults per §9) | Hold state itself — delegates to the queue |
| `NotificationQueue` | Ordering, visible-window bounding, overflow, dedupe, timers | Know about React, Zustand, or rendering |
| Store (`notificationState`) | Mirror the queue reactively for components to read | Contain queue logic — it subscribes, it doesn't compute |
| `NotificationRenderer` | Layout, animation, interaction | Own timers, ordering, or overflow decisions |

### 4. Notification Model

```ts
// src/notifications/types.ts
export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message?: string;
  severity: NotificationSeverity;
  timestamp: number;
  /** ms until auto-dismiss; null = sticky, dismissed only by user action or clear() (§9's per-severity defaults). */
  duration: number | null;
  /** Whether a manual close (✕) button renders. Defaults to true; false is reserved for a future non-skippable case (§10), not used today. */
  dismissible: boolean;
  /** Free-form producer label ('Save Pipeline', 'GitHub', 'LeetCode', 'Search', 'Terminal', 'Hydration', ...) — not a fixed union, same reasoning SearchResult.namespace uses: a hardcoded source list would need editing every time a future subsystem (Atlas, Command Palette) starts producing notifications. */
  source: string;
  /** Optional coalescing key (§5) — a new notify() call reusing an active id's dedupeKey refreshes it instead of stacking a duplicate. */
  dedupeKey?: string;
  /** Reserved, not implemented (§10) — buttons like Undo/Retry/Open File render from this once a future sprint adds it. */
  actions?: { label: string; onSelect: () => void }[];
}

export interface NotifyInput
  extends Partial<Pick<Notification, 'message' | 'duration' | 'dismissible' | 'dedupeKey' | 'actions'>>,
    Pick<Notification, 'title' | 'severity' | 'source'> {}
```

`id`/`timestamp` are assigned by the queue on `enqueue()`, not supplied by the caller — mirrors how `HistoryEntry.id`/`timestamp` are assigned by the terminal's orchestrator, not by individual commands. This is deliberately the same six-ish-field shape the brief asked for and nothing more — no `progress` field, no discriminated union for future action types (§10 covers why those are additive, not designed in now).

This supersedes `src/types/index.ts`'s current `Notification` type (hardcoded `source` union, no `severity`/`duration`/`dismissible`/`dedupeKey`) — flagged for whichever sprint implements this design, not changed here.

### 5. Queue Behaviour

```ts
// src/notifications/notificationQueue.ts
function enqueue(input: NotifyInput): string;         // returns the generated id
function dismiss(id: string): void;
function clear(): void;
function pause(id: string): void;
function resume(id: string): void;
function subscribe(listener: () => void): () => void;  // returns an unsubscribe function
function getVisible(): readonly Notification[];
function getQueued(): readonly Notification[];          // backlog beyond the visible window
```

- **Maximum visible**: 3 (the user's own UX guidance). A bounded *visible* window, not a bounded total — nothing is ever silently discarded.
- **Overflow strategy**: when 3 notifications are already visible and a new one arrives, the new one still becomes visible immediately (a brand-new "File save failed" shouldn't wait behind two old "File saved" toasts) and the least-recently-added visible notification is demoted into the backlog queue rather than dismissed. Backlog entries are promoted back to visible, oldest-backlog-first, whenever a visible slot frees up (dismiss, expiry, or manual close). This guarantees every notification is eventually seen, while keeping on-screen clutter bounded — the alternative (drop overflow entirely) risks silently losing an error notification, which is worse than a brief queueing delay.
- **Ordering**: insertion order, oldest-first internally; the renderer decides visual stacking direction (§6) — the queue only guarantees a stable order, not a screen position.
- **Duplicate handling**: `dedupeKey` (§4). If `enqueue()` is called with a `dedupeKey` matching an already-active (visible or queued) notification, the existing entry's `timestamp` and auto-dismiss timer are refreshed instead of adding a second toast. This is what keeps something like rapid autosave-driven "File saved" events from spamming the stack — the producer doesn't need to track "did I already show this," the queue absorbs it.
- **`clear()`**: dismisses everything, visible and backlog, immediately — used sparingly (e.g. a future "clear all" action), not part of any producer's normal flow.

### 6. Rendering

`Notifications.tsx` (`NotificationRenderer`) is a pure consumer of `store.notificationState.visible`. Its responsibilities, and nothing more:

- **Layout**: fixed bottom-right container, matching the existing component's positioning.
- **Stacking**: newest notification enters at the bottom of the stack and pushes older ones upward (the user's explicit UX note) — a `flex-col-reverse` layout over the store's oldest-first array achieves this without the queue needing to know about visual direction at all.
- **Animation**: entrance/exit/stack-reflow (§7).
- **Progress timer (visual)**: a thin bar per toast, animated width from 100% → 0% over `duration`; the animation's *play/pause* state is driven by whether the store mirror currently marks that notification as paused (set via the hover handler below), not by the renderer independently guessing elapsed time.
- **Dismiss button**: calls `store.dismissNotification(id)`, a thin passthrough to `notificationService.dismiss(id)`.
- **Hover-to-pause**: `onMouseEnter`/`onMouseLeave` call `notificationService.pause(id)`/`resume(id)` directly (no store round-trip needed for this — the queue is already subscribed-to and will push the updated state back through the store on its own).

No ordering, timer, or overflow logic lives in this component — it renders exactly the array it's given, in the order it's given.

### 7. Animation Behaviour

Keeps the existing component's motion vocabulary (§0) rather than inventing a new one, since it already matches the user's "avoid flashy motion" guidance:

- **Entrance**: fade + slide in from the right (`opacity: 0, x: 50` → `opacity: 1, x: 0`), same as today.
- **Exit**: fade + slight scale-down (`opacity: 1, scale: 1` → `opacity: 0, scale: 0.95`), same as today.
- **Stack movement**: framer-motion's `layout` prop on each toast plus `AnimatePresence mode="popLayout"` — when a toast is removed from the middle of the stack, the remaining toasts reflow automatically via framer-motion's built-in layout animation, with no manual position math. This is what makes "push older ones upward" (§5/§6) look smooth instead of an abrupt jump.
- **Progress indicator**: a 2px bar along a toast's bottom edge, width animated linearly over `duration`; paused by freezing the animation (not restarting it) when `pause(id)` is signaled, so resuming continues from wherever it left off rather than resetting.
- **Severity icon**: ✓ (success), ℹ (info), ⚠ (warning), ✕ (error) — a static per-severity glyph, no motion of its own.

All animation values are small, short-duration, and non-bouncy — communicating "something happened" rather than drawing attention to the animation itself.

### 8. Integration Points

| Subsystem | How it publishes | Coupling avoided |
|---|---|---|
| **Save Pipeline** (`saveFile()`, `useStore.ts`) | `notify({ title: 'File saved', source: 'Save Pipeline', severity: 'success', duration: 3000, dedupeKey: 'save:'+id })` on success; `severity: 'error', duration: null` on failure | The store calls `notificationService` the same way any other producer would — it isn't a privileged caller |
| **GitHubProvider** / **LeetCodeProvider** | **Cannot call `notificationService` directly — they run in the backend Node process; the service is a frontend module.** Approximated instead: on `hydrateVFS()` success, the frontend checks which generated namespaces (`github`, `leetcode`, derived the same way `namespaceOf()` already does for Search) are present, and fires one "GitHub synchronized" / "LeetCode refreshed" notification per namespace **the first time it's seen this session** | Zero new backend dependency — reuses hydration data already fetched; explicitly flagged as an approximation, not a true "just synced" signal (see the gap below) |
| **Search** | Only for a discrete, explicit search action (e.g. a future Terminal `find`/`grep` via `ctx.search()`) — **not** the live-as-you-type Explorer search panel, which would fire a notification per keystroke and violate the "avoid flashy motion" / no-spam goal. This is a deliberate exclusion, not an oversight. | Search Engine itself never imports `notificationService` — only the discrete call site (a future terminal command) would |
| **Hydration** | `hydrateVFS()` success: one `notify({ title: 'Workspace indexed', source: 'Hydration', severity: 'info', duration: 2500 })` per session. Failure is **not** also toasted — `vfsError` already drives the full-screen `BootErrorScreen`; duplicating that into a toast would be a redundant signal for the same event. | Hydration doesn't know a renderer exists; it just calls `notify()` once on its existing success path |
| **Terminal (future)** | New `CommandContext.notify(input)` capability, added the same way `ctx.search()` was added in Sprint 7B — a thin passthrough to `notificationService.notify()`. Proposed, not frozen; no terminal commands use it yet. | Terminal commands call `ctx.notify()`, never `notificationService` directly — preserves the existing capability-injection pattern |
| **Atlas (future)** | Whatever Atlas turns out to be, it integrates exactly like every other producer: import `notificationService`, call `notify()`. No special case designed in — none is needed. | — |
| **Command Palette (future)** | Same as Atlas — direct `notify()` calls for whatever actions it performs (e.g. theme changes, once wired) | — |
| **Theme changed** | Wherever theme is actually set (today: the terminal `theme` command; future: Command Palette) calls `notify({ title: 'Theme changed', message: theme, source: 'Editor', severity: 'info', duration: 2000 })` | — |

**The one real gap, stated plainly**: "Provider refresh failed" (explicitly listed in the brief's examples) is **not observable by the frontend at all under Sprint 9A's model.** A failed `GitHubProvider`/`LeetCodeProvider` refresh today just means that namespace's folder is absent, or stays at its last-known-good content (`VFS_DESIGN.md` §11.4) — nothing surfaces that a failure occurred. Making this a real notification requires the frontend to observe backend provider status somehow: either a small addition to `GET /api/fs/tree`'s response, or a new lightweight status endpoint — both are backend contract changes, out of scope for a design-only, no-implementation sprint, and exactly the question `BACKEND_BOOTSTRAP.md` already left open for this design (§0). **Proposed, not frozen**: expose `ProviderStatus` (already defined server-side, `server/providers/contentProvider.ts`) through a small read-only surface the frontend can poll or receive at hydration time — same "flag it, propose it, wait for sign-off" posture as `VFS_DESIGN.md` §11.5's GitHub-terminal-sugar proposal and `TERMINAL_DESIGN.md` §13.1. Not decided here.

### 9. Error Handling

Per-severity defaults (all overridable per-call via `NotifyInput`):

| Severity | Default `duration` | Reasoning |
|---|---|---|
| `error` | `null` (sticky) | An error a user doesn't get to read before it vanishes defeats the point of surfacing it; requires manual dismissal |
| `warning` | `6000` ms | Longer than info/success — worth noticing, but not blocking |
| `success` | `3000` ms | Brief acknowledgment; the action already succeeded, nothing more is needed from the user |
| `info` | `2500` ms | Same reasoning as success — ambient awareness, not a call to action |
| Long-running operations | **Not supported in Sprint 9A.** A long-running op is represented as two discrete notifications today (a start + a later completion/failure), not one mutating notification — `notificationService` has no `update()` method yet (§10) | Explicitly deferred, not silently half-built |

### 10. Future Extensibility

| Future addition | Mechanism already in place | New work required |
|---|---|---|
| Buttons / Undo / Retry / Open File / Open Folder / Open Settings | `Notification.actions?: { label, onSelect }[]` is already reserved in the model (§4) | `NotificationRenderer` gains button rendering for a non-empty `actions` array — zero `NotificationQueue`/`NotificationService` change, since the queue already treats `actions` as opaque data it stores and forwards |
| Progress notifications | Not reserved as a field today (avoiding over-design per the brief) | A new optional `progress: { current: number; total: number } | null` field, plus a new additive `notificationService.update(id, patch)` method — the one place this design anticipates a future non-breaking API addition, not a redesign |
| Real-time provider-sync / "Provider refresh failed" | `source`/`severity` already generalize to any backend-originated event | The backend-observability gap in §8 — a separate, larger decision, not a `NotificationService` change |

No addition above requires changing `NotificationQueue`'s ordering/overflow/dedupe logic, the store's mirroring mechanism, or how producers call `notify()` — every addition is either already-reserved data or a new, additive method.

### 11. Technical Debt (intentional, flagged now)

- No live backend→frontend push channel — provider-sync notifications are approximated at hydration time (§8), and "provider refresh failed" isn't observable by the frontend at all yet. Proposed resolution flagged, not frozen, requires separate sign-off (§8).
- No notification history/log panel (VS Code's bell-icon Notifications Center) — only the live toast stack exists. A natural future Command-Palette-adjacent feature, not built now.
- `notificationService.update(id, patch)` (needed for progress notifications, §10) doesn't exist yet.
- Dedupe is a simple timestamp-refresh, not smart batching (e.g. collapsing "3 files saved" into one toast) — deferred.
- No sound or OS-level (`Notification` Web API) integration — out of scope for a browser-embedded IDE simulation.
- No persistence across reloads — session-only, consistent with every other piece of session state in this app.

### 12. Alternative Designs Considered — and Rejected

| Alternative | Rejected because |
|---|---|
| Keep today's implementation — producers call `useStore().addNotification()` directly | Couples every producer to Zustand, which `src/search/*`/`src/terminal/*` are deliberately forbidden from importing, and which a backend `ContentProvider` cannot import at all (different runtime). Directly violates "producer does not know who renders." |
| A generic toast library (react-hot-toast, sonner, etc.) | Explicitly rejected by the user's own guidance — doesn't fit VS Code's specific visual vocabulary (severity icons, progress bar, push-upward stacking, hover-pause), and this codebase's existing framer-motion toast already has the right feel (§0/§7) — replacing it would throw that away for no benefit. |
| Auto-dismiss timers owned by the React component (today's actual implementation) | Ties a queue-lifecycle concern to component mount lifecycle — a remount (route change, HMR) can reset or lose a timer. Directly violates "do not put queue logic inside React." |
| A React Context provider instead of a Zustand store slice | This codebase has exactly one established pattern for session-observable state (`useStore()`, used by Search, Terminal, VFS, everything). A second pattern for one subsystem fragments state access for no real benefit over a thin store mirror, which already achieves "React only renders." |
| Build the live backend push channel (WebSocket/polling) now, to make provider-sync notifications truly real-time | Contradicts this sprint's "design only, do not implement" scope, and resolves a real backend/infrastructure question that deserves its own sign-off — same posture as every other "proposed, not frozen" backend question in this project's history (`VFS_DESIGN.md` §11.5, `TERMINAL_DESIGN.md` §13.1). Flagged as future work (§11), not decided here. |
| A single global auto-dismiss duration for every severity | Per-severity defaults (§9) better match "errors must be read, success can vanish quickly" without forcing every producer to specify `duration` manually — still overridable per call. |
| Drop overflow notifications past the max-visible count instead of queueing them | Risks silently losing an error notification a user never saw — the backlog-and-promote strategy (§5) guarantees eventual visibility at the cost of a possible short display delay, a better tradeoff for a system where "error" is one of the four severities. |

**This freezes**: the layered architecture and per-layer responsibilities (§3), ownership (§2), the notification model (§4), queue behavior including overflow/dedupe (§5), the render/queue split (§6), animation behavior (§7), integration points including the one explicitly-flagged backend-observability gap (§8), per-severity error handling defaults (§9), and the extensibility mechanism (§10). No code was written in Sprint 9A; `src/notifications/*`, the `notificationState` store slice, and every producer integration remain unbuilt until a future sprint implements against this section.

---

## Knowledge Graph Renderer

**Status: Milestones 1-6 of Sprint 11 shipped, 2026-08-01. Milestone 1: registry + routing + loader + Graph Model + placeholder rendering. Milestone 2: Graph Builder — relationships + statistics, no coordinates. Milestone 3: Layout Engine — force-relaxed radial layout — see §10. Milestone 4: the first production Renderer — see §11. Milestone 5: Interaction & Motion Layer (hover, selection, drag, camera, reduced-motion support) — see §12; §12 also carries a same-day revision note (§12.11) superseding its original CSS-ambient-motion/color/spacing/background description with the real physics-simulation rewrite that replaced it — read §12.11 before trusting §11.2/§12.3/§12.5's numbers. Milestone 6: Inspector Panel — see §13. The renderer/layout/physics/color/spacing baseline is now explicitly FROZEN ("do not redesign... unless strictly required for the next milestone — a dedicated Visual Polish sprint happens at the end") — functionality is next: Search and Category Filters remain unbuilt (roadmap order: Inspector Panel ✓, Node Selection ✓, Hover States ✓, Search, Category Filters, Advanced Physics Polish).**

### 0. Grounding — what already existed, what this reuses

This sprint follows the same engineering process the Manifest Constellation sprint used (audit → architecture approval → milestone-gated implementation), and reuses several of its already-proven pieces directly rather than re-deriving them:

- `resolveTechLogo()`/`colorHash.ts` (icon and deterministic-color resolution) — planned reuse for the real renderer (not needed yet by Milestone 1's placeholder view).
- `useConstellationViewport` — generic enough (`layout: {width,height}`, optional `reservedChromeRefs`) to reuse directly for the graph's pan/zoom/fit once the real renderer needs a viewport (Milestone 5).
- The `parseManifest`-style "pure function, raw text in, typed model out, undefined on anything unusable" contract — mirrored exactly by `loadGraphModel()` below.
- `EditorRenderer.tsx`'s dispatch chain — extended, not replaced (see §2).

### 1. Why this is generic "graph infrastructure," not a "skills" feature

Everything under `src/graph/` and `src/components/graph/` is written with zero references to "skills" — the domain-specific content (the six categories, the actual technologies) lives only in `skills/skills.graph`'s own YAML. The renderer is selected by `FileType === 'graph'`, not by filename, so a future `resume.graph` or `projects.graph` gets the identical Knowledge Graph Renderer for free, with no renderer change — the same principle `isManifestFile`'s filename-based match deliberately does *not* offer, and the reason this file match is type-based instead (see `graph/fileMatch.ts`'s own comment for the explicit contrast).

### 2. Visualization Registry

```ts
interface VisualizationDefinition {
  id: string;
  matches: (file: VirtualFile) => boolean;
  component: ComponentType<{ file: VirtualFile }>;
}
registerVisualization(definition): void
resolveVisualization(file): VisualizationDefinition | undefined
```

`EditorRenderer.tsx`'s `renderFileContent()` now ends with `resolveVisualization(file)` checked immediately before the `ShikiEditor` fallback — after every existing hardcoded branch (Markdown, `work_history`, Mermaid, Manifest), all left completely untouched. **Explicit scope decision**: this sprint does not migrate Markdown/Mermaid/Manifest/WorkHistory/Resume onto the registry — it only needs to prove itself hosting the Knowledge Graph Renderer. Retrofitting the existing renderers onto the same registry is a deliberate, named future refactoring sprint, not an oversight.

Registration happens via a side-effect import (`import '../../graph/registerBuiltins'` in `EditorRenderer.tsx`) — the one place that actually needs the registry populated before first render.

### 3. Source format — real YAML, not JSON-in-yaml

Unlike `manifest.yaml` (JSON text, avoiding a parser dependency, since it's never shown raw anyway), `skills.graph`'s content is genuine YAML, parsed via the `yaml` npm package (newly added; zero existing YAML parser in this repo before this sprint). Explicit, approved trade-off: maintaining the illusion that every workspace file is a real developer-authored artifact was judged more valuable than avoiding one small dependency.

### 4. Graph Model

```ts
interface GraphNode {
  id: string; name: string; category: string;         // required
  icon?, description?, proficiency?, proficiencyPercent?,
  years?, isCore?, projects?, relatedNodes?, prerequisites?,
  strengths?, documentation?, tags?, notes?;             // all optional
}
interface GraphCategory { key: string; title: string; nodes: GraphNode[] }
interface GraphModel { title: string; description: string; categories: GraphCategory[] }
```

Named optional fields (not an untyped attributes bag) — deliberate, matching `ManifestTechnology`'s precedent: the Inspector Panel needs to render a real progress bar / strengths checklist / project list, which an untyped bag would only relocate the problem into, not solve, for a portfolio that will realistically only ever have 2-3 graph types.

`relatedNodes` is intentionally **not** rendered as a permanent graph edge — approved decision: cross-category relationships surface only in the Inspector Panel and as a temporary highlight on hover/select (Milestone 7/9), keeping the graph itself a clean, uncluttered tree.

### 5. Content — `skills/skills.graph`

Replaces the old `skills/frontend.yaml` + `skills/backend.yaml` (both removed, in both `src/content/workspaceSeed.ts` and `server/repositories/seed/workspaceSeed.ts`, which must stay byte-identical per existing convention). 37 nodes across the 6 approved categories (Programming Languages, Frontend, Backend, Artificial Intelligence, Cloud, Developer Tools). Content-grounding rule followed per explicit instruction: `projects`/`notes` only cite what `src/components/resume/data/fullstack-ai.ts` (verified verbatim against the real resume PDF) or `manifest.yaml`'s own Cortexa tech list already document as fact; `proficiency`/`proficiencyPercent`/`years` are left unset on every node — nothing in the source resume states a per-skill duration or percentage, so none was invented. Full rationale in the comment directly above `SKILLS_GRAPH_YAML` in `workspaceSeed.ts`.

### 6. What Milestone 1 does *not* include (by design, not oversight)

Graph Builder (relationships-only, no coordinates), Layout Engine (`LayoutStrategy` interface + `RadialLayout`), Physics Engine (spring/tether/repulsion/noise), the real SVG node/edge renderer, viewport, Inspector Panel, hover, search, and filters are all explicitly out of scope for this milestone per the approved brief ("Do not begin layout, rendering, interactions or physics yet"). `KnowledgeGraphViewer.tsx` today is a flat category/node-count list proving the pipeline end to end (file → registry → component → `loadGraphModel` → `GraphModel`) — not meant to survive once Milestone 3/4 land.

### 7. One real bug caught during this milestone

`tsc --noEmit` passing on the new `'graph'` `FileType` union member did **not** catch a second, separate runtime whitelist: `server/types/vfs.types.ts`'s `FILE_TYPES` array (used by `isValidFileType()`, which `server/repositories/validation.ts` calls on every workspace-tree load) is a parallel, hand-maintained list the type checker can't see into. Missing the addition there took the backend down entirely (`WorkspaceIntegrityError: File "skills_graph" has invalid type "graph"`, crashing `InMemoryFileNodeRepository`'s constructor on startup) — caught via a live `curl` check against `/api/health`, not by the type checker. Fixed by adding `'graph'` to `FILE_TYPES` alongside the type union. Worth remembering for any future `FileType` addition: the TS union and this runtime array are two sources of truth that don't currently derive from each other.

### 8. Next milestone (superseded)

~~Milestone 2 (Graph Builder) — pending review of this milestone.~~ Shipped; see §9.

### 9. Graph Builder (Milestone 2)

**Status: shipped 2026-07-31, approved.** Consumes the Milestone 1 `GraphModel` and produces `GraphBuildResult` — the single source of truth every renderer, layout, and interaction layer downstream reads from. No SVG, no animation, no physics, no viewport, no coordinates: purely relationships. Files: `src/graph/builder/{types,validate,buildGraph,traversal}.ts`.

### 9.1 Why a three-node-kind union, not one generic node type

`GraphBuildNode` is `GraphRootBuildNode | GraphCategoryBuildNode | GraphLeafBuildNode`, a fixed two-level tree under one synthetic root (root -> category -> leaf):

```ts
interface GraphRootBuildNode { kind: 'root'; id: string; label: string; description?: string; depth: 0 }
interface GraphCategoryBuildNode { kind: 'category'; id: string; key: string; label: string; depth: 1 }
interface GraphLeafBuildNode { kind: 'leaf'; id: string; label: string; categoryKey: string; depth: 2; source: GraphNode }
```

A single node type with every field optional would let a renderer misread a category node's absent `source` as "a leaf with no data" instead of "not a leaf." The union makes that a compile error instead of a runtime guess. `source` on the leaf carries the full Milestone 1 `GraphNode` untouched (icon, description, proficiency, `relatedNodes`, etc.) — the builder never copies or reshapes those fields, only wraps them.

Root and category ids are namespaced (`graph:root`, `graph:category:<key>`) so they can never collide with an author-chosen leaf id (`react`, `python`, ...); leaf ids are used verbatim since Milestone 1's YAML already treats them as globally unique within one graph.

### 9.2 GraphBuildResult

```ts
interface GraphBuildResult {
  nodes: GraphBuildNode[];             // root, then categories, then leaves — authored order
  edges: GraphBuildEdge[];             // structural parent->child only: root->category, category->leaf
  rootNode: GraphRootBuildNode;
  categoryNodes: GraphCategoryBuildNode[];
  leafNodes: GraphLeafBuildNode[];
  nodeById: Map<string, GraphBuildNode>;
  childrenById: Map<string, string[]>;
  parentById: Map<string, string | undefined>;
  neighborsById: Map<string, string[]>;  // parent + children (tree adjacency)
  categoryLookup: Map<string, GraphCategoryBuildNode>;
  warnings: GraphValidationWarning[];
}
```

**`edges`/`neighborsById` are structural only** — they mirror the root->category->leaf tree, not `relatedNodes`/`prerequisites`. This carries forward Milestone 1's already-approved decision (§4: "`relatedNodes` is intentionally not rendered as a permanent graph edge") rather than reopening it. `relatedNodes`/`prerequisites` are still fully validated (§9.3) and remain readable off `leaf.source` for the Inspector Panel/hover-highlight to use later — they just don't become a second edge set the Layout Engine would have to reconcile against the tree.

### 9.3 Validation strategy

Runs during `buildGraph()`, never throws, never silently drops a problem — every issue becomes a typed `GraphValidationWarning` (`{ type, nodeId, message }`) collected in the result *and* `console.warn`'d immediately, so a broken YAML edit surfaces in the dev console the moment it's saved, not just when something inspects `result.warnings` later.

| Check | Type | Behavior on failure |
|---|---|---|
| Duplicate category key | `duplicate-category` | Skip the repeat, keep the first |
| Id collides with an existing node (category/root/leaf) | `duplicate-id` | Skip the offending node |
| Leaf's `category` field disagrees with its actual parent, but names a real category | `category-mismatch` | Warn; structural nesting still wins |
| Leaf's `category` field names no category that exists at all | `missing-category` | Warn; structural nesting still wins |
| `relatedNodes`/`prerequisites` entry references a nonexistent leaf id | `invalid-related-node` / `invalid-prerequisite` | Warn; reference left as-authored |
| `relatedNodes`/`prerequisites` entry names the node itself | `self-reference` | Warn |

Verified against the real `skills.graph` content (37 nodes, 6 categories): zero warnings. Verified separately against a deliberately broken fixture (wrong category, dangling related-node id, self-reference) to confirm each rule fires independently without the build aborting.

### 9.4 Deterministic ordering

`GraphModel.categories`/`.nodes` are arrays (not object keys), so authored YAML order is already deterministic; `buildGraph()` processes them in one top-to-bottom pass and never aggregates through a Set/Map whose iteration order could vary. `nodes`/`edges`/`childrenById` are therefore always byte-identical for the same input — no extra sort step was needed beyond honoring the order the YAML already declares.

### 9.5 Traversal API

`src/graph/builder/traversal.ts` exports plain functions taking the result as their first argument — not methods on the result object, matching this codebase's existing "data and behavior kept separate, no classes" convention (`loadGraphModel`, `buildConstellationGraph`):

```ts
getChildren(result, id): GraphBuildNode[]
getParent(result, id): GraphBuildNode | undefined
getNeighbors(result, id): GraphBuildNode[]        // parent + children
getDescendants(result, id): GraphBuildNode[]       // BFS, excludes id itself
getAncestors(result, id): GraphBuildNode[]         // walk to root, excludes id itself
```

All five are the intended foundation for hover, selection, highlighting, search, filters, and every future layout — nothing downstream should ever walk `childrenById`/`parentById` directly.

### 9.6 Remains generic

Nothing in `src/graph/builder/` references "skills," a category name, or any specific domain — same guarantee Milestone 1 established for `src/graph/`. A future `resume.graph`/`projects.graph` gets the identical Graph Builder for free.

### 9.7 Graph Statistics (approved refinement, shipped alongside Milestone 3)

`GraphBuildResult` gained a `statistics: GraphStatistics` field, computed once in `buildGraph()` (`src/graph/builder/statistics.ts`) rather than left for a consumer to derive:

```ts
interface GraphStatistics {
  totalNodes: number; totalEdges: number; totalCategories: number;
  maxDepth: number; isolatedNodes: number; averageChildren: number;
}
```

`isolatedNodes` counts nodes with zero tree neighbors (generic degree-0 check via `neighborsById`, not "leaf with no parent" specifically) — always 0 for any graph the current loader can produce, since Milestone 1 already drops empty categories and every leaf has a parent by construction; the check stays generic rather than hardcoding that assumption, so it stays meaningful if that upstream guarantee ever changes. `averageChildren` is `totalEdges / totalNodes` — mean branching factor across every node including leaves (which contribute 0), the least ambiguous denominator to define without picking a domain-specific "which nodes can have children" rule. Verified against `skills.graph`: `{ totalNodes: 44, totalEdges: 43, totalCategories: 6, maxDepth: 2, isolatedNodes: 0, averageChildren: 0.977 }`.

### 9.8 Next milestone (superseded)

~~Layout Engine (`LayoutStrategy` interface + `RadialLayout`, coordinates only) — pending review of this milestone.~~ Shipped; see §10.

## Layout Engine (Milestone 3)

**Status: FROZEN and approved for Sprint 11, 2026-07-31**, at the pass-3 (force-relaxed, scattered-leaf) implementation. Files: `src/graph/layout/{types,radialLayout.ts}`.

Four passes were built over the course of this milestone:

1. **Uniform wheel** (equal `360°/N` wedges, one shared leaf ring) — rejected: read as "a radial topology diagram."
2. **Jittered polar formula** (weighted wedges + hashed angle/radius jitter, leaves fanned within a local arc) — closer, but still rejected: category radii clustered too tightly (`292–348`) to break the "invisible ring," and leaves-on-an-arc still read as a fan.
3. **Force-relaxed, scattered leaves** (the frozen baseline, described below) — seeded categories/leaves, then relaxed to equilibrium via repel/spring. Called "by far the strongest version" and ~90% complete.
4. **Composed** — a further artistic pass (weight-driven silhouette size + a deterministic walk seeding leaves instead of scattering them, for declaration-order visual flow) was implemented and reviewed favorably, but then **explicitly reverted** per sprint-direction: "good enough for this sprint... further tuning is producing diminishing returns," with development effort redirected to the renderer (Milestone 4). `radialLayout.ts` and `types.ts` were reverted byte-for-byte to their pass-3 state. Pass 4's design (weight-driven `clusterScale`, the meandering-walk leaf seed, its own trade-offs) remains recorded below for anyone who revisits the layout later — it is not live code.

### 10.1 Why pass 2 still failed, and what a force relaxation fixes

Pass 2 added per-category jitter to angle and radius, but a symmetric formula applied independently per node still produces a suspiciously uniform *spread* — every category's radius jitter was drawn from the same ±22% band around the same base, so the actual output band (`292–348`) was even tighter than the input band, because nothing in a pure per-node formula lets categories negotiate with each other. The fix isn't more jitter; it's replacing "assign a position" with "settle into a position": seed a starting guess per category, then let repulsion (push categories apart) and a spring (pull each category toward its own target distance) iterate to equilibrium. Two properties of that equilibrium matter:

- With a **strong-enough spring**, each category actually holds close to *its own* target radius instead of being smoothed toward the group average — this was the first bug found empirically: an initial attempt used a weak spring (`springK = 0.06`) and measured output radii of `234–268`, tighter than the `292–348` pure-jitter version it was meant to improve on. N repelling bodies tethered to a shared center by a weak spring settle toward a near-regular polygon almost regardless of their individual targets — repulsion alone is a homogenizing force. Strengthening the spring (`springK = 0.2`) and widening the target range by category weight fixed this: category radii now range `158–420`, a `2.6×` spread.
- The same fix applies one level down: each category's own leaves are seeded at **scattered, non-angular points** (2D hash jitter, not "evenly spaced across an arc plus a little jitter") and relaxed with their own strong individual spring, so leaf-to-parent distances within one category now range as widely as `50–188` (Backend) instead of clustering near one shared local radius.

### 10.2 A hashing bug worth recording

While tuning the per-category anisotropic stretch, `aspectX` and `aspectY` came out numerically identical for every category — `hashStringToIndex`'s hash is a left-to-right rolling hash (`hash = hash*31 + charCode`), so a string's *first* characters get multiplied by the largest powers of 31 (real mixing) while its *last* character only contributes `×1`. Seeds like `` `${category.id}:aspectx` `` vs `` `${category.id}:aspecty` `` differ **only in their final character**, so the two hashes differed by exactly 1 before the modulo — a negligible difference after normalizing to `[0,1)`. Fixed by moving the distinguishing token to the front of the seed string (`` `aspectx:${category.id}` `` vs `` `aspecty:${category.id}` ``), which gets real divergence from the hash. Worth remembering for any future id-seeded jitter in this codebase: **suffix-only differentiation on a rolling hash barely differentiates at all.**

### 10.3 LayoutStrategy

```ts
interface LayoutStrategy {
  id: string;
  layout(result: GraphBuildResult): PositionedGraph;
}
export const RadialLayout: LayoutStrategy = { id: 'radial', layout };
```

The only implementation, per the explicit instruction not to scaffold placeholder strategies. The Renderer (Milestone 4, §11) is written against `PositionedGraph` alone and has no dependency on this interface or on `radialLayout.ts` — a future second `LayoutStrategy` can be swapped in with zero renderer changes.

### 10.4 Coordinate generation strategy (frozen baseline)

World-space coordinates, not normalized `[0,1]` — same contract as `manifest/constellationLayout.ts`. A shared, generic relaxation function (`relax(initial, anchor, restLengths, options)`) implements a fixed-iteration, Fruchterman-Reingold-style pass: every pair of points repels (`repulsionK / distance²`), every point is tethered to `anchor` by a spring toward its own rest length, and per-iteration movement is capped by a linearly-cooling step size so the system settles rather than oscillates. Pure arithmetic, no randomness inside the relaxation itself — used twice, at two scales:

**Macro (hub ↔ category):**
1. Seed: weighted-wedge angle (weight = leaf count + floor of `2`) for a non-degenerate starting angle, and a target radius that already varies by weight (`HUB_CATEGORY_WEIGHT_RADIUS_RANGE = 0.6`) plus `±30%` id-seeded jitter (`HUB_CATEGORY_RADIUS_SEED_JITTER`) around a base of `250` (`HUB_CATEGORY_BASE_RADIUS`).
2. Relax for `90` iterations (`MACRO_ITERATIONS`) with `repulsionK = 16,000`, `springK = 0.2`, step cooling linearly from `14` to `0`.
3. Final category position = wherever that settles — no longer decomposable into a clean `r(θ)` formula.

**Micro (category ↔ its own leaves), entirely in the category's own local space:**
1. Seed: each leaf at an independent 2D hash-jittered point within a `50`-unit disk (`LOCAL_SEED_RADIUS`) — deliberately NOT an angle assigned by sibling index, which is what produced the fan in earlier passes. Target radius per leaf = `92` (`LOCAL_CLUSTER_BASE_RADIUS`) `× (1 ± 45%)` (`LOCAL_RADIUS_SEED_JITTER`), id-seeded per leaf.
2. Relax for `70` iterations (`MICRO_ITERATIONS`) with `repulsionK = 2,600`, `springK = 0.14`, step cooling from `9`.
3. Apply a per-category anisotropic transform: independent stretch on each axis (`ANISOTROPY_MIN..MAX = 0.65..1.55`, hashed from the category's own id) then a rotation (also hashed) — gives each category its own silhouette instead of a uniform blob.
4. Translate onto the category's final macro position.

Every seed value comes from `hashStringToIndex` (`manifest/colorHash.ts`, reused not reimplemented). Verified: two calls to `RadialLayout.layout()` on the same `GraphBuildResult` produce byte-identical output.

### 10.5 Spacing / collision safety

No minimum-spacing *formula* — repulsion in the relaxation itself keeps siblings and categories from literally overlapping, verified empirically: minimum pairwise distance between category nodes `181` (footprint sum `56`), minimum sibling distance within any one category `58` (footprint sum `40`). Trade-off (§10.8): empirical per-graph-shape, not a closed-form guarantee for an arbitrary future graph.

### 10.6 Category distribution strategy

Categories are walked in the graph's own authored order for seeding; weight (leaf count + floor) shifts both the seed angle (via wedge share) and the target radius, but the *final* arrangement is whatever the relaxation settles to. Cloud (2 leaves) settled at radius `158`; Backend (9 leaves) settled at `420` — a `2.6×` spread driven by weight-influenced seeding plus relaxation.

### 10.7 PositionedGraph

```ts
interface PositionedGraph {
  nodes: PositionedNode[];       // GraphBuildNode & {x, y}
  edges: PositionedEdge[];       // {from, to, fromPoint, toPoint}
  bounds: LayoutBounds;
  center: Point;
  radius: number;                // measured from actual positions
  categoryRings: CategoryRing[]; // per-category settled angle/radius, mean leaf radius, local aspect + rotation
  viewportPadding: number;
  statistics: GraphStatistics;
  layoutMetadata: LayoutMetadata; // { strategy: 'radial', hubCategoryBaseRadius, localClusterBaseRadius, angleOffsetRadians, categoryRelaxationIterations, leafRelaxationIterations }
}
```

This is the exact, frozen contract the Renderer (§11) consumes.

### 10.8 Trade-offs

- **Empirical collision safety over a proven spacing formula** — flagged rather than silently assumed safe; worth re-verifying if a future `.graph` file has a much larger or more skewed category.
- **Tuned constants over derived ones** — `repulsionK`/`springK`/iteration counts were tuned empirically against `skills.graph`'s actual shape; a graph with very different scale might need retuning.
- **`LayoutStrategy` interface with one implementation, no registry** — still judged premature; nothing yet needs to pick a strategy at runtime.
- **Frozen at "~90% complete" rather than pursued to 100%** — an explicit sprint-scoping call: the renderer, interaction model, and visual language were judged to contribute more to the finished product than further coordinate tuning. Revisit only if the renderer surfaces an actual structural issue with the coordinates it's given.

### 10.9 Pass 4 (implemented, reviewed, then reverted — not live code)

Recorded for reference only, in case the layout is revisited later. Two changes on top of the frozen baseline:

- **Weight-driven silhouette size**: the per-category anisotropic stretch was split into an overall `clusterScale` driven by the category's own weight (`CLUSTER_SCALE_MIN..MAX = 0.8..1.55`, denser categories scale up — "let larger clusters dominate more space") times a smaller hashed `axisVariation` per axis (`0.85..1.2`) for individual shape. Measured: local-cluster aspect magnitude ranged from Cloud's `0.93/0.78` to Backend's `1.79/1.75`, roughly `2×`.
- **Meandering-walk leaf seeding**: instead of independent scattered points, each leaf was seeded relative to the PREVIOUS leaf's position (fixed step length + gentle angular drift + per-step jitter), so declaration-order siblings ended up spatially adjacent by construction — a traceable path ("AI → LangChain → Vector Stores → OpenAI"), not just organically-spaced points. A much lighter cleanup relaxation (`30` iterations vs. the baseline's `70`) preserved the walk's shape while resolving accidental non-adjacent overlaps.

A scoping note also recorded at the time: that pass's brief illustrated the desired *kind* of variation using this graph's actual category names ("AI can become the visually largest," etc.) — read as illustrative outcomes for this data, not literal per-name hardcoding, consistent with this Layout Engine's standing "must not know about Skills/Frontend/Backend/AI/Cloud" constraint. Both pass-4 mechanisms remained fully generic (leaf count + hashed id only) under that reading.

## Renderer (Milestone 4)

**Status: shipped 2026-07-31, accepted as the frozen visual baseline 2026-08-01** ("the graph is now visually correct... freeze the current renderer unless a genuine functional issue is discovered"). The first production renderer, replacing Milestone 1's flat category/node-count placeholder. Files: `src/components/graph/{graphVisuals.ts,GraphBackground.tsx,GraphEdgeLine.tsx,GraphNode.tsx,KnowledgeGraphScene.tsx}`, plus a rewritten `KnowledgeGraphViewer.tsx`. Milestone 5 (§12) adds interaction/motion on top of these same files without changing any static visual value (color, size, spacing, background).

### 11.1 Pipeline

```
Graph Loader -> Graph Builder -> Layout Engine -> Renderer
loadGraphModel -> buildGraph -> RadialLayout.layout -> KnowledgeGraphScene
```

`KnowledgeGraphViewer.tsx` is the only file that wires the four stages together (one `useMemo` keyed on `file.content`); `KnowledgeGraphScene` and everything under it consumes `PositionedGraph` alone and imports nothing from `graph/builder` or a concrete `LayoutStrategy` — swapping `RadialLayout` for a future strategy touches exactly one line, in one file.

### 11.2 Visual language

Deliberately distinct from `manifest.constellation`'s nebula/star-field aesthetic (that visual language stays exclusive to the Tech Stack Constellation, per explicit instruction): a near-black (`#0b0d10`) flat surface, an extremely subtle grid (`stroke-opacity 0.035`), faint procedural noise (`feTurbulence` + `feColorMatrix`, alpha-only), and a soft vignette — all static, no motion. Three node hierarchies (root > category > leaf) differ in size, ring treatment, and glow restraint (a single small `feGaussianBlur` on the category ring is the only blur anywhere). Technology icons reuse the existing `resolveTechLogo` utility (`src/documentation/techLogos.ts`) rather than a new icon source; category/leaf colors reuse `colorForString` (`manifest/colorHash.ts`) — both existing, generic utilities, not reinvented.

### 11.3 Live verification and a real defect it surfaced

No project-specific run skill existed and the Chrome extension used for browser automation elsewhere in this environment wasn't connected, so verification used headless Chrome directly (`Google Chrome --headless=new --screenshot=...`) against the dev server, navigating to `/journey/skills/skills.graph` (the app's existing `useRouterSync` deep-linking already resolves this path to an exact file match, even though `.graph` isn't in that hook's extension-stripping allowlist — worth fixing whenever another `.graph`-typed file is added, not urgent with only one today).

The real screenshot surfaced one genuine renderer bug: a category's label was always placed directly above the node, which collided with `TypeScript` (a leaf of Programming Languages) because that leaf happened to land above its own category under the force-relaxed layout — nothing in this layout assumes leaves fan outward from the graph center, so "always place the category label above" was never a safe assumption. **Fixed**: `GraphNode`'s label placement now takes a `labelDirection` vector computed once in `KnowledgeGraphScene` — for a category, away from the mean position of its own leaves; for a leaf, away from its own category — instead of a fixed direction or a horizontal-only heuristic. Verified fixed via a second screenshot.

### 11.4 A known issue surfaced, NOT fixed (layout-level, not renderer-level)

The same live check found `langchain` (Artificial Intelligence) and `vercel` (Cloud) sitting `34.2` units apart — the only cross-category leaf pair under `40` units anywhere in the graph (verified by checking all cross-category leaf distances programmatically). Their circles and labels visibly crowd each other in the render. This is a genuine coordinate proximity in the frozen Milestone 3 layout, not something the renderer can or should paper over (no per-pair label-collision avoidance was added — that would be renderer complexity standing in for a layout fix). Per Milestone 3's freeze condition ("revisit only if the renderer surfaces an actual structural issue"), this is reported rather than fixed: it requires touching `radialLayout.ts`, which is out of scope for a "check it visually" request and for Milestone 4 generally. Left for an explicit decision on whether to reopen the Layout Engine.

### 11.5 What was deliberately not built (Milestone 4 scope)

No pan/zoom/viewport system, no hover/selection, no Inspector Panel, no physics, no search/filters, no dragging — all explicitly deferred per the approved brief. Milestone 5 (§12) builds all of these on top without reopening this section's frozen visual design.

## Interaction & Motion Layer (Milestone 5)

**Status: shipped 2026-08-01, pending review.** Milestone 4's renderer is now frozen ("do not continue polishing... unless a genuine functional issue is discovered") — nothing in this milestone changes a base color, size, spacing value, or the background. Everything here is a new layer composed on top. Pipeline:

```
Graph Loader -> Graph Builder -> Layout Engine -> Renderer -> Interaction Layer
```

Files created: `src/hooks/{useGraphInteraction,useGraphMotion}.ts`. Files modified: `src/hooks/useConstellationViewport.ts` (generalized, not forked — see §12.1), `src/components/graph/{KnowledgeGraphScene,GraphNode,GraphEdgeLine}.tsx` (now accept interaction/motion props; no static visual value changed). The Interaction Layer never writes to `PositionedGraph` — every effect below is a presentation-layer offset/opacity/scale applied on top of the frozen layout position, never committed anywhere.

### 12.1 Camera motion — generalized `useConstellationViewport`, not forked

Per this codebase's "evolve don't fork" convention (and ARCHITECTURE.md's own Milestone 3 note flagging this hook as "generic enough... reuse directly for the graph's pan/zoom/fit once the real renderer needs a viewport" — exactly now), the Knowledge Graph reuses `useConstellationViewport` rather than duplicating pan/zoom/fit/focus logic. Two small, additive, backward-compatible generalizations were needed:

- `nodeSelector` option (defaults to `'[data-constellation-node]'`, so the Tech Stack Constellation's existing call site is byte-for-byte unaffected) — lets the hook's "was this click on a node or empty canvas" check work for the Knowledge Graph's own `[data-graph-node]` attribute too.
- `fitToScreenAnimated()` — a new sibling to the existing `fitToScreenManual()` (which stays instant, unchanged), for the one case Milestone 5 explicitly asks to ease that Milestone 3's viewport never needed: an explicit user-triggered re-fit (clicking empty canvas to deselect). The very first mount fit stays instant regardless — a file must never visibly "fly in" on open.

Selecting a node (click or drag-release) calls the hook's existing `focusOnNode()`, exactly how `ConstellationScene` already uses it — the same `FOCUS_TRANSITION` (`0.8s`, `[0.22,1,0.36,1]` ease) both systems already share, comfortably inside the requested 400-600ms-ish "eases, never jumps" range (this ease is on the punchier/quicker end of what "600ms" implies since it's inherited unmodified from an already-tuned, already-shipped animation rather than re-tuned per-request).

### 12.2 Hover, selection, and highlighting — `useGraphInteraction`

A single hook, generic over any `PositionedGraph` (built only from its own `edges` — reusable by a future graph visualization with zero changes):

```ts
activeId = hoveredId ?? selectedId   // same precedence Constellation's own hover/select already uses
visualStateForNode(id): 'default' | 'active' | 'connected' | 'dimmed'
visualStateForEdge(fromId, toId): same four states
```

`connected` means a DIRECT graph neighbor of `activeId` (built from `positioned.edges` — the real topology, not the Graph Builder's broader `relatedNodes` concept) — "directly connected," per the brief, not Constellation's own full ancestor/descendant chain. Selection persists independently: a selected node stays visually distinguished (an extra thin white ring, `isSelected`) even when a *different* node is being hovered, satisfying "keep it highlighted" without a second parallel state machine — hover and selection share the same visual-state derivation, selection just adds one small always-on marker on top.

Click-to-select toggles (clicking the same node again deselects — "single node selected at a time," never a dead click). Clicking empty canvas clears selection and calls `fitToScreenAnimated()`.

### 12.3 Ambient motion — `useGraphMotion`, and where it lives (CSS, not Motion)

`ConstellationStar.tsx` already established a working split in this codebase: **plain CSS `@keyframes` for infinite/ambient loops, Motion for discrete/interactive transitions** — an infinite CSS animation costs nothing per React render and never contends with Motion's own transform handling. Milestone 5 follows the identical split:

- `useGraphMotionTiming(nodeId)` returns per-node **timing values only** (float duration/delay + three drift waypoints, breathe duration/delay/peak-scale) — deterministically hashed from the node's own id via `hashStringToIndex` (`manifest/colorHash.ts`, reused), never `Math.random`. Three waypoints (not a single back-and-forth pair) so the drift path reads as gentle wandering rather than an obviously-looping sine wave.
- The actual animation is two `@keyframes` blocks declared once in `KnowledgeGraphScene`'s `<defs><style>` (`graph-node-float`, `graph-node-breathe`), applied per node via inline custom properties (`--float-x1`, `--breathe-scale`, etc.) — exactly `ConstellationStar`'s own `--float-dx`/`--float-dy` technique.
- A third keyframe, `graph-edge-breathe`, gives every edge a barely-perceptible ambient opacity oscillation (`0.85 -> 1.0`), multiplying with (not replacing) its state-driven `stroke-opacity`.

All three are skipped entirely when `prefersReducedMotion()` (`src/lib/typingReveal.ts`, reused — the same one-shot check `ManifestConstellation.tsx` already uses, not a new hook) returns true.

### 12.4 A documented Motion+SVG bug this milestone deliberately avoided

`ConstellationScene.tsx` carries its own comment documenting a real bug: animating `scale` via Motion's `animate` prop on an SVG element resolves `transform-origin` to the element's *content bounding box center* rather than the origin actually wanted — for a symmetric shape this is invisible, but the Knowledge Graph's per-node label sits *asymmetrically* beside its circle, so a bbox-center origin would visibly shift the circle on hover-grow. This milestone therefore does hover-grow (`~8%`) and idle-breathing via plain **CSS** `transform: scale(...)` with `transform-box: fill-box; transform-origin: center` — well-supported, well-understood, and immune to the Motion-specific issue — reserving Motion for the one thing here that's pure translation (drag), which the bug can't affect at all (transform-origin is meaningless for a pure translate). Each node nests four independent transform layers, outermost to innermost, so no two ever fight over the same CSS property:

```
translate(layout x, y)         <- static, from PositionedGraph, plain attribute
  -> Motion: drag offset        <- spring on release, 1:1 while dragging
    -> CSS keyframe: idle float
      -> CSS keyframe: breathing
        -> CSS transition: hover grow
```

### 12.5 Drag — presentation-only offset, spring-back, never touches topology

`useGraphInteraction`'s `dragState = { nodeId, offset, isDragging }` is the ENTIRE drag model — `offset` is a world-space `Point` (screen-space pointer delta ÷ current viewport scale, so a drag feels 1:1 with the cursor at any zoom), applied by `GraphNode` as a Motion `animate={{x: offset.x, y: offset.y}}` on top of the node's real, unchanged `translate(layout x, y)`. While `isDragging` is true, `transition={{duration: 0}}` (1:1 tracking, no lag); on release, `transition={{type:'spring', stiffness:300, damping:22}}` eases the offset back to `{0,0}` — nothing about the node's actual `PositionedGraph` entry is ever read for writing or mutated.

Connected edges follow the SAME offset via `GraphEdgeLine`'s `dragEndpoint` prop (which endpoint, the same offset, the same `isDragging` flag) — since both the node and its edges receive the identical target and the identical spring config in the same React commit, Motion runs matching independent spring animations that stay visually attached at every frame (spring physics with identical parameters and identical start/end delta trace the same curve, regardless of which element it's applied to). No shared `MotionValue`, no manual per-frame state pushing needed.

Releasing also selects the dragged node (a release with near-zero movement reads the same as a click) and calls `focusOnNode` — this composition (drag-end triggers select triggers camera) is orchestrated by `KnowledgeGraphScene`, not `useGraphInteraction`, keeping the hook itself free of any viewport-specific knowledge.

**Nodes may never disconnect, topology never changes**: trivially true by construction — `offset` is never written back into `positioned`, `edge.from`/`edge.to` never change, and the Graph Builder/Layout Engine are never invoked again after the initial `RadialLayout.layout()` call. A drag is 100% presentation state that resets to zero on release.

### 12.6 Verification — real browser, real pointer events, not staged

No project-specific run skill existed, and the Claude-in-Chrome extension used elsewhere in this environment wasn't connected, so verification used **Puppeteer (`puppeteer-core`, installed in an isolated scratch directory — not added to this project's `package.json`/`node_modules`)** driving the system's actual Chrome via `--remote-debugging-port`, against the real dev server. This gave real mouse move/down/up sequences, not just static screenshots:

- **Idle floating/breathing**: two screenshots of the same idle graph, 4 seconds apart, pixel-diffed. `11,915` pixels changed by more than a small threshold, localized entirely to the graph's own nodes/edges/labels (confirmed via an amplified diff image) — every node moved slightly, none in an obviously uniform/synchronized pattern.
- **Reduced motion**: with `prefers-reduced-motion: reduce` emulated, a node's on-screen x-position was queried twice, 4 seconds apart — **byte-identical** both times (`1201.71923828125` exactly), confirming idle motion is fully disabled. Selection was then triggered the same way — the root node's on-screen position moved (`979.18 -> 1184.23px`), confirming the camera-focus ease still runs under reduced motion, matching "Keep: selection, hover, viewport."
- **Hover**: hovering `react` and diffing before/after showed the node's own area change most (new glow + grow), its parent `Frontend` brighten moderately (`connected`), consistent with the intended three-tier response.
- **Selection**: clicking the `Artificial Intelligence` category node produced a full-frame change — the node grew/glowed, the camera visibly eased toward it, its direct children brightened, and unrelated clusters (Backend, Frontend, Developer Tools, Programming Languages) dimmed but stayed legible.
- **Drag + spring-back, verified numerically, not just visually**: dragging `nodejs` and sampling its on-screen position relative to `Backend` at increasing delays after release showed it converging to a stable value — but a *different* absolute screen value than before the drag, because releasing also re-focuses the camera (change of zoom scale). Cross-checked against a THIRD, never-dragged reference node (`expressjs`) to compute the actual camera scale change (`1.5067×`), then used that to predict what the settled Backend→Node.js vector *should* be if the spring had returned the node to its exact original relative position: predicted `(-116.8, 39.4)` vs. measured `(-122.1, 38.9)` — a `5.3px` / `0.5px` residual at the post-zoom scale (≈`3.5px` in world space), confirming the spring-back genuinely returns to the frozen layout position rather than drifting.
- **Camera easing on deselect**: clicking empty canvas cleared the selection and eased the view back to the full-graph fit.

A screen recording of this exact sequence (captured frame-by-frame the same way, assembled into a GIF) accompanies this milestone's review.

### 12.7 A test-tooling lesson worth recording

Early verification runs showed selection appearing to do nothing. The cause was in the **verification script**, not the app: `getBoundingClientRect()` on a node's outer `<g>` includes its label text, and a category's label can extend far enough sideways that the group's bbox CENTER lands on empty space (or on a neighboring node's label) rather than on the actual circle — clicking that computed "center" missed the node entirely. Fixed by querying the node's own `<circle>` specifically. Worth remembering for any future automated interaction test against this renderer: **click the geometry, not the group's bounding box.**

### 12.8 A genuine issue this surfaced (not fixed — Layout Engine is frozen)

The same rigor applied to `langchain`/`vercel` (already flagged as a coordinate-proximity concern in §11.4) revealed it's worse than cosmetic: `document.elementFromPoint()` at `langchain`'s own circle center returned `vercel`'s **text label**, not `langchain`'s circle — meaning `langchain` is genuinely un-hoverable/un-draggable at that exact point, since a later-painted sibling's label captures the pointer event first. This elevates the finding from "visually crowded" (Milestone 4) to "an interaction is unreliable at this specific coordinate" (Milestone 5) — still a Layout Engine matter (34 world-unit proximity, the only cross-category pair that close), not something the Interaction Layer should paper over with per-pair click-target logic. Verification substituted an unaffected node (`nodejs`) to confirm the drag mechanic itself works correctly; this proximity issue is reported, not fixed, per the explicit freeze on both the Layout Engine and the Renderer this sprint.

### 12.9 Performance

44 nodes + 43 edges, each with up to 2-3 concurrent CSS keyframe animations (float, breathe, edge-breathe) plus Motion watching for drag/opacity changes — trivial for a graph this size. All ambient motion is CSS-driven (compositor-accelerated `transform`/`opacity`), so idle motion costs zero React re-renders; only hover/selection/drag state changes trigger a render, and only for the ~44-node component tree (not a virtualized/windowed structure, unnecessary at this scale).

### 12.10 What was deliberately not built (per explicit instruction)

Inspector Panel, search, filters, a physics redesign, new `LayoutStrategy` implementations, and further rendering polish — all explicitly deferred to later milestones.

### 12.11 Revision (2026-08-01, same day): motion + visual refinement — supersedes §11.2, §12.3, §12.5

Two same-day follow-up passes revised what shipped above, before any of it was reviewed/committed. Recorded here rather than rewriting §11/§12 in place, per this codebase's "evolve, don't fork — but don't silently overwrite history either" documentation convention.

**Visual (supersedes §11.2's `#0b0d10`-flat-surface/noise/vignette description and the original saturated curated palette)**: background changed to reuse `ArchitectureCanvas.tsx`'s own canvas exactly — solid `#1e1e1e` fill + a static 24x24px dot grid (`#333333` dots), rendered in its own un-viewBox'd sibling `<svg>` (`GraphBackground.tsx`) rather than inside the content SVG's viewBox'd coordinate system. That distinction mattered: the original background lived inside the content SVG, sized to the graph's own world-space bounds, which only fills the actual container when the container's aspect ratio happens to match the bounds' aspect ratio — confirmed live with an extreme 1530x213 test container against a roughly-square ~1209x1253 viewBox, `preserveAspectRatio`'s default letterboxing left ~660px bare (no background at all) on each side. Node colors were replaced twice — first with a curated, pixel-sampled-from-reference palette (`languages` blue, `frontend` orange, `backend` teal, `ai` amber, `cloud` pink, `devtools` green — see `CURATED_CATEGORY_COLORS` in `graphVisuals.ts`, a deliberate narrow exception to "never a hardcoded per-category palette," with a hash-derived fallback for any category key outside this table so a future graph file's own categories stay domain-agnostic), then flattened further (lower saturation, smaller/fainter glow discs, tighter blur radius) to read as matte engineering software rather than neon. `radialLayout.ts`'s `HUB_CATEGORY_BASE_RADIUS` (250->290) and `LOCAL_CLUSTER_BASE_RADIUS` (92->112) were bumped ~16-22% for breathing room — the one explicitly-authorized exception to the Layout Engine's freeze ("slightly increase spacing... not a redesign").

**Motion (supersedes §12.3's CSS-`@keyframes`-idle-float description and §12.5's Motion-driven-drag-offset description)**: idle drift and dragging no longer live in `useGraphMotion.ts`/Motion's `animate` prop at all. Replaced with a single continuous force simulation, `src/hooks/useGraphSimulation.ts` — every node has a live `pos`/`vel` that perpetually spring-settles toward its frozen Layout Engine anchor, perturbed by a continuous hash-seeded value-noise force (`src/graph/motion/valueNoise.ts` — deliberately NOT a sine wave, so the system never exactly repeats and never comes to rest) and an averaged pull from each structural neighbor's own current displacement-from-anchor, scaled by that neighbor's mass. Dragging is not a separate code path: a dragged node's momentary "anchor" becomes the cursor's world-space target, pulled toward with a stronger spring constant but integrated through the identical velocity system, so release carries real momentum into the ambient spring-back instead of snapping. The simulation writes `transform`/`x1,y1,x2,y2` DOM attributes directly every animation frame — React never re-renders for ambient motion or dragging, only for discrete hover/select state (`useGraphInteraction.ts` was narrowed to hover/selection only; drag state moved out of it entirely). `useGraphMotion.ts` still exists but now owns only the cosmetic breathe-scale timing, which stayed a plain CSS `@keyframes` loop (a genuinely periodic cosmetic pulse, unlike position drift, which the simulation deliberately keeps non-periodic).

Mass hierarchy (root heaviest/calmest, category mid, leaf lightest/most mobile) and the "dragging a category noticeably pulls its children, dragging a leaf barely nudges its category" asymmetry both fall out of the same mass ratio — nothing in the simulation special-cases node kind directly. Measured live (SVG `transform` attribute parsing across an 18s window, isolated fresh-page-load tests for the drag asymmetry): leaf drift ~3.8px / category ~1.3px / root ~1.1px max amplitude; dragging a category moves a leaf child up to ~54px, dragging a leaf moves its category only ~1.4px. Camera framing confirmed byte-identical (`transform` style string) across independent page loads — deterministic layout in, deterministic fit out, so the graph opens in the same exact spot every time, matching an explicit requirement.

**Three real bugs, caught only by direct measurement, not code review** (worth recording since they're the kind of thing that looks fine in a screenshot and isn't): (1) neighbor coupling was initially summed rather than averaged across neighbors, so a high-degree node (root's 6 categories, a category's many leaves) accumulated force proportional to raw connection count — measured live, this inverted the intended mass hierarchy (root drifted *more* than leaves). Averaging fixed it, and sharpened the drag asymmetry into exactly what was wanted as a side effect. (2) The noise function looked frozen (near-zero drift) because this codebase's existing string hash (`hashStringToIndex`) barely changes when only a lattice index's trailing digit changes — adjacent noise samples were nearly identical. Fixed with a proper integer-avalanche mix (`mixInt` in `valueNoise.ts`, the standard MurmurHash3 `fmix32` finalizer) applied to the lattice index specifically. (3) A `WRITE_EPSILON` DOM-write-skip optimization (added after CDP profiling showed simulation script cost at ~1% of wall time — not a real bottleneck, but a legitimate low-risk cleanup regardless) initialized its "last written" sentinel to `NaN`; `Math.abs(x - NaN) > epsilon` is always `false`, so the very first write — and every write after it — was silently skipped, freezing the entire graph including mid-drag. Fixed by using `Infinity` as the sentinel instead.

Logos remain removed (per the original Milestone 5 review) and edge coloring (neutral root->category, category-colored category->leaf) is unchanged from §12's original description. `tsc --noEmit` and `npm run build` both clean after every pass in this revision. Still uncommitted at time of writing, paused for review per the same-day instruction that prompted it ("do not spend additional time polishing the renderer... freeze the current renderer... unless strictly required").

## Inspector Panel (Milestone 6)

**Status: shipped 2026-08-01, pending review.** The renderer/layout/physics/visual baseline (§11, §12, §12.11) is now explicitly frozen for the remainder of the roadmap — this milestone adds a new UI layer on top without touching any of it. Files: new `src/components/graph/InspectorPanel.tsx`; modified `src/components/graph/KnowledgeGraphScene.tsx` (purely additive — a new ref, a shared `deselectAndRefit` helper, an `onKeyDown` handler, and the panel's own render — no existing prop, hook call, or JSX for the graph itself changed).

### 13.1 Data model — nothing invented, nothing new

Entirely data-driven off structures that already existed before this milestone: `PositionedNode`'s three-kind union (root/category/leaf — `src/graph/layout/types.ts`) and, for leaves, the full authored `GraphNode` (`source`, per `src/graph/builder/types.ts`) — icon, description, proficiency, proficiencyPercent, years, isCore, projects, relatedNodes, prerequisites, strengths, documentation, tags, notes, all already declared as named optional fields in `src/graph/types.ts` specifically so a real Inspector Panel could render them without an untyped attributes bag (a Milestone 1 decision, finally paid off here). Every section is conditional on the field actually being present — `skills.graph` never populates `icon`, `proficiency`/`proficiencyPercent`, `years`, `prerequisites`, or `strengths` (confirmed by reading the seed content directly, not assumed), so those sections simply don't render for this graph today; nothing was fabricated to fill them, and nothing UI-side hardcodes an assumption that they're always absent either — a future hand-edited `skills.graph` (or `resume.graph`/`projects.graph`) that populates any of them renders correctly with zero code changes. Category/root panels show structurally-derived facts only (leaf count, category count) — aggregated from `positioned.nodes`, never invented copy.

### 13.2 Interaction — follows `ConstellationInfoCard`'s established conventions, generalized

`manifest/ConstellationScene.tsx`'s `ConstellationInfoCard` (a `top-right`, VS Code-dark-token floating card, `reservedChromeRefs`-integrated, closes on background click) was the closest existing precedent in this codebase for "a selected-node detail panel reacting to graph selection" — this milestone follows the same conventions (position, tokens, a `Field` label/value row) but adds what that card didn't have: real `AnimatePresence` mount/exit transitions and a richer, kind-aware data model. The outer card (`key="inspector-panel"`) stays mounted across a selection change from one node to another; only the inner content (keyed by the selected node's own id) cross-fades — so switching selection never re-triggers the open/close slide and the chrome (border, background, position, size) never flickers, satisfying "no layout shift" and "updates smoothly."

Three deselect triggers — clicking empty canvas, the panel's own close (X) button, and `Escape` — all route through one shared `deselectAndRefit()` in `KnowledgeGraphScene`, so all three behave identically (clear selection, ease back to the full-graph fit) rather than three subtly-different implementations. `Escape` is new to the Knowledge Graph this milestone (`tabIndex={-1}` + `onKeyDown` on the scene's container), matching `ConstellationScene`'s own existing `Escape`-to-deselect convention.

Related/prerequisite/category-children references render as clickable chips (`ChipList`) that call the scene's existing `selectAndFocus` — the same function normal node clicks already use — so cross-navigating from a leaf's "Related" section to another node is indistinguishable from clicking that node directly (camera re-focuses, panel content cross-fades). Verified live: selecting `python`, clicking its "AWS" related chip, landing on AWS's own detail panel showing a reciprocal "Python" related chip back-reference.

### 13.3 Viewport integration — reuses `reservedChromeRefs`, doesn't reopen the viewport hook

The panel's own ref is passed into the existing `useConstellationViewport(..., { reservedChromeRefs: [inspectorPanelRef] })` call already used for the graph's pan/zoom/fit (§12.1) — the same mechanism `ConstellationScene`'s info card already relies on, not a new integration point. `focusOnNode()` (called on every select) already measures `reservedChromeRefs` fresh each time, so selecting a node automatically frames it within whatever area the panel *isn't* currently covering, rather than potentially centering it directly behind the panel. Since the ref is only ever non-null while a node is actually selected (the panel unmounts otherwise, via `AnimatePresence`), this has zero effect on the initial, nothing-selected fit — verified by the fact that no `useConstellationViewport` code changed at all this milestone.

### 13.4 Verification

Live via Playwright driving real Chrome (`channel: 'chrome'` — the Claude-in-Chrome extension still not connected in this environment, the same recurring gap noted in every prior milestone's verification). Confirmed: a rich leaf (`python` — description, projects, notes, related, tags, documentation all present and rendered; proficiency/years/strengths/prerequisites correctly absent since `skills.graph` never populates them) renders every populated field and omits every absent one; a category (`Artificial Intelligence`) renders its correct 7-technology chip list; the root (`Skills`) renders the graph's own description plus a correctly-computed "6 categories · 37 technologies" overview line; clicking a related chip cross-navigates correctly with a reciprocal back-reference; all three deselect paths (X button, Escape, empty-canvas click) correctly close the panel and re-fit the camera. `tsc --noEmit` and `npm run build` both clean. Still uncommitted, paused for review per explicit instruction — do not begin the next milestone (Search) until this one is reviewed.

### 13.5 What was deliberately not built (per explicit instruction)

Search, category filters, and any further physics/visual polish — explicitly deferred to their own later milestones per the roadmap order given (Inspector Panel -> Node Selection -> Hover States -> Search -> Category Filters -> Advanced Physics Polish; Node Selection and Hover States were already shipped as part of Milestone 5/§12, so this milestone's only net-new roadmap item was the Inspector Panel itself).
