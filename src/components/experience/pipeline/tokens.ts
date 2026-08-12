/**
 * The pipeline's palette. Phase 9B (third pass): DIFF_ADDED was `#6a9955`
 * (VS Code's diff-added green) — replaced with the literal bright ANSI
 * green Apple's Terminal.app "Pro" profile actually ships (decoded from its
 * real .terminal color profile, not an approximation), same as
 * `terminalTokens.ts`'s `PALETTE.docPanel.success`. ACCENT went through the
 * same swap (was `#4fc1ff`, briefly Apple's ANSI blue `#2009DB`) but that
 * one was reverted back to `#569cd6`, the app's dominant prompt blue.
 * `#d7ba7d` (warm string/number tone) and the greys are untouched.
 */
import { PALETTE } from '../../shared/terminalTokens';

/**
 * The workspace background behind Terminal 1/2 (PipelineVisualization's own
 * root, not the app-wide editor background elsewhere) —
 * `ProjectDocumentationViewer.tsx`'s own `CORTEXA_BACKGROUND` verbatim,
 * replacing the generic editor `#1e1e1e` every other doc in this workspace
 * still uses. Copied alongside `PANEL_BG` so the whole page, not just the
 * terminal shells, converges on cortexa.md — which means the panel-vs-page
 * contrast direction flips from the previous pass: `#0F1117` is *darker*
 * than `PANEL_BG` (`#161B22`), so the terminals now read as sitting
 * slightly *forward* of the page rather than as near-black cutouts sunk
 * into a lighter workspace. That inversion is real, not an oversight — it's
 * exactly how cortexa.md itself relates its own two backgrounds. Now the
 * shared `terminalTokens.ts`'s `PALETTE.docPanel.page`, this file's own
 * copy of the same literal.
 */
export const SURFACE: string = PALETTE.docPanel.page;
export const RULE = '#333333';
/**
 * Phase 3: was `#e7e7e7`, an undocumented one-off a shade off every other
 * "strong text" value in the workspace (`#e5e7eb` markdown-prose headings,
 * `#E5E7EB` Cortexa's own `TEXT`) — corrected onto `PALETTE.docPanel.text`,
 * the value the rest of this pipeline's terminal shells already use.
 */
export const STRONG: string = PALETTE.docPanel.text;
export const TEXT = '#cccccc';
export const MUTED = '#9d9d9d';
export const FAINT = '#858585';
/**
 * Tertiary *chrome* only — separators, interpunct glyphs, the rules between
 * things. At ~3.3:1 on #1e1e1e this sits under the 4.5:1 floor, so nothing
 * a reader has to actually read may use it.
 */
export const DIM = '#6e6e6e';
/**
 * The quietest colour permitted to carry *content* — provenance lines,
 * metric labels, the note on a stage with no contribution. ~4.8:1 on
 * #1e1e1e, so it clears WCAG AA while staying visibly subordinate to
 * MUTED. Deliberately a second token rather than a global lift of DIM: the
 * workspace's tertiary grey is still correct where it isn't being read.
 */
export const CONTENT_DIM = '#8a8a8a';

export const ACCENT = '#569cd6';
export const METRIC = '#d7ba7d';

/**
 * Per-stage identity colours — what a stage, its architecture block, its
 * connector and its legend dot all wear, so a line can be followed back to
 * the thing it came from without a key.
 *
 * No new hue enters the palette. These are exactly the five values
 * `resume/evidence/claims.ts` already established as this workspace's
 * identity set (and documented there as "values the workspace already uses —
 * the success green, the prompt blue, the tradeoff amber, `--tok-concept`
 * purple, and the shared MUTED_PALETTE teal").
 *
 * Assignment is derived, never keyed by stage id: a stage he didn't change
 * takes CONTEXT, and each stage he did takes the next hue in order. That way
 * the mapping survives a stage being renamed, reordered, added or removed —
 * the same reason nothing else on this page is keyed by a literal id.
 */
export const STAGE_CONTEXT_ACCENT = '#4CD964';
export const STAGE_CONTRIBUTION_ACCENTS = ['#c586c0', '#569cd6', '#e2c08d', '#4ec9b0'] as const;

/** VS Code's own diff channels — the evidence language. */
export const DIFF_REMOVED = '#c9736b';
export const DIFF_ADDED = '#4CD964';

/**
 * Terminal-shell panel colours for Terminal 1 and 2 (see pipeline/terminal/
 * ExperienceTerminalPanel.tsx) — `documentation/CortexaTerminalPanel.tsx`'s
 * own `PANEL_BG`/`BORDER` verbatim, not a lookalike. Two prior passes tuned
 * these independently (whoami.md's TerminalInfoCard values, then a
 * user-supplied reference render's pixel-sampled near-black); this pass
 * supersedes both because the brief now asks for cortexa.md's *exact*
 * terminal style rather than something inspired by it. The border is
 * translucent white rather than an opaque grey — Cortexa uses the same
 * value for both the panel's outer frame and its header divider, which
 * this feature's shell now does too. SURFACE (above) was copied alongside
 * these in a follow-up pass — see its own comment. Both now the shared
 * `terminalTokens.ts`'s `PALETTE.docPanel` entries.
 */
export const PANEL_BG: string = PALETTE.docPanel.bg;
export const PANEL_BORDER: string = PALETTE.docPanel.border;

/**
 * Shell "success" green for the boot sequence's `200 OK` —
 * `documentation/ExecutionReplayTerminal.tsx`'s own `SUCCESS` (`#6EE7B7`),
 * the closest real analogue in cortexa.md to a status line reporting a
 * process outcome. Supersedes an earlier choice of the traffic-light dot's
 * own green (`#27c93f`): a reasonable reuse on its own, but not what
 * cortexa.md itself uses for this role. Now `PALETTE.docPanel.success`.
 */
export const SUCCESS: string = PALETTE.docPanel.success;
