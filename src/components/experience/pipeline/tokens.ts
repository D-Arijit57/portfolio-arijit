/**
 * The pipeline's palette, drawn entirely from values already in this
 * workspace — #4fc1ff is VS Code's own light-blue token colour (also in
 * index.css), #d7ba7d its warm string/number tone (architecture/categories,
 * manifest/colorHash), and the greys are the editor surfaces themselves.
 * Nothing new is invented here, which is most of why the pipeline reads as
 * part of the workspace rather than as a visualization dropped into it.
 */
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
 * exactly how cortexa.md itself relates its own two backgrounds.
 */
export const SURFACE = '#0F1117';
export const RULE = '#333333';
export const STRONG = '#e7e7e7';
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

export const ACCENT = '#4fc1ff';
export const METRIC = '#d7ba7d';

/** VS Code's own diff channels — the evidence language. */
export const DIFF_REMOVED = '#c9736b';
export const DIFF_ADDED = '#6a9955';

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
 * this feature's shell now does too. SURFACE (below) was copied alongside
 * these in a follow-up pass — see its own comment.
 */
export const PANEL_BG = '#161B22';
export const PANEL_BORDER = 'rgba(255,255,255,0.08)';

/**
 * Shell "success" green for the boot sequence's `200 OK` —
 * `documentation/ExecutionReplayTerminal.tsx`'s own `SUCCESS` (`#6EE7B7`),
 * the closest real analogue in cortexa.md to a status line reporting a
 * process outcome. Supersedes an earlier choice of the traffic-light dot's
 * own green (`#27c93f`): a reasonable reuse on its own, but not what
 * cortexa.md itself uses for this role.
 */
export const SUCCESS = '#6EE7B7';
