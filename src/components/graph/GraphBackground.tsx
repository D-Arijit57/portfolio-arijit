/**
 * Knowledge Graph background — a premium engineering surface, deliberately
 * distinct from `manifest.constellation`'s nebula/star-field aesthetic (no
 * nebula, no star field, no colorful fog, no cinematic galaxy effects, per
 * the approved brief — that visual language belongs exclusively to the
 * Tech Stack Constellation): a near-black flat surface, an extremely
 * subtle grid, faint procedural noise, and a soft vignette. Fully static —
 * no motion, no parallax; Milestone 4 is strictly a renderer, not an
 * animation layer. The `<pattern>`/`<filter>`/`<radialGradient>` defs this
 * reads (`graph-grid`, `graph-noise`, `graph-vignette`) live once in
 * KnowledgeGraphScene's `<defs>`.
 */
export function GraphBackground({ width, height }: { width: number; height: number }) {
  return (
    <>
      <rect x={0} y={0} width={width} height={height} fill="#0b0d10" />
      <rect x={0} y={0} width={width} height={height} fill="url(#graph-grid)" />
      <rect x={0} y={0} width={width} height={height} fill="#000000" filter="url(#graph-noise)" />
      <rect x={0} y={0} width={width} height={height} fill="url(#graph-vignette)" />
    </>
  );
}
