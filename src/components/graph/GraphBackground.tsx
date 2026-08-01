/**
 * Knowledge Graph background — reuses `ArchitectureCanvas.tsx`'s own
 * background exactly (`architecture.mmd`'s canvas): a solid `#1e1e1e`
 * fill plus a static 24x24px dot grid (1px `#333333` dots), per explicit
 * request to match it. Fully static — no motion, no parallax.
 *
 * Deliberately self-contained (`<defs>` and all) rather than sharing defs
 * with the content SVG, and deliberately rendered in its OWN un-viewBox'd
 * `<svg>` (see `KnowledgeGraphScene.tsx`) rather than inside the graph's
 * viewBox'd content SVG — the content SVG's `viewBox` maps to the graph's
 * own world-space bounds, which only matches the container's actual
 * aspect ratio by coincidence; on a mismatch, `preserveAspectRatio`
 * letterboxes the viewBox'd content, leaving large uncovered regions with
 * no grid at all (confirmed live: an extreme 1530x213 container against a
 * roughly-square ~1209x1253 viewBox left ~660px bare on each side). A
 * background sized via plain `width="100%" height="100%"` in its own
 * un-viewBox'd SVG fills the real container edge-to-edge on any aspect
 * ratio, exactly like `ArchitectureCanvas.tsx`'s own background does.
 */
export function GraphBackground() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <pattern id="graph-grid" width={24} height={24} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill="#333333" />
        </pattern>
      </defs>
      <rect x={0} y={0} width="100%" height="100%" fill="#1e1e1e" />
      <rect x={0} y={0} width="100%" height="100%" fill="url(#graph-grid)" />
    </svg>
  );
}
