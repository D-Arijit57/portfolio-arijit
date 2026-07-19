# Architecture

## Status

This document originated as the Phase 1 (frontend-only) architecture snapshot. `BACKEND_BOOTSTRAP.md` supersedes it on backend matters, and `VFS_DESIGN.md`/`TERMINAL_DESIGN.md` are the canonical, frozen specifications for the VFS and Terminal subsystems respectively — this file does not duplicate their detail.

**Decision (2026-07-19, Sprint 7A)**: rather than adding a new standalone design document per subsystem indefinitely, `ARCHITECTURE.md` is the intended home for subsystem documentation that doesn't rise to the level of an independent, deeply-detailed engine like the VFS or Terminal — starting with Global Search below. Deep, implementation-guiding documents remain reserved for foundational subsystems with their own internal domain models and pipelines.

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
