/**
 * Phase 4 (Layout, Responsive & Workspace Geometry) audit's measured
 * breakpoints — not arbitrary. At 1024px the split editor's welcome.md
 * pane starts wrapping to 4-5 words/line as Explorer's fixed 220px eats an
 * increasing share of the shrinking viewport; collapsing Explorer below
 * this width is what actually recovers usable editor space. At 768px the
 * split editor's left pane hits its 200px hard floor (see useStore.ts's
 * `setSplitRatio`) and wraps to 3-4 words/line regardless of Explorer
 * state — below this width, showing both panes side by side stops being
 * viable at all, so a workspace with two open panes shows only the active
 * one.
 */
export const EXPLORER_COLLAPSE_BREAKPOINT_PX = 1024;
export const SINGLE_PANE_BREAKPOINT_PX = 768;
