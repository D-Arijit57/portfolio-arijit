/**
 * Domain model for the Manifest Viewer — the same "structured model is the
 * source of truth, the renderer only reads it" philosophy as the
 * Architecture Platform (src/architecture/types.ts), applied to
 * manifest.json instead of architecture.mmd.
 */

export type ManifestImportance = 'primary' | 'secondary' | 'supporting';

/** Optional curated positioning for the Tech Stack Constellation — a technology may specify none, some, or all of these; the renderer generates sensible defaults for whatever's absent. Never required, so ordinary manifest entries with no opinion about their own layout are unaffected. */
export interface ManifestLayoutHint {
  /** 0 = the constellation's center. Absent nodes default to 1 (an outer ring). */
  depth?: number;
  /** Which radius band a node sits on — a coarser knob than an exact radius. */
  orbit?: number;
  /** Degrees (0-360) around its orbit. Absent nodes get an intelligent default (clustered by category). */
  angle?: number;
}

export interface ManifestTechnology {
  technology: string;
  role: string;
  /** One-line supporting detail, shown beneath the role. Optional — a technology without one just omits that line. */
  description?: string;
  /** Sub-capabilities or a single coarse label (e.g. "Core", "Managed Service") rendered as badges. Optional — falls back to `role` alone when absent. */
  tags?: string[];
  /** Visual hierarchy for the Tech Stack Constellation (node size/prominence). Optional — defaults to a category-position-derived tier when absent. */
  importance?: ManifestImportance;
  /** Optional curated position for the Tech Stack Constellation. */
  layoutHint?: ManifestLayoutHint;
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
