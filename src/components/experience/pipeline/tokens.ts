/**
 * The pipeline's palette, drawn entirely from values already in this
 * workspace — #4fc1ff is VS Code's own light-blue token colour (also in
 * index.css), #d7ba7d its warm string/number tone (architecture/categories,
 * manifest/colorHash), and the greys are the editor surfaces themselves.
 * Nothing new is invented here, which is most of why the pipeline reads as
 * part of the workspace rather than as a visualization dropped into it.
 */
export const SURFACE = '#1e1e1e';
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

export const ACTIVE_BG = 'rgba(255,255,255,0.04)';
