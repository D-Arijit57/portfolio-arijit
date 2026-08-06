// Shared animation constants for the right pane's terminal-story sequence
// (TerminalRunner and its phase components). Centralized so timing stays
// consistent across phases without each component inventing its own
// numbers — matches the brief's recommended ranges.

export const CHAR_MS_RANGE: [number, number] = [20, 35];
export const LINE_GAP_MS = 100;
export const ASCII_ROW_STAGGER_MS = 70;
export const STATUS_PAUSE_MS = 500;
export const PROGRESS_BAR_STEP_MS = 45;
export const BAR_STAGGER_MS = 120;
