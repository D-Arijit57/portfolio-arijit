# Portfolio_Arijit — Full Project Audit (Interview Study Material)

Prepared 2026-10-16 for the Associate Software Engineer interview at MindLabs Cloud.
Everything below was read from the code in this repo, not from the older design docs. Where the two disagree, this audit says so.

---

## 0. Verified health snapshot

| Check | Result |
|---|---|
| `tsc --noEmit` (frontend) | passes, 0 errors |
| `tsc --noEmit -p server/tsconfig.json` | passes, 0 errors |
| `vite build` | succeeds in about 4.6 s |
| Automated tests | none (no Jest, Vitest or Playwright in `package.json`; no test files tracked) |
| Size | about 337 tracked files, about 33.6k lines of TS/TSX |
| Largest bundles | `index` 1.2 MB (380 KB gzip), `ResumeWorkspace` 1.3 MB (400 KB gzip, lazy-loaded) |
| Git state | master, many uncommitted changes (Cortexa to Lattice rename, résumé sync) |

---

## 1. What the project is (the 30-second pitch)

An interactive developer portfolio disguised as a VS Code window. Visitors browse a virtual file system in an Explorer, open files in tabs and split panes, run commands in a real (simulated) terminal, search everything with Cmd+K, and open special files that render as visualizations:

- `skills.graph`: a physics-driven knowledge graph.
- `*.explore`: a "constellation" tech-stack map.
- `architecture.mmd`: an interactive architecture canvas.
- `americanchase.yaml`: a work-history pipeline.
- `hire_me.md`: a résumé workspace with a 3D PDF preview and an evidence rail.
- `contact.sh`: a contact "handoff" page with a feedback form.

It is a **full-stack app**: a React SPA plus an Express API that serves the virtual file system, generates live GitHub content, sends feedback email, and counts unique visitors. It is deployed on Vercel (the SPA as static files, the API as one serverless function).

**One-liner you can say:** "A React + TypeScript single-page app with a layered Express backend, deployed on Vercel. The backend serves a virtual file system, pulls live GitHub data through a provider pattern, emails feedback through Resend, and counts unique visitors with a Redis HyperLogLog."

---

## 2. Tech stack and why each piece

**Frontend**
- React 19 and Vite 6, with TypeScript 5.8. The older docs say "React 18"; `package.json` says 19.
- Zustand 5 for global state, a single store in `src/store/useStore.ts` (995 lines).
- Tailwind CSS 4 through the `@tailwindcss/vite` plugin.
- `motion` (the Framer Motion successor) for animation.
- Shiki for syntax highlighting; `react-simple-code-editor` for the editable layer.
- `cmdk` for the command palette.
- `react-markdown` with `remark-gfm` for markdown rendering.
- Three.js and `pdfjs-dist` for the 3D résumé (lazy-loaded).
- `yaml` for parsing `.graph` and similar files.
- `lucide-react` and `simple-icons` for icons.

**Backend**
- Express 4, with `cors`, `dotenv` and `tsx` for dev.
- `esbuild` bundles the standalone server.
- `resend` for email.
- `@upstash/redis` for the REST-based Redis client.

**Deployment**
- Vercel. `vercel.json` rewrites `/api/*` to `api/index.ts`, and every other path to `index.html` (SPA fallback).

---

## 3. Architecture overview

```
Browser (React SPA)
  |  fetch /api/*                       (same origin in prod via Vercel rewrite)
  v
api/index.ts  ->  createApp()  (Express)
  middleware: cors(credentials) -> json -> requestLogger -> apiRouter -> 404 -> errorHandler
  routes:     health | fs | feedback | visitor
  services:   FileSystemService | feedbackService | visitorService
  repository: FileNodeRepository (interface) <- InMemoryFileNodeRepository (seeded)
  providers:  ProviderRegistry -> GitHubProvider -> GitHub REST + GraphQL
  external:   Resend (email), Upstash Redis (HyperLogLog)
```

### 3.1 Backend layering (`server/`)

This is the strongest engineering story in the repo. Each layer has one job:

1. **Routes** (`server/routes/*.routes.ts`) are thin. They parse and validate input, call a service, and map the result to an HTTP status.
2. **Services** (`server/services/`) own the business rules. Example: `FileSystemService.updateFile` enforces the readonly policy. Another: `feedbackService` and `visitorService` degrade to an `'unconfigured'` status instead of throwing.
3. **Repository** (`FileNodeRepository` interface, in-memory implementation) hides storage. Every method returns a Promise even though the data is in memory, so a database implementation can be dropped in with no change above it.
4. **Providers** (`ContentProvider` interface, `ProviderRegistry`) generate content from outside sources.
5. **Clients** (`githubApiClient.ts`, `resendClient.ts`, `redisClient.ts`) do raw network I/O only.

**Composition root:** `server/composition.ts` builds one repository and one `FileSystemService` and shares them. Providers write through the same repository the routes read from.

**Typed errors:** `server/types/errors.ts` defines `AppError` subclasses (`BadRequestError`, `NotFoundError`, `UnauthorizedError`, `BadGatewayError`, `WorkspaceIntegrityError`). The central `errorHandler` maps an `AppError` to its status code, and anything else to 500.

**Config:** `server/config/env.ts` separates *required* env vars (with defaults) from *optional* ones. An optional var that is missing disables that one feature and never crashes boot.

### 3.2 API surface

| Method and path | Purpose | Notes |
|---|---|---|
| `GET /api/health` | liveness | returns `{status:'ok'}` |
| `GET /api/fs/tree` | whole virtual file tree | awaits `refreshAllOnce()` first |
| `GET /api/fs/file/:id` | one file | 404 via `NotFoundError` |
| `PUT /api/fs/file/:id` | edit file content | body `{content: string}`; 400 if readonly or not a string |
| `POST /api/feedback` | emails a review | honeypot, length caps, CRLF and email checks; 201, 503 or 502 |
| `POST /api/visitor/visit` | record and return unique count | sets the `vid` cookie; 503 or 502 on failure |
| `POST /api/visitor/owner` | claim "owner browser" | token-gated; sets the `owner` cookie |

### 3.3 The virtual file system (VFS)

- A tree of `VirtualFile` (has `content`) and `VirtualFolder` (has `children`). A node is exactly one or the other.
- `validateWorkspaceTree` enforces these invariants on every write:
  - a single root with id `root` and path `/`;
  - globally unique ids;
  - each node's `path` matches its position in the tree;
  - each `name` matches the last path segment;
  - file/folder discrimination (never both, never neither);
  - a valid `FileType`.
- **Id namespacing:** static ids may not contain `:`. Generated content uses `<namespace>:<key>` (for example `github:profile`). This prevents collisions between hand-written and generated content.
- **Immutability and structural sharing:** `updateFileContent` rebuilds only the ancestor chain from the root to the edited file. Untouched subtrees are reused by reference.
- **Atomic commit:** build a candidate tree, validate it, then swap `root` and `index`. A failure leaves the old state untouched.
- **Index:** a `Map<id, node>` is rebuilt after each commit, so lookup by id is O(1).
- **Reconcile semantics:** `reconcileGeneratedSubtree(namespace, nodes)` does a full replace of one namespace folder. Insert, update and delete all fall out of that single operation, with no diffing.

### 3.4 Content Provider pattern (GitHub)

- `ContentProvider` has `namespace`, `refresh()` (never throws) and `getStatus()`. Nothing GitHub-specific appears in the interface.
- `GitHubProvider.refresh()` is a four-stage pipeline: **fetch, transform, generate markdown, reconcile**.
- **Partial-failure policy:**
  - the profile is *required*; if it fails, the whole cycle aborts and the last good content stays;
  - repos, pinned repos, events, contribution calendar and commits are *best-effort* (`safely()` returns `undefined`), so one section shows "unavailable" instead of failing everything;
  - pinned repos, the calendar and commit search need a token, because GraphQL rejects unauthenticated calls.
- `githubApiClient` uses an 8 s timeout and classifies errors (`rate-limited`, `not-found`, `http-error`, `timeout`, `network`). Commit search is forced to `is:public` so a broad token can never leak private commit messages.
- `ProviderRegistry.refreshAll()` runs providers concurrently. One provider failing does not affect the others.

### 3.5 Serverless correctness: the shared-promise fix

This is the most interview-relevant piece of code in the repo.

- **Problem:** on Vercel, an instance can be frozen as soon as a response is sent. A fire-and-forget `refreshAll()` kicked off at module scope might never finish. GitHub content was *intermittently missing* in production.
- **Fix:** `refreshAllOnce()` memoizes the refresh as one shared promise. Module scope starts it, and the `/fs/tree` and `/fs/file/:id` handlers `await` it. The response now depends on the data being loaded, so the instance cannot be frozen mid-fetch.
- **Result:** on a long-running server the promise is already resolved, so it costs nothing. On serverless it is what keeps the work alive.
- **Related fix (ESM):** Node's native ESM loader requires explicit `.js` extensions on relative imports (visible in `server/app.ts`). Local tooling (`tsx`, bundlers) accepted extensionless paths. Vercel's runtime did not, and the deploy crashed.

### 3.6 Visitor counter (Redis HyperLogLog)

- `PFADD` / `PFCOUNT` on one key. `PFADD` is idempotent for a repeat ID, so there is no "have I counted this?" check.
- Memory use is constant, and the store keeps no list of who visited (a privacy benefit).
- Cookie-based identity (`vid`, a random UUID, 2 years, `HttpOnly`, `SameSite=Lax`, `Secure` in production), not IP-based.
- The owner is excluded with an `owner` cookie, claimed through a hidden terminal command `owner <token>`. In development every visit is treated as the owner's. The code states that this excludes a *browser*, not a *person*.
- A fresh `Redis` client is created per call. It is REST-based, so there is no connection to pool, and it suits stateless serverless.

### 3.7 Feedback email (`POST /api/feedback`)

- **Honeypot field `hp`:** a bot that fills it gets a fake 201 and nothing is sent.
- **Validation:** verdict enum; message at most 1000 characters; name at most 100; email at most 254, with a shape regex and a CRLF check.
- **Header-injection defense:** the visitor's email goes into Resend's structured `replyTo` field, never into a raw header. The subject comes only from the verdict.
- **Server-generated timestamp:** the client clock is never trusted.
- **Sender:** Resend's shared test sender, which only delivers to the account owner. The code notes this is why the visitor's email can never be `from`.

---

## 4. Frontend architecture (`src/`)

### 4.1 Boot and gating (`App.tsx`)

- `hydrateVFS()` runs on mount. `bootDone` is a lazy-initialized state from `shouldRunWorkspaceBoot()`.
- The boot sequence runs only for a README entry route, a first visit in this session, and no `prefers-reduced-motion`.
- An `aria-live="polite"` region announces "Workspace ready." and exists from the first paint.
- **Resilience:** if the API fails, `hydrateVFS` does *not* show an error screen. It falls back to the static seed baked into the bundle (`src/content/workspaceSeed.ts`) and records a classified failure in `vfsDegraded`.
- Failure kinds are `unreachable`, `http-error`, `not-json` (the SPA fallback answered `/api`, which signals a rewrite bug) and `malformed-json`.

### 4.2 State: one Zustand store

It holds:
- editor state: tabs, the active file, the split-pane layout;
- explorer, terminal, search, notifications and draft state;
- the file tree, as `workspaceTree` plus `workspaceFiles`.

Notable logic:
- **`openFile`** is a large decision function. Landing on the README forces the README + `startup.log` split. Manifest, work-history and contact files force a single full-width pane. `resolveTargetPane` picks the pane for ordinary navigation.
- **`shellOwner`** (`'signature' | 'terminal'`) is a single owner of the blinking cursor, so two cursors can never be live at once. It is a single value, not two booleans.
- **Hidden namespaces:** `github` content stays fetchable by id but is filtered out of the Explorer, Terminal, Search and Command Palette (`HIDDEN_BROWSE_NAMESPACES`).
- **Race guard in `setSearchQuery`:** if the query changed while a search was awaiting, the stale result is discarded.
- **Module-level singleton registration:** `registerBuiltinCommands()` and the initial `buildIndex()` run at import time.
- **Live-binding facade:** `src/content/fileSystem.ts` exports `let fileSystem` / `let allFiles`, reassigned from a store subscription. This lets older importers see fresh data without changing how they import.

### 4.3 Routing without a router library

`useRouterSync` maps URLs under `/journey/...` to files and back using `history.pushState` and `popstate`. A flag (`initialRouteResolved`) stops the "state to URL" effect from overwriting a deep link on the first commit. Matching tries several extensions per path. `/` is rewritten to `/journey/welcome`.

### 4.4 Terminal subsystem (`src/terminal/`)

A small command framework:
- `parser.ts`: pure whitespace tokenizer. It has no quoting support, which is acknowledged tech debt.
- `registry.ts`: a module-level `Map` plus an alias map. Registering a duplicate name throws.
- `executor.ts`: looks up the command, handles an aborted signal, and wraps `execute` in try/catch so nothing reaches React.
- `CommandContext` is dependency injection. Commands receive `openFile`, `resolvePath`, `setCwd` and so on, and never import the store.
- Output is a discriminated union: `text | error | file-link | list | table`.
- Commands: `help clear pwd ls cd cat open history whoami resume projects contact theme startup owner`. `owner` is `hidden: true`.
- History is capped at 200 entries. The cwd syncs to the active file's parent folder.

### 4.5 Search subsystem (`src/search/`)

Index, then matcher, then ranker. All of it is pure, with no React or Zustand.
- **Index:** lowercased name, path and content per file, rebuilt after hydration and after a save.
- **Ranking tiers:** exact name 1000, name prefix 800, name substring 600, path exact/prefix/contains 400/350/300, content 100 plus a capped occurrence bonus. Content only scores if no name or path matched, so a long file cannot outrank a filename match. Ties break by shorter name, then earliest match index.
- `search()` returns a Promise even though it is synchronous today. This reserves the contract for async or semantic search.

### 4.6 Visualization system

`EditorRenderer` dispatches by file:

- `resume` goes to a lazy-loaded `ResumeWorkspace`. Three.js and pdf.js download only when it opens.
- `startup-log` goes to `StartupLogViewer`.
- A markdown file goes to `ProjectDocumentationViewer` if it lives directly in `/projects/<Name>/`, otherwise to the plain `MarkdownFileView`.
- Mermaid goes to `ArchitectureCanvas`.
- A manifest goes to `ManifestViewer` (the constellation).
- Anything matching a **Visualization Registry** entry goes to that component. The registry holds an array of `{id, matches(file), component}` definitions. Currently it covers the knowledge graph and work history.
- The default is `ShikiEditor`.

Subsystems (all use the "pure model in, renderer out" pattern):
- **Architecture platform:** a typed `ArchitectureModel` (nodes with categories, edges with sync/async/data kinds) is the source of truth. `modelToMermaid` generates the `.mmd` text from it, never the reverse.
- **Manifest and constellation:** `parseManifest` treats every non-metadata top-level array as a category, so a new category needs no code change. Layout is hand-authored in normalized 0-1 coordinates and fitted to the viewport.
- **Knowledge graph:** `buildGraph` (pure) produces nodes and edges, with namespaced ids (`graph:root`, `graph:category:*`) so they cannot collide with leaf ids. `radialLayout` is a deterministic, seeded, force-relaxed layout with no `Math.random`. `useGraphSimulation` is a d3-force-style live simulation. The key design correction was removing the per-node anchor spring, so the layout is only the initial condition and rest lengths, and the graph deforms and stays deformed when dragged. Nodes and edges are `React.memo`'d so a hover only re-renders what changed.
- **Résumé workspace:** the PDF is rasterized by pdf.js onto a canvas and used as a Three.js texture (scale 3 for texel density). A WebGL-detection fallback exists. The right pane has EVIDENCE and DOCUMENT tabs. `claims.ts` maps each résumé highlight to a file in the workspace, and the descriptions are read from the canonical `workHistory` model, never re-authored.
- **Notifications:** a queue, a service and the store mirror. The store never owns notification state. It subscribes to the queue, and that subscription is the only writer.

---

## 5. Engineering strengths (what to talk about)

1. **Separation of concerns.** Route, service, repository, provider, client. Each layer is swappable. The `FileNodeRepository` Promise-returning interface is explicitly shaped for a future database.
2. **Defensive design.** Atomic validated writes. Typed errors. Optional integrations that degrade instead of crashing. A frontend fallback when the backend is down.
3. **Production debugging evidence.** The two Vercel bugs (ESM extensions, un-awaited refresh) are fixed, and the reasoning is documented in code comments.
4. **Security awareness in the feedback and visitor paths.** Honeypot, CRLF and header-injection defense, `HttpOnly`/`SameSite`/`Secure` cookies, secrets read server-side only, `is:public` commit filtering.
5. **Pure-function cores.** Parser, search, graph builder, layout, `modelToMermaid` and the manifest parser are all React-free and testable.
6. **Accessibility effort.** `aria-live` regions, `prefers-reduced-motion` respected, a visually hidden `h1`, focus-safety helpers.
7. **Bundle discipline.** The heavy 3D and PDF code is lazy-loaded.
8. **Build-time guard on API URL.** `import.meta.env.DEV ? VITE_API_BASE_URL : '/api'` stops a localhost URL from being baked into the production bundle (this was found by grepping the build output).

---

## 6. Honest weaknesses and risks (expect these questions)

Ranked by how likely an interviewer is to find them.

1. **Unauthenticated write endpoint.** `PUT /api/fs/file/:id` has no auth, and no seed file in `server/repositories/seed/workspaceSeed.ts` is marked `isReadonly` (grep found none). Any visitor can overwrite any file for every other visitor. On a long-running server that change persists in memory. On serverless it lives only until the instance recycles, and different instances see different data. *Fix:* mark seed files readonly, or require an auth token, or remove the endpoint in production.
2. **Mutable state on a serverless runtime.** The in-memory repository is per instance. That is fine for a read-mostly portfolio, but it is not a real persistence story. *Answer:* it was a deliberate Phase 1 choice behind an interface, and a database implementation is the planned next step.
3. **No automated tests in this repo.** All verification was manual or ad hoc (older docs mention Playwright scripts that are not tracked). The pure-function layers are ideal first targets (`validateWorkspaceTree`, `parseManifest`, `rankMatches`, `buildGraph`).
4. **No rate limiting** on `/feedback` or `/visitor/visit`. The honeypot stops naive bots only. The feedback endpoint can be used to spam your inbox.
5. **Non-constant-time token comparison** in `/visitor/owner` (`token !== config.ownerToken`). Low risk here, but `crypto.timingSafeEqual` is the standard answer.
6. **Duplicated seed.** `src/content/workspaceSeed.ts` (910 lines) and `server/repositories/seed/workspaceSeed.ts` (903 lines) are hand-maintained copies. They can drift. The `FILE_TYPES` array and the `FileType` union are also two sources of truth, as are the client and server copies of `types`.
7. **Single 995-line store.** The old docs call it "monolithic". Slice the store (editor, terminal, search, notifications) if it grows.
8. **Bundle size.** The main chunk is 1.2 MB. Shiki bundles many language chunks, and `ResumeWorkspace` is 1.3 MB (lazy, so acceptable).
9. **Stale docs.** `PROJECT_CONTEXT.md` says React 18+, and `CURRENT_STATE.md` still says the file system is "entirely hardcoded" and the terminal "cannot communicate with a server". Both are out of date. `vite.config.ts` still carries AI-Studio HMR comments (and has a mojibake character in one comment).
10. **Hardcoded `/journey` route list** in `useRouterSync` (a per-extension chain and special-case cleanups). It is brittle when file types are added.
11. **Git hygiene.** The working tree has many uncommitted changes (the Cortexa to Lattice rename, deleted Cortexa components, the résumé PDF, and a new `lattice.ts`). Commit or stash before the interview if you plan to demo the repo.

**One thing to prepare for specifically.** Your résumé's American Chase bullets (the `.js` extensions across 37 modules, and the shared provider-refresh promise) describe the same two bugs that are documented in comments in *this* repo's backend (`api/index.ts`, `server/index.ts`, `providerRegistry.ts`). An interviewer who opens this repo will connect them. Be ready to say precisely where each bug occurred, what you did, and what was your own work versus the team's. Answer truthfully and specifically, and do not stretch either claim.

---

## 7. Likely interview questions and strong answers

**Q: Walk me through the architecture.**
SPA plus a layered Express API. Routes are thin, services own the rules, a repository interface hides storage, and providers generate content. Deployed on Vercel with `/api/*` rewritten to a single serverless function. See section 3.

**Q: Why an interface over the repository if it's in memory?**
So the storage can change without touching consumers. Every method returns a Promise today even though the data is synchronous, so a Postgres-backed class is a drop-in. It also keeps the service layer easy to unit test with a fake.

**Q: How do you handle failure from third-party APIs?**
Classify errors (timeout, rate limit, 404, network). Treat the required fetch (profile) as all-or-nothing and the rest as best-effort. Keep last-known-good content on failure. Expose status per provider.

**Q: How does tenant/user identity work here?**
There are no accounts. Visitors get a random opaque `vid` cookie, used only for unique counting in a HyperLogLog. The owner is excluded through a token-claimed cookie. Be clear that this identifies a browser, not a person.

**Q: Why HyperLogLog?**
Approximate unique count in constant memory. `PFADD` is idempotent, so repeat visits don't need a lookup, and the store never holds a list of visitors. About 0.81% standard error, which is fine for a vanity counter. It would be wrong for anything needing exact counts or per-user data.

**Q: How would you secure the PUT endpoint?**
Say plainly it is currently open, which is a known gap. Options: mark content readonly (the service already enforces `isReadonly`), add an auth token or session check in a middleware, add rate limiting, and persist to a real database with per-user scoping if editing is a real feature.

**Q: How would you test this?**
Start with pure functions: `validateWorkspaceTree` (each invariant), `rankMatches` (tier order and tie-breaks), `parseManifest`, `buildGraph`. Then service tests using a fake repository. Then route tests with supertest against `createApp()` (the factory makes that easy). Then a handful of Playwright flows (boot, open file, terminal command, search).

**Q: Performance decisions?**
Lazy-loaded Three.js and pdf.js. `React.memo` with per-id cached handlers in the graph. Physics works in refs and writes to the DOM directly, rather than re-rendering per frame. Structural sharing in tree updates. O(1) id index. The simulation clamps elapsed ticks so a background tab does not integrate a huge step.

**Q: What would you improve with more time?**
Tests; auth and rate limiting; a database-backed repository; one shared source for the seed and types between client and server; split the store; code-split the main bundle; update the docs.

**Q: Why Zustand over Redux or Context?**
Minimal boilerplate, selectors avoid whole-tree re-renders, and actions can be called outside React (the notification subscription and the terminal context use `get()`/`set()`). Tradeoff: one big store gets hard to navigate, so slice it.

---

## 8. Fundamentals this project touches (for quick revision)

- **REST and HTTP semantics.** 200 vs 201; 400 vs 401 vs 404; 502 (bad gateway, upstream failed) vs 503 (service unavailable, not configured).
- **CORS and cookies.** `credentials: true` needs an explicit origin (not `*`) and `credentials: 'include'` on the client. `HttpOnly` hides a cookie from JS, `SameSite=Lax` limits cross-site sending, and `Secure` means HTTPS only.
- **Serverless model.** Cold vs warm start, module-scope code runs once per cold start, instances can be frozen after the response, and there is no durable local state.
- **ESM vs CommonJS.** Extension requirements, `"type": "module"`, and bundler vs native resolution.
- **Async patterns.** Memoized promise, `Promise.all` for concurrent independent work, and a stale-result guard to avoid out-of-order resolution.
- **Data structures.** Tree with an id-keyed Map index; structural sharing; HyperLogLog (probabilistic cardinality).
- **React.** Hooks, effect ordering, `React.memo`, lazy and Suspense, refs for per-frame mutation, and stale closures.
- **TypeScript.** Discriminated unions (`OutputEntry`, `UpdateFileResult`, the `RecordVisitResult` type), type guards (`isVirtualFile`), `Record<K,V>`, and `readonly` types.
- **Security.** Input validation, header injection (CRLF), honeypots, secrets handling, timing attacks, least privilege.
- **Design patterns used.** Repository, service layer, provider/strategy, registry, composition root, pipeline, observer (notification subscription), command, dependency injection through context objects.

---

## 9. Key files cheat sheet

| Area | File |
|---|---|
| Express app factory | `server/app.ts` |
| Standalone server and refresh timer | `server/index.ts` |
| Vercel entry | `api/index.ts` |
| Wiring | `server/composition.ts` |
| Tree rules | `server/repositories/validation.ts` |
| Repository | `server/repositories/inMemoryFileNodeRepository.ts` |
| Readonly policy | `server/services/fileSystemService.ts` |
| Provider orchestration | `server/providers/github/githubProvider.ts`, `providerRegistry.ts` |
| Shared-promise fix | `server/providers/providerRegistry.ts` (`refreshAllOnce`) |
| Feedback | `server/routes/feedback.routes.ts`, `server/email/resendClient.ts` |
| Visitor count | `server/routes/visitor.routes.ts`, `server/storage/redisClient.ts` |
| Global state | `src/store/useStore.ts` |
| API client and failure kinds | `src/lib/api/vfsClient.ts` |
| URL sync | `src/hooks/useRouterSync.ts` |
| Terminal | `src/terminal/` |
| Search | `src/search/` |
| File-type dispatch | `src/components/editor/EditorRenderer.tsx` |
| Graph physics | `src/hooks/useGraphSimulation.ts`, `src/graph/` |
| Résumé 3D | `src/components/resume/` |
| Content you should know cold | `src/components/resume/data/fullstack-ai.ts`, `src/content/workHistory.ts` |

---

## 10. Your résumé facts to have ready (from `fullstack-ai.ts`)

- **RakshaChakra** (Jun to Jul 2025): Flask behavioural-auth backend on EC2; ETag cache raised throughput 27 to 101 req/s and p50 3.5 s to 140 ms; per-user file locks fixed a race condition; background training dropped predict latency 2 s to 38 ms.
- Education: VIT B.Tech CSE, CGPA 8.80. TCS CodeVita 2025 rank 4,811 (top 5%).

Be able to explain *why* each metric moved, not only the number: composite index and query plans for Lattice; cache invalidation and locking for RakshaChakra.

---

## 11. Last-night checklist

- [ ] Re-read sections 3.5 and 6 aloud; these are the likeliest follow-ups.
- [ ] Be able to draw the request path (browser to Vercel rewrite to Express to service to repository) on paper.
- [ ] Decide your honest answer on the open PUT endpoint and on testing.
- [ ] Re-derive one résumé metric end to end (for example the N+1 fix: 54 to 4 queries).
- [ ] Commit or stash the working tree if you will screen-share the repo.
- [ ] Prepare 2 questions for MindLabs Cloud (team structure, on-call and deployment practices).
