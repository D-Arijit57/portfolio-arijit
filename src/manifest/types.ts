/**
 * Domain model for the Manifest Viewer — the same "structured model is the
 * source of truth, the renderer only reads it" philosophy as the
 * Architecture Platform (src/architecture/types.ts), applied to
 * manifest.json instead of architecture.mmd.
 */

export type ManifestImportance = 'primary' | 'secondary' | 'supporting';

/**
 * Hand-authored anchor point for the Tech Stack Constellation, in a
 * normalized [0, 1] coordinate space — 0 is the composition's own left/top
 * edge, 1 its right/bottom edge, NOT the viewport. This is a deliberate
 * "data-driven, not auto-generated" layout: a project's visual composition
 * (asymmetric, organic, varying edge lengths) is authored once by hand
 * alongside its tech list, exactly like `connectsTo` authors the topology.
 * A manifest's positions don't need to span the full 0-1 square — the
 * renderer (constellationLayout.ts) computes the *actual used* bounding
 * box from whatever positions are authored, then fits that box into the
 * real viewport preserving its aspect ratio, so the same relative
 * composition (not the same absolute pixels) reproduces on any screen
 * size. A technology without a position falls back to a simple
 * deterministic layered default so an unpositioned manifest still renders
 * something reasonable, just not hand-tuned.
 */
export interface ManifestPosition {
  x: number;
  y: number;
}

export interface ManifestTechnology {
  technology: string;
  role: string;
  /** One-line supporting detail, shown beneath the role. Optional — a technology without one just omits that line. */
  description?: string;
  /** Sub-capabilities or a single coarse label (e.g. "Core", "Managed Service") rendered as badges. Optional — falls back to `role` alone when absent. */
  tags?: string[];
  /** Visual hierarchy for the Tech Stack Constellation (node size/prominence). Optional — defaults to 'supporting' when absent. */
  importance?: ManifestImportance;
  /** Hand-authored position in the Tech Stack Constellation's design space. */
  position?: ManifestPosition;
  /** Explicit per-technology identity color (`#rrggbb`) for the Tech Stack
   * Constellation. Optional — a technology without one falls back to the
   * existing category-hash color (constellationColorForCategory in
   * constellationGraph.ts), exactly as before this field existed. This is
   * what lets a project give its own major technologies distinct identity
   * colors (e.g. Flutter blue, Firebase orange) even when several of them
   * share one constellation.explore category, without touching category-based
   * coloring for every other project's manifest. */
  color?: string;
  /** Other technologies (by their `technology` name, within the same manifest) this one visually connects to and logically precedes in the Tech Stack Constellation's construction sequence — e.g. "Clerk" listing `connectsTo: ["React", "Convex"]`. The authored topology, not an inferred one. A manifest with no `connectsTo` anywhere falls back to a simple declaration-order chain. */
  connectsTo?: string[];
}

export interface ManifestCategory {
  /** Raw JSON key (e.g. 'frontend', 'observability') — never a hardcoded enum, any key works. */
  key: string;
  /** Humanized for display (e.g. 'developerExperience' -> 'Developer Experience'). */
  title: string;
  technologies: ManifestTechnology[];
}

export interface ManifestModel {
  project: string;
  description: string;
  categories: ManifestCategory[];
}
