/**
 * Domain model for the Knowledge Graph renderer — generic graph
 * infrastructure, not a "skills" concept. `skills.graph` is the first file
 * to use this shape; a future `resume.graph` or `projects.graph` would
 * reuse it unmodified, since nothing here names a specific graph's domain.
 * Same "structured model is the source of truth, the renderer only reads
 * it" philosophy as the Manifest Constellation's `manifest/types.ts`.
 *
 * Field list mirrors what the Inspector Panel is specified to render
 * (icon, description, experience, progress, projects, related, strengths,
 * notes, documentation, tags) as named optional fields rather than an
 * untyped attributes bag — everything here is optional except
 * `id`/`name`/`category`, so a future graph type that only populates a
 * subset costs nothing, and the Inspector Panel can render a real progress
 * bar / strengths checklist instead of generic key-value rows.
 */

export type GraphNodeProficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface GraphNode {
  id: string;
  name: string;
  category: string;
  icon?: string;
  description?: string;
  proficiency?: GraphNodeProficiency;
  /** 0-100. Drives the Inspector Panel's progress bar. Never inferred —
   * only ever set where the source content states it explicitly. */
  proficiencyPercent?: number;
  years?: number;
  isCore?: boolean;
  projects?: string[];
  /** Other node ids within the same GraphModel. Deliberately NOT rendered
   * as permanent graph edges (see constellationGraph's `connectsTo` for
   * the contrast) — the renderer only surfaces these in the Inspector
   * Panel and as a temporary highlight on hover/select. */
  relatedNodes?: string[];
  prerequisites?: string[];
  strengths?: string[];
  documentation?: string;
  tags?: string[];
  /** Free-form author notes, rendered verbatim in the Inspector Panel's
   * "Notes" section when present. */
  notes?: string;
}

export interface GraphCategory {
  key: string;
  title: string;
  nodes: GraphNode[];
}

export interface GraphModel {
  /** The center node's own label — e.g. "Skills". Not a person's name. */
  title: string;
  description: string;
  categories: GraphCategory[];
}
