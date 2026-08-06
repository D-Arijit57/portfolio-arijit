// The right pane's own four-color palette (White/Cyan/Green/Gray), per the
// Claude Code redesign brief — reused, not invented, matching
// ContributionsTerminal.tsx's own precedent for exactly this situation.
// CYAN is index.css's existing `--tok-metric` token (its "numbers, deltas,
// throughput" role), deliberately distinct from the app-wide prompt-blue
// (`#569cd6`) used everywhere else (whoami.md, welcome.md, ...) — that's
// what gives this pane its own identity without adding a new hex value.
// GREEN is the exact color IdentityTerminals.tsx already uses for the
// "Available ●" status dot.
export const WHITE = '#cccccc';
export const CYAN = 'var(--tok-metric)';
export const GREEN = '#3fb950';
export const GRAY = '#858585';
