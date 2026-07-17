# Terminal Domain Model — Frozen Design

## Status

**Frozen as of 2026-07-18.** This document is the canonical architecture specification for the integrated Terminal subsystem (Sprint 5A). It does not replace `BACKEND_BOOTSTRAP.md` on milestone sequencing, but it **revises** that document's Terminal Engine API sketch (§13.1 below) — flagged explicitly, not applied silently, pending approval before any Sprint 5B implementation.

No code is defined here. Interface and method signatures are contracts to implement against, not implementations. Design only, per Sprint 5A scope — nothing in this document is built yet.

---

## 0. Grounding — what already exists

- `src/components/terminal/Terminal.tsx`: a `switch` statement over hardcoded command strings, local `useState` for input, output as plain strings appended to `terminalState.history` (`{ command, output }[]`) in the store.
- `ARCHITECTURE.md` and `CURRENT_STATE.md` already flag the switch statement and the monolithic store as tech debt.
- `BACKEND_BOOTSTRAP.md` sketched a Phase 2 `POST /api/terminal/execute` (body `{ command, cwd }` → `{ output, newCwd?, error? }`) and a server-side `TerminalService`/`TerminalEngine`, written **before** the VFS existed. That premise has changed — see §13.1.
- The VFS is fully hydrated client-side (`workspaceTree`/`workspaceFiles` in the store) per `VFS_DESIGN.md` §9.1 — no per-command network fetch is needed to read file content the client already has.
- Sprint 4B just fixed the exact anti-pattern this document must avoid repeating in the terminal: a component (`ShikiEditor`) held editing state locally instead of in the store, and a duplicate `isDirty` boolean shadowed a value that should have been derived. Every ownership decision below is checked against that precedent.

---

## 1. High-Level Architecture

Four layers, strictly one-directional in their dependencies — same shape as the VFS's Route → Service → Repository split:

```
Terminal UI (Terminal.tsx, OutputRenderer.tsx)
        │  submits raw input string / renders HistoryEntry[]
        ▼
Store (terminalState slice + submitTerminalCommand())
        │  orchestrates, owns lifecycle — never parses or executes itself
        ▼
Engine (parser.ts + executor.ts)          Registry (registry.ts + commands/*)
        │  parses → looks up → invokes  ──────────────┘
        ▼
CommandDefinition.execute(ctx) — per-command logic
        │
        ├── Store actions (openFile, toggleTheme, setCwd, …)   [store interaction]
        └── vfsClient / future integration clients               [backend request]
```

The store is the single orchestrator (mirrors `saveFile()` from Sprint 4B), but it delegates parsing and lookup to pure, stateless modules — it does not itself contain a command switch statement. The UI component never touches the registry, parser, or executor directly; it only calls one store action and renders store state.

---

## 2. Ownership Table

| Concern | Owner | Notes |
|---|---|---|
| Command history | `store.terminalState.history: HistoryEntry[]` | Already exists in shape; extended per §8. |
| Current input | `store.terminalState.input: string` | **Moves out of `Terminal.tsx`'s local `useState`.** Leaving it local would reproduce the exact pre-Sprint-4B bug (component-owned editing state shadowing the store) that Sprint 4B just eliminated for the editor. |
| Execution state | `store.terminalState.status: 'idle' \| 'executing'` | New. Needed once any command can be asynchronous (§11) — without it, nothing can show "command is running" or block re-entrant submits. |
| Terminal output | `HistoryEntry.output: OutputEntry[]` | Lives inside each history entry, not a separate array — output only ever exists in the context of the command that produced it. |
| Command registry | Module-level `Map<string, CommandDefinition>` in `registry.ts`, populated at import time | **Not store state.** Commands are code, not session data — same reasoning as `FileNodeRepository`/`FileSystemService` being instantiated once at a composition root rather than held as reactive state. Storing it in Zustand would allow runtime mutation/duplicate registration for no benefit and would vanish on any future store-reset feature. |
| Prompt | **Derived**, not stored — `getPrompt(identity, cwd)` pure function | Same principle Sprint 4B froze for dirty state: a value computable from other owned state must never get its own field. Prompt is a function of `identity` (static config) + `cwd` (store) + active theme (store, presentation only — §9). |
| Working directory (`cwd`) | `store.terminalState.cwd: string` | New. Required to make `cd`/`ls`/`cat`/`open` resolve against real VFS paths instead of the current fuzzy name matching (`args[1].toLowerCase()` substring search) — see §17. Mutated **only** by the `cd` command's handler via `CommandContext`, never written directly by the UI. |
| History cursor (↑/↓ position) | `store.terminalState.historyCursor: number \| null` | Transient navigation state — legitimately stored because it isn't derivable from `history` alone (it also depends on in-progress, uncommitted arrow-key browsing). See §8. |

No concern above has two owners. `commandLog` (the flat list of past command strings used for ↑/↓ recall) is explicitly **not** a separate stored array — it's derived from `history.map(h => h.command)`, same "derive, don't duplicate" rule as dirty state.

---

## 3. State Model

```ts
type ExecutionStatus = 'idle' | 'executing';

interface HistoryEntry {
  id: string;
  command: string;        // raw submitted string, unparsed
  cwd: string;             // cwd at time of submission — prompt context for replay/scrollback
  output: OutputEntry[];
  timestamp: number;
}

interface TerminalState {
  isOpen: boolean;                 // existing
  input: string;                    // NEW — replaces Terminal.tsx's local useState
  status: ExecutionStatus;           // NEW
  cwd: string;                        // NEW — VFS path, defaults to '/'
  history: HistoryEntry[];             // extends existing shape
  historyCursor: number | null;         // NEW — null when not browsing
}
```

Store actions added (signatures only — orchestration lives in the store, delegated logic lives in `src/terminal/*`):

```ts
setTerminalInput(value: string): void
submitTerminalCommand(): Promise<void>   // the one entry point Terminal.tsx calls on Enter
navigateHistory(direction: 'up' | 'down'): void
```

`clearTerminal()` and `toggleTerminal()` already exist and are unchanged in signature — `clearTerminal` becomes something the `clear` **command** calls via `CommandContext`, rather than something `Terminal.tsx` calls directly from a `case 'clear':` branch.

---

## 4. Lifecycle

```
        ┌────────────────────────────────────────────┐
        │                    idle                      │
        │  (prompt visible, input editable, history     │
        │   cursor may be non-null while browsing)       │
        └───────────────┬────────────────────────────┬─┘
                         │ Enter pressed                │ ↑ / ↓ pressed
                         ▼                               ▼
                 submitTerminalCommand()          navigateHistory()
                         │                          (stays in idle;
                         │                           mutates input +
                         │                           historyCursor only)
              ┌──────────┴──────────┐
              ▼                     ▼
     parseCommand(raw)      empty input → append
              │               blank HistoryEntry,
              ▼               return to idle
     registry.get(name)
              │
      ┌───────┴────────┐
      ▼                ▼
  not found        found → status: 'executing'
      │                     │
      ▼                     ▼
  error OutputEntry   command.execute(ctx)
      │                     │
      │             ┌───────┴────────┐
      │             ▼                ▼
      │         resolves          throws
      │             │                │
      │             ▼                ▼
      │      success/error      executor catches,
      │      CommandResult      wraps as error
      │             │            CommandResult
      │             └───────┬────────┘
      └─────────────────────┤
                             ▼
                append HistoryEntry (command + cwd + output)
                clear input, reset historyCursor to null
                             ▼
                        status: 'idle'
                             ▼
                    prompt re-renders with
                    (possibly new) cwd
```

Every transition ends back at `idle` — there is no terminal (pun noted) failure state that leaves the UI stuck. `executing` is the only non-`idle` state; it exists purely so the UI can disable/annotate the input while an async command (§11) is in flight. Synchronous built-ins pass through `executing` for a single tick.

---

## 5. Command Registry

**Requirement**: add a command without modifying the terminal.

Each command is its own module exporting one `CommandDefinition`. A single barrel file imports every command module and registers it — that barrel is the *only* file touched to add a command; `Terminal.tsx`, `executor.ts`, and the store are never edited again per new command.

```ts
type CommandCategory = 'navigation' | 'workspace' | 'information' | 'backend' | 'ai';

interface CommandContext {
  args: string[];
  raw: string;
  cwd: string;
  // Capabilities, not ambient access — commands never import the store
  // or vfsClient directly. This is what keeps them unit-testable and
  // keeps the terminal free of business logic (item 4).
  openFile: (id: string) => void;
  resolvePath: (path: string) => VirtualFile | VirtualFolder | undefined;
  setCwd: (path: string) => void;
  clearHistory: () => void;
  signal?: AbortSignal;              // for future cancellation, §13
}

interface CommandResult {
  output: OutputEntry[];
  newCwd?: string;                     // only 'cd' sets this in practice
}

interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  category: CommandCategory;
  execute: (ctx: CommandContext) => CommandResult | Promise<CommandResult>;
}
```

```ts
// registry.ts
const commandRegistry = new Map<string, CommandDefinition>();

function registerCommand(def: CommandDefinition): void;   // called once per module at import time
function getCommand(name: string): CommandDefinition | undefined;
function listCommands(): CommandDefinition[];               // for `help` and future Command Palette integration, §14
```

Aliases resolve to the same `CommandDefinition` at lookup time (`registry.get` checks a name→canonical-name alias map first) — no command is registered twice under different objects.

---

## 6. Command Execution Flow (separation of concerns)

| Layer | File | Responsibility | Must never |
|---|---|---|---|
| Terminal UI | `Terminal.tsx` | Render `history`, `input`, prompt; call `submitTerminalCommand()` / `setTerminalInput()` / `navigateHistory()` | Know what any command does |
| Store | `useStore.ts` | Own `TerminalState`; orchestrate parse → execute → append, same shape as `saveFile()` | Contain a command switch statement |
| Parser | `src/terminal/parser.ts` | `parseCommand(raw: string): ParsedCommand` — tokenize into `{ name, args }`. Pure, no I/O. | Look anything up, touch the store |
| Executor | `src/terminal/executor.ts` | `executeCommand(parsed, ctx): Promise<CommandResult>` — registry lookup, invoke, try/catch boundary | Know what a specific command does — only knows the `CommandDefinition` contract |
| Registry + commands | `src/terminal/registry.ts`, `src/terminal/commands/*.ts` | Hold and expose command implementations | Render anything, touch React |
| Output renderer | `OutputRenderer.tsx` | `OutputEntry.type` → JSX, same dispatch pattern `EditorRenderer` already uses for `file.type` | Know which command produced the entry |

Sequence for one submitted command:

```
Terminal.tsx: onSubmit → store.submitTerminalCommand()
  store: status='executing'
  store → parser.parseCommand(input) → ParsedCommand
  store → executor.executeCommand(parsed, ctx) 
    executor → registry.getCommand(parsed.name)
      not found → return error CommandResult
      found     → try { def.execute(ctx) } catch → error CommandResult
  store: append HistoryEntry{command, cwd, output}, input='', historyCursor=null, status='idle'
Terminal.tsx: re-renders from store.terminalState (new history entry, prompt reflects new cwd if changed)
```

---

## 7. Output Model

Three options were weighed:

| Option | Verdict | Why |
|---|---|---|
| Raw strings (status quo) | Rejected | Forces `OutputRenderer` to regex/parse strings to decide styling (e.g. "does this line look like an error?") — that parsing *is* business logic, violating item 4's "output rendering must not contain business logic." Cannot represent a clickable file link or a table without inventing an ad-hoc string format. |
| Fully free-form typed objects (every command invents its own shape) | Rejected | `OutputRenderer` would need per-command knowledge to render anything beyond `unknown`, recreating the exact tight coupling items 4 and 10 forbid. |
| **Closed discriminated union (`OutputEntry`)** | **Adopted** | Renderer stays a single exhaustive `switch` over `.type`, same shape as `EditorRenderer`'s dispatch over `file.type`. Extensible — new commands add a new variant — without being unbounded, and a plain-text command still only needs the trivial `{type:'text', text}` variant. |

```ts
type OutputEntry =
  | { type: 'text'; text: string }
  | { type: 'error'; text: string }
  | { type: 'file-link'; fileId: string; label: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };
  // future: 'commit-list' (github), 'problem-list' (leetcode), 'markdown' (ai) — additive only
```

A `HistoryEntry.output` is `OutputEntry[]`, not one blob — `help` producing ten lines is ten entries, each independently stylable, rather than one string joined with `\n`.

---

## 8. History Model

- **Storage**: `history: HistoryEntry[]` on the store, capped at a fixed maximum (proposed: 200 entries, FIFO eviction of the oldest) — same unbounded-growth concern `VFS_DESIGN.md` §8 flagged for playground execution history, applied here before it becomes a problem rather than after.
- **↑ / ↓ recall**: `commandLog` is **derived**, never stored: `history.map(h => h.command)`. `navigateHistory('up')` decrements `historyCursor` (starting from `null` → last index) and writes the corresponding past command into `input` as an editable draft — it does not resubmit. `navigateHistory('down')` past the newest entry sets `historyCursor = null` and clears `input` back to whatever the user was live-typing (tracked as a one-shot "pending draft" the same way shells buffer the in-progress line — a small, explicitly-scoped exception to "derive don't store," justified because it cannot be derived from `history`, which by definition doesn't contain not-yet-submitted text).
- **Persistence policy**: **session-only, in-memory.** Not written to `localStorage` and not sent to the backend. Reasoning: `BACKEND_BOOTSTRAP.md`'s hydration model is a one-shot, all-or-nothing VFS fetch (`VFS_DESIGN.md` §9.1); giving the terminal a second, independent persistence mechanism would introduce a lifecycle the hydration state machine doesn't account for, for a portfolio-demo terminal where cross-session recall isn't a real user need. Flagged as an explicit future extension point (§14), not built now.
- **Maximum history**: 200 entries (tunable constant in `src/terminal/`, not user-configurable in Sprint 5A).
- **Future extensibility**: adding async/backend commands changes what `HistoryEntry.output` contains, never the history array/cursor mechanism itself — same "additive at the edge, not the core" pattern `VFS_DESIGN.md` §9.2 used for lazy loading.

---

## 9. Prompt Model

Format: `<identity>@<workspace>:<cwd>$` — e.g. `arijit@portfolio:~$`, matching the existing hardcoded `visitor@journey:~/workspace$` closely enough that the visual identity doesn't jar.

- **Configurable?** The *identity* and *workspace-name* segments come from a small static config object (`src/terminal/prompt.ts`'s `PROMPT_IDENTITY` constant), not a string literal buried in `Terminal.tsx` JSX (today's bug). This is what lets a future `theme`/settings command change cosmetics without touching the UI component. `cwd` is never configurable — it's always the real, live value.
- **Should themes affect it?** Presentation only (color/font), never content. Matches the collab rule that the VS Code IDE metaphor must not be broken — a theme change should restyle the prompt exactly like it restyles the editor chrome, never alter what the prompt *says*.
- **Should a working directory exist?** **Yes.** `cwd: string` becomes real, store-owned, VFS-path-shaped state (§2), replacing today's hardcoded `pwd`/`cd` output (`Terminal.tsx` lines 111–114 currently return the literal string `/home/visitor/workspace` regardless of input). This is what lets `ls`/`cat`/`open` resolve against actual VFS paths instead of the current fuzzy `.includes()` name matching (§17) — and it's a prerequisite for `cd` meaning anything at all.
- `getPrompt(identity, cwd): string` is a pure function, called by `Terminal.tsx` on every render — never stored, per §2.

---

## 10. Built-in Command Philosophy

| Command | Category | Reasoning |
|---|---|---|
| `help` | Information | Reads `registry.listCommands()`; no VFS, no store mutation beyond appending output. |
| `clear` | UI navigation | Calls `ctx.clearHistory()` — pure UI-state reset, no VFS involvement. |
| `whoami` | Information | Static identity string from config — no lookup at all. |
| `pwd` | Workspace | Returns `ctx.cwd` — real now, not hardcoded (§9). |
| `ls` | Workspace | Lists children of `ctx.cwd` via `ctx.resolvePath` against the hydrated `workspaceTree`. |
| `cat` | Workspace | Resolves a path/id via `ctx.resolvePath`, returns file content as `text`/`error` entries. |
| `open` | Workspace | Resolves a path/id, calls `ctx.openFile(id)` — same store action Explorer/CommandPalette already call (§12). |
| `cd` | Workspace | The only command allowed to call `ctx.setCwd()`. |
| `projects` | Workspace | Sugar for `open` targeting the projects folder — no new mechanism. |
| `contact` / `resume` | Workspace | Same shape as `projects` — named shortcuts to `open`, not separate logic. |
| `theme` | UI navigation | Future — mutates a future `theme` store slice; prompt's presentation hook (§9) already anticipates this. |
| `github` / `leetcode` | Future backend | Require live external data the client doesn't have — see §11. |

No command category is ambiguous: **UI navigation** commands touch only ephemeral UI state; **workspace** commands touch only the already-hydrated VFS/store; **information** commands touch neither; **backend/AI** commands are the only ones that go over the network.

---

## 11. Backend Interaction

| Bucket | Commands | Why |
|---|---|---|
| Pure frontend | `help`, `whoami` | No store domain data, no network — computed entirely from static config/registry. |
| Store interaction | `clear`, `pwd`, `ls`, `cat`, `open`, `cd`, `projects`, `contact`, `resume` | VFS content is **already fully hydrated client-side** (`VFS_DESIGN.md` §9.1 — every file's `content` is inline in the one-shot tree fetch). These commands read/write the same store the Explorer and Editor already read/write; no new fetch is needed or justified. |
| Backend request | `github`, `leetcode` | Genuinely require live, non-VFS data from `IntegrationService` (Phase 3, `BACKEND_BOOTSTRAP.md` §3) — data the client cannot have hydrated locally. |
| Future AI request | e.g. `ask`/`explain` | Same shape as backend request — an LLM-backed endpoint the client has no local substitute for. The `execute()` contract already returns `Promise<CommandResult>` and the `executing` status already exists (§3–4), so adding this later requires zero lifecycle changes — only a new command module. |

This categorization is also the justification for §13.1's revision: routing VFS-backed commands through a network round-trip would add latency for information the client already has, with no correctness benefit.

---

## 12. Integration Boundaries

| Subsystem | How Terminal integrates | Coupling avoided |
|---|---|---|
| **Explorer** | Both read the same store-owned `workspaceTree`/`workspaceFiles` — no direct Explorer↔Terminal reference. | Neither component knows the other exists. |
| **Editor** | `open` calls `store.openFile(id)` — the identical action Explorer's click handler and `CommandPalette` already call. | Terminal never touches `EditorTabs`, `ShikiEditor`, `draftContent`, or any Sprint 4B save-pipeline state directly. |
| **Router** | None, directly. `openFile()` already drives `useRouterSync` today. | Terminal gains URL sync for free without any router awareness. |
| **Workspace / VFS** | `ls`/`cat`/`open`/`cd` resolve through `getFileById`/`getFileByPath`-equivalent helpers `fileSystem.ts` already exposes. | No parallel path-resolution logic invented for Terminal — one lookup implementation, reused. |
| **Store** | `terminalState` is a new top-level slice, following the exact shape `explorerState`/`commandPalette` already use. | Not a separate store, not a separate React context. |
| **Hydration** | Terminal is a passive consumer — renders as if VFS data is always present, exactly like Explorer/Editor, because by mount time it structurally always is (`App.tsx` is the only loading-aware component per `BACKEND_BOOTSTRAP.md`). | No terminal-specific loading gate. |
| **Command Palette** | Future-only (§14): `registry.listCommands()` is a flat array the palette can list in a second `Command.Group`, alongside `allFiles`. | No architecture change needed later — the registry was designed enumerable from the start. |

---

## 13. Error Handling

| Case | Handling | Where |
|---|---|---|
| Unknown command | `executor` returns a normal `CommandResult` with one `{type:'error', text:'command not found'}` entry. Not an exception. | `executor.ts`, before invoking anything |
| Execution failure (handler throws) | `executor` wraps in `try/catch` at the registry-invocation boundary, converts to an error `CommandResult` — no exception ever reaches React. | `executor.ts` |
| Backend unavailable | Backend-calling commands (`github`/`leetcode`) use the same discriminated-result pattern Sprint 4B froze for `vfsClient.updateFile` (`network-error` vs `http-error`, never a thrown `Error`) — the command maps that result to an error `OutputEntry` itself. | Inside the command module |
| Invalid arguments | The command's own `execute()` validates and returns a usage-style error entry (e.g. `Usage: open <filename>`) — the engine never inspects argument shape, only the command knows it. | Inside the command module, same self-containment precedent as `updateFileContent` in `VFS_DESIGN.md` §3.1 |
| Cancelled execution | Only meaningful for async commands. `CommandContext.signal: AbortSignal` is already in the contract (§5) so this is additive later — not built in Sprint 5A, no synchronous built-in needs it. | Future — engine transitions `executing → idle` on abort, appends a `{type:'text', text:'^C'}`-style entry |

Every error path returns the state machine to `idle`. None of them is treated as hydration-severity — this mirrors `BACKEND_BOOTSTRAP.md`'s existing distinction between blocking hydration failures and local, non-blocking per-action failures (there applied to file saves; here applied to command execution).

---

## 14. Future Extensibility

| Future addition | Mechanism already in place | New work required |
|---|---|---|
| GitHub commands | Backend-request category (§11), `commitList`-style `OutputEntry` variant (§7) | New command module + one `OutputEntry` variant + `OutputRenderer` case |
| LeetCode commands | Same as GitHub | Same shape |
| AI assistant commands | `Promise<CommandResult>` + `executing` status already model "long-running, thinking" | New command module only |
| Theme commands | UI-navigation category; prompt already isolates presentation from content (§9) | New command module + theme store slice (separate design) |
| Workspace commands (`mkdir`, etc., hypothetical) | `cwd`-relative resolution already designed (§9–10) | New command module |
| Package manager simulation (`npm run …`) | Becomes an ordinary registered command instead of a special-cased switch branch (today's actual implementation) | New command module — **removes** a special case rather than adding one |
| Task runner | Workspace/backend hybrid — same registration path | New command module, possibly backend-request category |
| Search (`find`/`grep`) | Reuses `FileNodeRepository.searchFiles()`-backed client path Search/Command Palette will already use (`VFS_DESIGN.md` §10) | Thin wrapper command, no new search implementation |
| Command Palette integration | `registry.listCommands()` already enumerable (§5, §12) | New `Command.Group` in `CommandPalette.tsx` only |

No item above requires touching `Terminal.tsx`, the store's lifecycle actions, `parser.ts`, or `executor.ts` — every addition is either a new command module or an additive `OutputEntry` variant.

---

## 15. Folder Structure

```
src/terminal/                    # domain layer — no React, no JSX
  types.ts                        # CommandDefinition, CommandContext, CommandResult,
                                    # OutputEntry, ParsedCommand, HistoryEntry
  parser.ts                        # parseCommand()
  executor.ts                       # executeCommand()
  registry.ts                        # registerCommand(), getCommand(), listCommands()
  prompt.ts                           # getPrompt() — pure derivation
  commands/
    index.ts                          # barrel — the one file touched per new command
    help.ts
    clear.ts
    whoami.ts
    pwd.ts
    ls.ts
    cat.ts
    open.ts
    cd.ts
    projects.ts
    contact.ts
    resume.ts
    # future: theme.ts, github.ts, leetcode.ts, ask.ts

src/components/terminal/
  Terminal.tsx                     # UI shell — history/prompt/input, calls store actions only
  OutputRenderer.tsx                 # NEW — OutputEntry.type → JSX, mirrors EditorRenderer
```

`src/terminal/` mirrors the existing split between domain logic (`src/lib/api`, `src/store`) and view (`src/components`) already used elsewhere in the codebase — it is not a new convention.

---

## 16. Interfaces (consolidated)

```ts
// src/terminal/types.ts

type ExecutionStatus = 'idle' | 'executing';
type CommandCategory = 'navigation' | 'workspace' | 'information' | 'backend' | 'ai';

interface ParsedCommand {
  name: string;
  args: string[];
}

type OutputEntry =
  | { type: 'text'; text: string }
  | { type: 'error'; text: string }
  | { type: 'file-link'; fileId: string; label: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

interface HistoryEntry {
  id: string;
  command: string;
  cwd: string;
  output: OutputEntry[];
  timestamp: number;
}

interface CommandContext {
  args: string[];
  raw: string;
  cwd: string;
  openFile: (id: string) => void;
  resolvePath: (path: string) => VirtualFile | VirtualFolder | undefined;
  setCwd: (path: string) => void;
  clearHistory: () => void;
  signal?: AbortSignal;
}

interface CommandResult {
  output: OutputEntry[];
  newCwd?: string;
}

interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  category: CommandCategory;
  execute: (ctx: CommandContext) => CommandResult | Promise<CommandResult>;
}

// src/terminal/parser.ts
function parseCommand(raw: string): ParsedCommand;

// src/terminal/executor.ts
function executeCommand(parsed: ParsedCommand, ctx: CommandContext): Promise<CommandResult>;

// src/terminal/registry.ts
function registerCommand(def: CommandDefinition): void;
function getCommand(name: string): CommandDefinition | undefined;
function listCommands(): CommandDefinition[];

// src/terminal/prompt.ts
function getPrompt(identity: string, workspace: string, cwd: string): string;
```

```ts
// store slice addition (useStore.ts) — signatures only
interface TerminalState {
  isOpen: boolean;
  input: string;
  status: ExecutionStatus;
  cwd: string;
  history: HistoryEntry[];
  historyCursor: number | null;
}

setTerminalInput(value: string): void;
submitTerminalCommand(): Promise<void>;
navigateHistory(direction: 'up' | 'down'): void;
```

---

## 17. Technical Debt

**Retired by this design, once implemented:**
- The `switch` statement in `Terminal.tsx` (lines 29–117 today) — replaced by registry lookup.
- Fuzzy filename matching in `open`/`cat`/`npm run` (`.includes()` substring search against `allFiles`) — replaced by real `cwd`-relative path resolution.
- Hardcoded prompt string duplicated between JSX and the `pwd`/`cd` case — replaced by `getPrompt()`.
- Component-local `input` state in `Terminal.tsx` — replaced by store-owned `terminalState.input`, closing the same class of bug Sprint 4B closed for the editor.

**Deliberately deferred, not built in Sprint 5A:**
- Command history persistence across sessions (§8) — flagged as a future extension point, not a gap.
- Cancellation (`AbortSignal` plumbing) — contract slot reserved (§5, §13), no UI trigger built yet.
- A real backend terminal engine / sandboxed execution — out of scope; every Sprint 5A-designed command is either pure-frontend or a thin client for an already-scoped Phase 3 integration endpoint.
- Command argument parsing is naive whitespace-splitting in `parseCommand` — no quoting/escaping support. Acceptable for the command set in §10; flagged for revisit if a future command needs quoted arguments (e.g. `open "my file.md"`).

---

## 18. Alternative Designs Considered — and Rejected

1. **Keep `input` as component-local state, only move `history` to the store.**
   Rejected: reproduces the exact draft/store split Sprint 4B eliminated for the editor. Two sources of truth for "what the user is currently typing" is the specific bug class this project has already paid down once.

2. **Switch-statement executor (i.e., keep today's design, just move it into the store).**
   Rejected: directly fails the stated requirement ("commands added without modifying the terminal itself") and leaves the debt `ARCHITECTURE.md`/`CURRENT_STATE.md` already flag, merely relocated.

3. **Route every command through `POST /api/terminal/execute`**, as `BACKEND_BOOTSTRAP.md`'s original Phase 2 sketch implies.
   **Revised, not silently applied** (see §13.1) — see below.

4. **Output as raw strings.**
   Rejected (§7) — pushes structure-parsing responsibility onto the renderer, which is business logic in disguise and violates item 4's separation requirement directly.

5. **Output as fully free-form per-command objects with no shared type.**
   Rejected (§7) — recreates tight coupling between renderer and commands; a closed union is the extensible-but-bounded middle ground.

6. **Derive `cwd` implicitly from the currently active editor tab/file, instead of a dedicated field.**
   Rejected: would mean opening a file from the Explorer silently teleports the terminal's working directory — an unwanted cross-subsystem coupling that item 10 explicitly warns against. `cwd` is a terminal-navigation concept, independent of editor focus.

7. **Command registry as reactive store state, registered via a store action at runtime.**
   Rejected (§2) — commands are static code, not session data. Store-based registration would permit duplicate/racing registration for zero benefit and would not survive a hypothetical future store-reset feature the way module-scoped registration does.

### 18.1 Revision proposed against `BACKEND_BOOTSTRAP.md` — pending approval

`BACKEND_BOOTSTRAP.md`'s Phase 2 Terminal Engine sketch (`POST /api/terminal/execute`, `{command, cwd}` → `{output, newCwd?, error?}`) was written before the VFS existed and implicitly assumes **every** command round-trips to the server, reimplementing a shell-like dispatcher there.

That premise no longer holds: the VFS is now fully hydrated client-side (`VFS_DESIGN.md` §9.1), so `ls`/`cat`/`open`/`pwd`/`cd` have zero information gap to close over the network — a server round-trip for these would add latency for no correctness gain, and would just relocate the switch-statement problem server-side instead of eliminating it (§11).

**Proposed revision**: keep `/api/terminal/execute` (or an equivalent) scoped narrowly to the commands in the "backend request" and "future AI request" buckets (§11) — `github`, `leetcode`, future AI — not as the universal dispatcher for every command. This is flagged here for explicit approval before Sprint 5B implementation, following the same "flag the gap, propose, get approval, then update the doc" process used for the `updateFileContent` gap found during Sprint 2C — not applied unilaterally.

---

## Sign-off

This freezes: ownership (§2), the state model (§3), the execution lifecycle (§4), the command registry contract (§5), the four-layer execution separation (§6), the output model (§7), the history model (§8), the prompt model (§9), built-in command categorization (§10–11), integration boundaries (§12), error handling (§13), and the folder structure and interfaces (§15–16) that Sprint 5B would implement against. §13.1's revision to `BACKEND_BOOTSTRAP.md` is explicitly **not** frozen — it requires sign-off before implementation. No code was written in this sprint.
