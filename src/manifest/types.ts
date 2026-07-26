/**
 * Domain model for the Manifest Viewer — the same "structured model is the
 * source of truth, the renderer only reads it" philosophy as the
 * Architecture Platform (src/architecture/types.ts), applied to
 * manifest.json instead of architecture.mmd.
 */

export interface ManifestTechnology {
  technology: string;
  role: string;
  /** One-line supporting detail, shown beneath the role. Optional — a technology without one just omits that line. */
  description?: string;
  /** Sub-capabilities or a single coarse label (e.g. "Core", "Managed Service") rendered as badges. Optional — falls back to `role` alone when absent. */
  tags?: string[];
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
