# VFS Domain Model — Frozen Design

## Status
**Frozen as of 2026-07-15** (revised same day, post stress-test). This document is the canonical domain-model specification for the Virtual File System. It does not replace `BACKEND_BOOTSTRAP.md` — that remains canonical for milestone sequencing and frontend integration mechanics. This document is the entities, invariants, and lifecycle ownership Sprint 2 (`BACKEND_BOOTSTRAP.md` Milestone 2) implements against.

**Revision note (2026-07-15)**: a stress-test walkthrough (300 files + generated GitHub/LeetCode folders + search + playground history) surfaced two architectural contradictions and two missing lifecycle decisions in the first draft of this document. All four are resolved below. See §10 for the point-by-point consistency verification.

**Revision note (2026-07-16)**: Sprint 2C (`BACKEND_BOOTSTRAP.md` Milestone 2, Phase 2 endpoints) surfaced a gap: no repository method existed to persist an edit to an existing file's content — `reconcileGeneratedSubtree` is explicitly scoped away from static content. Added `FileNodeRepository.updateFileContent(id, content)` (§3, §3.1) and the corresponding `FileSystemService` write responsibilities (§4.1) to close the gap before `PUT /api/fs/file/:id` was implemented. §6 (Error Cases) and §7.2 (Ownership) were updated to reflect the new method; no other entity, invariant, or lifecycle decision in this document changed. Re-frozen as of 2026-07-16.

No code is defined here. Interface and method descriptions are contracts to implement against, not implementations.

---

## 1. Domain Entities

### 1.1 `VirtualFile`
Mirrors the frozen frontend contract in `src/types/index.ts` exactly — not renegotiable without a separately-approved frontend change. **This shape is frozen permanently, including across the future lazy-loading evolution described in §9 — that is a design constraint, not an aspiration.**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | Globally unique across the entire tree. Format frozen in §2. |
| `name` | `string` | yes | Display name including extension; must equal the leaf segment of `path` |
| `type` | `FileType` | yes | One of `'markdown' \| 'typescript' \| 'python' \| 'json' \| 'yaml' \| 'toml' \| 'shell' \| 'mermaid' \| 'tsx'` |
| `path` | `string` | yes | Full `/`-delimited path from root; must equal `parentPath + '/' + name` |
| `content` | `string` | yes, always present | Empty file is `""`, never omitted, never `null`. See §9 for how this stays true even under lazy loading. |
| `isReadonly` | `boolean` | no | Absent = editable. Generated nodes default to `true` — see §7. |

A `VirtualFile` is a **leaf node** and never has a `children` field.

### 1.2 `VirtualFolder`
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | Globally unique, same namespace as file ids |
| `name` | `string` | yes | Must equal the leaf segment of `path` |
| `path` | `string` | yes | Root folder is exactly `/` |
| `children` | `(VirtualFile \| VirtualFolder)[]` | yes, always present | `[]` for an empty folder, never omitted. Order is significant and preserved. |

A `VirtualFolder` **must never** carry a `content` key, of any value. This is the sole mechanism (`'content' in node`) the frontend uses to distinguish files from folders.

### 1.3 `WorkspaceTree` (aggregate root)
The backend-side name for invariants that hold over the entire tree as a unit — what `FileSystemService.getFullTree()` validates and returns, never partially.

- Exactly one root: a `VirtualFolder` with `id: 'root'`, `path: '/'`.
- Every `id` is unique **globally** — across all folders and files, static and generated, at any depth.
- Every node's `path` is consistent with its position in the tree.
- The tree is acyclic and single-parented.
- **The tree the service validates is always the fully-reconciled tree** — static and generated content are never validated as separate subsets (see §7; this was the root cause of the search-visibility contradiction found in the stress test, and is now resolved by moving reconciliation into the repository).

---

## 2. Global File Identifier Strategy (frozen)

This was left implicit in the first draft; the stress test showed that's not safe once ids come from two independent sources (hand-authored static content, two live external integrations). Frozen now:

**Static content ids** (Sprint 2 and beyond):
- Hand-assigned at authoring time, matching the existing seed convention (`readme`, `playground`, `about`, `profile`, `work_history`, `cortexa`, `cortexa_readme`, …).
- Must not contain a `:` character — the colon is reserved as the namespace separator for generated ids (below). This is what makes static/generated collision structurally impossible, not just conventionally unlikely.
- Uniqueness is enforced the same way as everything else: `FileSystemService`'s tree-wide validation (§5) is the actual backstop, regardless of how an id was produced.

**Generated content ids** (Phase 3, GitHub/LeetCode):
- Namespaced and deterministic: `<namespace>:<upstream-stable-key>`.
  - Examples: `github:repo:<repo-full-name>`, `github:stats:<repo-full-name>`, `leetcode:problem:<slug>`, `leetcode:streak`.
- The upstream-stable-key **must** be something that does not change across sync cycles for the same logical entity — a repo's full name, a problem's slug, a commit SHA. **Never** a synthetic incrementing counter, an array index, or a timestamp — any of those would break id stability across reconciliation and orphan open tabs / deep links, which is exactly the failure mode the stress test flagged.
- id stability is what allows `reconcileGeneratedSubtree` (§7) to tell "this is the same entity, updated" from "this is a new entity" from "this entity is gone" — the id *is* the identity key reconciliation diffs against.

**Immutability**: once assigned, an id never changes for the life of that logical entity, static or generated. Phase 2's `PUT /api/fs/file/:id` never changes a node's `id`.

**Enforcement layering**: namespace prefixing prevents collisions *by construction*; `FileSystemService`'s global-uniqueness check (§5.8) catches any violation of that convention as a defect, on every `getFullTree()` call, independent of trusting either generator to have followed the rule correctly.

---

## 3. `FileNodeRepository` — Interface Contract

Responsibility: hides the data source from everything above it, **and owns the reconciled source of truth for both static and generated content.** This is a change from the first draft, where generated content was merged in at the service layer — the stress test showed that leaves repository-level consumers (search, in particular) blind to generated content. Now, by the time any repository method runs, generated content is already part of what the repository considers its data.

| Method | Phase | Purpose |
|---|---|---|
| `getRootTree()` | 1 | Fetch the base structure. The only method Sprint 2 needs. Once Phase 3 lands, this same method returns static + generated content merged — no new method needed, no signature change. |
| `getFileById(id)` | 2 | Backs `GET /api/fs/file/:id` |
| `listChildren(folderId)` | 2 | Backs Terminal `ls`/`cd` resolution |
| `searchFiles(query)` | 3 | Backs the Search Engine. Operates over the same reconciled source `getRootTree()` reads from — generated content is searchable with no special-casing, because by this layer there is no distinction left to special-case. |
| `reconcileGeneratedSubtree(namespace, nodes)` | 3 | The **only** way generated content enters or leaves the tree. See §7. |
| `updateFileContent(id, content)` | 2 | Persists an edit to an existing file's `content`. The only way a single file's content changes outside of `reconcileGeneratedSubtree`'s namespace-level replace. Backs `PUT /api/fs/file/:id`. See §3.1. |

Rules that hold regardless of phase:
- The repository never imports HTTP-framework types and never throws HTTP-flavored errors — only domain errors (§6).
- The repository has **no knowledge of what GitHub or LeetCode are** — `reconcileGeneratedSubtree` accepts an already-shaped, already-namespaced set of `VirtualFile`/`VirtualFolder` nodes and a namespace label; it does not know or care where they came from.
- Swapping the underlying source (flat seed file → database → anything else) never requires a change to `FileSystemService` or the route layer.
- `updateFileContent` and `reconcileGeneratedSubtree` are the tree's only two mutators. Both follow the same atomic pattern: build a candidate tree, validate it wholesale via `validateWorkspaceTree`, and commit only on success — a failed candidate leaves `root`/`index` completely untouched.

### 3.1 `updateFileContent(id, content)` — Contract Detail

Signature: `updateFileContent(id: string, content: string): Promise<VirtualFile>`.

Scope, deliberately minimal: mutates `content` only. Does not accept `name`, `path`, `type`, or `id` changes — consistent with §2's id-immutability guarantee and with `BACKEND_BOOTSTRAP.md`'s framing of `PUT /api/fs/file/:id` as "saves updates to a file's content."

**Responsibilities:**
- Locate the node by `id`.
- Confirm it resolves to a file, not absent and not a folder — mirrors `getFileById`'s existing absent-or-folder → "not found" convention.
- Rebuild the path from root to that file with `content` replaced. Every `VirtualFile`/`VirtualFolder` field is `readonly` (§1.1/§1.2), so this is a recursive "replace node along path" reconstruction — every ancestor folder from root down to the file is rebuilt, not just a direct child of root (unlike `reconcileGeneratedSubtree`, which only ever replaces a namespace folder that is a direct child of root).
- Validate the candidate tree; commit only on success; return the updated `VirtualFile`.

**Validation:** re-runs `validateWorkspaceTree` on the full candidate tree before commit, same precedent as `reconcileGeneratedSubtree` — no narrower/parallel validation path is introduced. Because only `content` changes, §5.1–§5.4 (id, name, path, type) are trivially preserved; §5.5 (content always a string) is guaranteed by the method's own signature.

**Atomicity:** identical pattern to `reconcileGeneratedSubtree` (§7.1) — build the candidate tree, validate it, and only then swap `root` and rebuild `index`. A validation failure leaves `root`/`index` completely untouched; no partial write is possible.

**Readonly behavior:** this method does **not** inspect `isReadonly`. Per §5.9/§6, readonly-rejection is `FileSystemService`'s business-policy responsibility, not a structural tree invariant — encoding it here would duplicate policy logic across two layers. Called directly, this method will overwrite a readonly file's content; the service is what prevents that from happening over HTTP.

**Error behavior:**
- `id` absent, or resolves to a folder → throws `NotFoundError` directly. This method is self-contained and correct in isolation — it does not rely on a caller (i.e., the service) having pre-checked existence.
- Candidate tree fails `validateWorkspaceTree` post-edit → throws `WorkspaceIntegrityError` (500), raised by the repository — distinct from the existing §6 row attributing tree-validation failures to the service, which applies to the read path (`getFullTree`) only.

**Invariants preserved:** all of §5, unchanged in kind — id uniqueness/immutability, name/path consistency, valid `type`, always-string `content`, file/folder discrimination, tree-wide uniqueness/acyclicity. This is a narrower operation than a general node replace, layered under the same full-tree validation as every other mutation.

**Interaction with generated content:** generated nodes default to `isReadonly: true` (§7.2), so `FileSystemService`'s readonly check (§4.1) naturally blocks `PUT` against them with no special-casing required. `reconcileGeneratedSubtree` remains the only way generated content changes; `updateFileContent` is reachable via `PUT /api/fs/file/:id` for any file, static or generated, but every generated file it could reach is already readonly by default, so no live generated node is mutable through this path in practice, without any code needing to enforce that exclusion explicitly.

---

## 4. `FileSystemService` — Responsibilities

Single method in Sprint 2: `getFullTree(): WorkspaceTree`.

1. Calls `FileNodeRepository.getRootTree()`.
2. Validates the result against every rule in §5, recursively, across the whole tree.
3. Throws a typed domain error (§6) on the first violation found.
4. Returns the validated tree.

**Correction from the first draft**: this service does **not** merge generated branches into the tree. That responsibility moved to the repository (§3, §7) specifically to resolve the search-visibility contradiction. The service's job stays exactly what it was for Sprint 2 — validate whatever `getRootTree()` returns — and stays true unchanged once Phase 3 adds generated content, because from the service's perspective nothing about its input has structurally changed.

What it explicitly does not do: no HTTP concerns, no direct data-source access, no `getFileById`/`searchFiles` ahead of the phase that needs them.

### 4.1 Phase 2 additions — read and write

Sprint 2C adds two methods, both thin orchestration over the repository — no new tree-assembly or validation logic is introduced beyond what §3.1 and §5 already define:

**`getFileById(id): Promise<VirtualFile>`**
1. Calls `FileNodeRepository.getFileById(id)`.
2. Throws `NotFoundError` if the repository returns `undefined`.
3. Returns the file. No additional validation — a file already inside the reconciled tree is already known-valid (it passed `validateWorkspaceTree` when it entered the tree, whether via seed construction or a prior `updateFileContent`/`reconcileGeneratedSubtree` commit).

**`updateFile(id, content): Promise<VirtualFile>`** — owns the one piece of business policy Phase 2 introduces: readonly enforcement.
1. Calls `FileNodeRepository.getFileById(id)` to read the current node.
2. Throws `NotFoundError` if `undefined`.
3. Throws `BadRequestError` if `existing.isReadonly === true` (§5.9/§6) — checked here, against the pre-edit node, and not inside the repository, because readonly is a business rule about *who is allowed to write*, not a structural fact about the tree itself (§3.1 "Readonly behavior").
4. Calls `FileNodeRepository.updateFileContent(id, content)` and returns its result.

The service still owns no persistence mechanics — step 4 delegates entirely to the repository, which owns the candidate-tree/validate/commit sequence (§3.1). The service's only added responsibility is the readonly policy check in step 3.

---

## 5. Validation Rules (enforced by `FileSystemService`, exhaustive)

1. **id** — non-empty string; unique across the entire tree; immutable; format per §2 (no `:` in static ids, `<namespace>:<key>` for generated ids).
2. **name** — non-empty string; no path separators; equals the final segment of `path`.
3. **path** — starts with `/`; equals `parentPath + '/' + name` for every non-root node; root is exactly `/`.
4. **type** (files only) — must be one of the exact `FileType` union values. An unrecognized type is a rejected tree at the service layer.
5. **content** (files only) — always a string; empty file is `""`, never `null`/`undefined`/omitted. Holds identically for eagerly- and deferred-content files under the §9 lazy-loading strategy.
6. **discrimination** — folders never carry a `content` key; files always carry one.
7. **children** (folders only) — always an array; `[]` for empty, order preserved.
8. **tree-wide** — exactly one root; no duplicate `id` anywhere, static or generated; acyclic.
9. **isReadonly** — optional on files; a Phase 2 write against `isReadonly: true` must be rejected (§6), not silently accepted.

---

## 6. Error Cases

Extends the existing `AppError` hierarchy in `server/types/errors.ts` (`BadRequestError` 400, `NotFoundError` 404, `BadGatewayError` 502).

| Error | Raised by | Maps to | Meaning |
|---|---|---|---|
| Data source unreachable | `FileNodeRepository` | `BadGatewayError` (502) | Underlying store couldn't be read |
| Tree fails validation (§5), read path | `FileSystemService` | plain 500 | Malformed shape reached the service via `getFullTree()` — a data bug, not a client input problem |
| File not found *(Phase 2)* | `FileNodeRepository` returns `undefined`; `FileSystemService` throws | `NotFoundError` (404) | Backs `GET /api/fs/file/:id` (via `FileSystemService.getFileById`, §4.1) and `PUT /api/fs/file/:id` (via `FileSystemService.updateFile`'s pre-check, §4.1 step 2) |
| Write to readonly file *(Phase 2)* | `FileSystemService` | `BadRequestError` (400) | Backs `PUT /api/fs/file/:id` — enforced by `FileSystemService.updateFile` against the pre-edit node (§4.1 step 3), not by the repository (§3.1 "Readonly behavior") |
| Candidate tree fails validation, write path *(Phase 2)* | `FileNodeRepository.updateFileContent` | `WorkspaceIntegrityError` (500) | Distinct from the read-path row above: raised directly by the repository during `updateFileContent`'s atomic commit (§3.1), before the error ever reaches the service |
| Reconciliation failure *(Phase 3)* | `FileNodeRepository` | not HTTP-facing — this runs out-of-band, not inside a request | A malformed generated node set must not partially apply. The repository's affected namespace stays at its last-known-good state; the next sync cycle retries. Same atomicity principle as tree validation, applied to writes instead of reads. |

Client-side hydration/save error handling is unchanged from `BACKEND_BOOTSTRAP.md`'s Error Handling Strategy.

---

## 7. Generated Content Lifecycle & Ownership (revised)

**Governing principle, unchanged**: generated content is not a new domain type. It is an ordinary `VirtualFile`/`VirtualFolder`. What's revised is *where* it becomes part of the tree.

### 7.1 `reconcileGeneratedSubtree(namespace, nodes)`
The single entry point for generated content, owned by `FileNodeRepository`. Given a namespace (`"github"`, `"leetcode"`) and the **complete current set** of nodes for that namespace:
- **Insertion**: an id in the new set not previously present is added.
- **Update**: an id present in both the old and new set, with changed fields, is replaced in place — the id itself never changes (§2).
- **Deletion**: an id previously present under this namespace but absent from the new set is removed.

This is a **full-replace-by-namespace** operation, not an incremental stream of add/remove events — because upstream systems (GitHub, LeetCode) generally hand you "here is everything that currently exists," not reliable deletion events. Diffing against the last-known set is what correctly handles a renamed or deleted repo without leaving an orphan, which the stress test identified as a real unbounded-growth risk.

Reconciliation for one namespace never touches another namespace's nodes, and never touches static content.

### 7.2 Ownership at each lifecycle stage

| Stage | Owner | Notes |
|---|---|---|
| Fetch from external API | `IntegrationService` (Phase 3) | Talks to GitHub/LeetCode, on its own schedule (cron/poll) |
| Shape into `VirtualFile`/`VirtualFolder` | `IntegrationService` | Assigns namespaced id (§2), sets `isReadonly: true` by default, produces valid nodes |
| Reconcile into the tree's source of truth | `FileNodeRepository` (§7.1) | The only writer of generated content. Doesn't know what GitHub is — just applies the diff. |
| Validate the merged tree | `FileSystemService` | Identical validation whether a node is static or generated (§5) |
| Serve over HTTP | Route layer (`GET /api/fs/tree`) | No special-casing — generated content is indistinguishable from static by this point |
| Consume | Explorer, Editor, Terminal, Search, Routing | All read the same validated `WorkspaceTree` / derived `vfsFileMap`. None of them are aware a node is generated. |
| Refresh cadence | `IntegrationService` | Owns timing; the repository has no scheduling awareness, it only reconciles when called |
| Change notification (separate domain) | `NotificationEngine` (Phase 3) | Decoupled from VFS; may be triggered alongside a reconciliation cycle but is not a VFS responsibility. Worth flagging as an interface seam when `IntegrationService` is designed: a notification should never reference a node id before that node's reconciliation has committed. |

This table is the answer to "which component owns generated content at every stage" — no stage has ambiguous or shared ownership.

**Relationship to direct file writes**: `updateFileContent` (§3.1, backing `PUT /api/fs/file/:id`) is a separate, general-purpose mutator — reachable for any file, static or generated — and is not part of this generated-content lifecycle table. It does not bypass reconciliation as the intended path for generated content: every generated node defaults to `isReadonly: true` (row 2 above), so `FileSystemService`'s readonly check (§4.1) blocks `PUT` against generated files in practice, without `updateFileContent` itself needing any generated-content awareness. `reconcileGeneratedSubtree` remains the sole namespace-level mutator; `updateFileContent` remains the sole single-file mutator. Neither owns the other's responsibility.

---

## 8. Playground Execution History — Explicitly Out of Scope

**Playground execution history is not part of the Virtual File System.** It must never be represented as `VirtualFile` nodes in the `WorkspaceTree`, however tempting that seems structurally (it would technically fit the schema).

Why: unlike generated GitHub/LeetCode content — which is bounded and reconciled on a schedule per §7 — execution/version history is user-driven and could grow within a single session, faster and less predictably than any scheduled integration. Modeling it as more tree nodes would directly compound the payload-size and tree-growth bottlenecks the stress test identified, and would do so on the one path (Editor interaction) with no reconciliation cycle to bound it.

Treat it as a **separate domain** with its own storage and lifecycle, owned by a future service that is not `FileNodeRepository` and not exposed through `/api/fs/*`. Designing that domain is out of scope here — this section only fixes the boundary so Sprint 2 (and whoever eventually builds playground history) doesn't accidentally reach for the VFS repository as a shortcut.

---

## 9. API Contract — Phase 1 Frozen, With a Documented Evolution Strategy

### 9.1 Phase 1 (Sprint 2 implements this, unchanged)
`GET /api/fs/tree` returns the full `WorkspaceTree` with `content` inline for every node, as a flat JSON body (the tree itself, not wrapped in an envelope) — exactly as specified in `BACKEND_BOOTSTRAP.md`. All-or-nothing: 200 on success, non-2xx/network failure otherwise, no partial-tree fallback. **Lazy loading is not required for Sprint 2 and is not being built now.**

### 9.2 Future evolution: lazy loading as an implementation strategy, not a schema change
The stress test showed the trigger condition for lazy loading (large generated/static payload) is realistic, not hypothetical, at the scale being planned for. What's decided now — so this doesn't require redesigning `VirtualFile` later — is *how* that evolution happens without touching the domain entity:

- **`VirtualFile`'s shape (§1.1) never changes.** `content` is always a string, always present, on every file, forever — including files whose real content hasn't been fetched yet. This is what makes the evolution additive rather than structural.
- A not-yet-loaded file's `content` in the initial tree response is `""` — schema-valid under §5.5 exactly like a genuinely empty file. The distinguishing signal for "this is actually empty" vs. "this hasn't been loaded yet" is **never encoded on the node itself.**
- That signal, when needed, is carried by the **HTTP response envelope**, not the domain schema — e.g. the tree endpoint's response gains an additive sibling alongside the tree payload:
  ```json
  {
    "tree": { "id": "root", "...": "..." },
    "deferredContentIds": ["github:repo:big-monorepo", "..."]
  }
  ```
  This is illustrative of the mechanism, not an authorized contract change. The point: evolving from "flat tree body" to "enveloped tree + transport metadata" is a change to the *wire contract*, decided independently of and without altering `VirtualFile`/`VirtualFolder`.
- `GET /api/fs/file/:id` (already designed in `BACKEND_BOOTSTRAP.md`) is what later resolves a deferred id's real content on demand. When it does, it returns the same unchanged `VirtualFile` shape — nothing new is invented for this endpoint either.
- Frontend-side bookkeeping of "is this file's content actually loaded" (the earlier-proposed `isContentLoaded` tracking) lives entirely in **store state**, keyed by id — never as a field on `VirtualFile` itself. This keeps the domain entity a pure, transport-agnostic value object indefinitely.
- The known `ShikiEditor` dependency-array bug (`[fileId]` vs `[fileId, file]`) remains correctly scoped as "required to fix when lazy loading activates" — unchanged from `BACKEND_BOOTSTRAP.md`, just reconfirmed here since the stress test suggested this trigger may arrive sooner than "someday."

Net effect: Sprint 2 builds the Phase 1 contract exactly as specified, with zero lazy-loading machinery. When the trigger fires, the evolution is additive at the HTTP/transport layer only — `VirtualFile`/`VirtualFolder` are never touched, and no existing consumer that reads `file.content` synchronously needs to change its assumptions about the *shape* of that field, only about *when* it's guaranteed to be the real value.

---

## 10. Final Consistency Review

Verifying that every consumer — present and future — operates against the **same** `WorkspaceTree`, produced by the **same** validation, with no special-casing per source:

| Consumer | What it reads | Consistency guarantee |
|---|---|---|
| **Explorer** | `vfsTree` (derived from `FileSystemService.getFullTree()`) | Renders whatever the validated tree contains — static and generated nodes are structurally identical `VirtualFile`/`VirtualFolder` values; Explorer has no source-awareness to keep in sync |
| **Editor** | `vfsFileMap[id]` → `file.content` | Reads the same `content: string` field regardless of whether the file is static, generated, or (future) lazily-resolved — §9 guarantees the field's shape never forks per source |
| **Terminal** | `FileNodeRepository.listChildren()` / `getFileById()` (Phase 2) | Resolves against the repository's single reconciled source (§3) — a generated file under `/github` is `cat`-able exactly like a static one, no special-casing needed |
| **Search** | `FileNodeRepository.searchFiles()` (Phase 3) | This was the contradiction the stress test caught: search previously could not see generated content because it was merged in one layer higher. Now resolved — search reads the same reconciled source `getRootTree()` reads, because §7 makes reconciliation a repository-level write, not a service-level read-time merge |
| **Routing** (`useRouterSync`) | `vfsFileMap` / `vfsFileList`, keyed by `id`/`path` | Namespaced, stable generated ids (§2) mean a deep link to a generated node behaves identically to a static one — no new resolution logic needed, though the pre-existing suffix-matching fragility in `useRouterSync` itself is unchanged by this document (flagged previously as tech debt, not re-litigated here) |
| **Hydration** | `GET /api/fs/tree` once per session | Still one atomic, all-or-nothing fetch (§9.1) for Sprint 2; §9.2 guarantees that whenever lazy loading is introduced, the hydration contract evolves at the envelope level only — the "atomic commit" semantics in `BACKEND_BOOTSTRAP.md`'s Store Hydration Flow are undisturbed |
| **Future GitHub integration** | Writes via `reconcileGeneratedSubtree("github", nodes)` | Owns fetch + shaping (§7.2) only; has zero visibility into or dependency on Explorer/Editor/Terminal/Search — it only ever talks to the repository |
| **Future LeetCode integration** | Writes via `reconcileGeneratedSubtree("leetcode", nodes)` | Identical pattern to GitHub, fully isolated by namespace (§7.1) — a bug in LeetCode reconciliation cannot corrupt GitHub's nodes or static content |

**Result: one consistent model.** Every consumer, present and future, reads through `FileSystemService.getFullTree()` (or, from Phase 2 on, the equivalent single-node repository methods) over a `FileNodeRepository` whose reconciled source of truth already contains static and generated content merged, validated once, against one identifier strategy, with playground history explicitly excluded rather than left ambiguous.

---

## Sign-off

This freezes the entities (§1), identifier strategy (§2), repository/service boundary (§3–§4), validation and error taxonomy (§5–§6), generated-content lifecycle and ownership (§7), the playground-history boundary (§8), the lazy-loading evolution strategy (§9), and the cross-consumer consistency guarantee (§10). Sprint 2 (Milestone 2 in `BACKEND_BOOTSTRAP.md`) implements directly against this document. Any deviation discovered during implementation comes back here for a documented update, not a silent drift.
