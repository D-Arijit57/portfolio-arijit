/**
 * Deterministic string -> palette-index hashing, shared by category and
 * badge coloring. The same input string always maps to the same color, so
 * a brand-new category or role picks up a stable, consistent color on
 * first render with zero authored data — no color needs to be hand-picked
 * per category/role for the "must render automatically" requirement to
 * hold.
 */
export function hashStringToIndex(value: string, paletteSize: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % paletteSize;
}

/**
 * A shared muted, desaturated palette — the same family of colors
 * src/architecture/categories.ts already uses (VS Code's own syntax-theme
 * hues), reused here rather than inventing a second palette for a second
 * subsystem.
 */
export const MUTED_PALETTE = [
  '#569cd6', // blue
  '#4ec9b0', // teal
  '#c586c0', // purple
  '#dcdcaa', // yellow
  '#ce9178', // rust
  '#9cdcfe', // light blue
  '#b5cea8', // green
  '#d7ba7d', // tan
] as const;

export function colorForString(value: string): string {
  return MUTED_PALETTE[hashStringToIndex(value, MUTED_PALETTE.length)];
}
