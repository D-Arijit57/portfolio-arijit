/**
 * Domain model for work_history.yaml — the same "structured model is the
 * source of truth, the renderer only reads it" philosophy as the
 * Architecture Platform (src/architecture/types.ts) and the Manifest
 * Viewer (src/manifest/types.ts), applied to work history instead.
 *
 * Two layers live here, deliberately separated:
 *
 *   `highlights`   the résumé sentences. The only thing yamlRenderer.ts
 *                  reads, and therefore the only thing that reaches the
 *                  displayed work_history.yaml source.
 *
 *   `visualization` an *interpretation* of those same sentences as the
 *                  system they describe. Model-only. It never reaches the
 *                  YAML, which is why the generated source stays
 *                  byte-identical to the two hand-maintained seed copies
 *                  (src/content/workspaceSeed.ts and
 *                  server/repositories/seed/workspaceSeed.ts).
 *
 * Every stage carries `sourceHighlights` so the interpretation can always
 * be traced back to the sentence it came from — that traceability is what
 * makes the second layer honest rather than a parallel set of facts.
 */

export interface Highlight {
  /** The sentence, rendered verbatim into both the YAML source and preview. */
  text: string;
  /**
   * The measurement this sentence already states, surfaced by the renderer
   * ("2 hrs/wk", "−35% defects"). Deliberately *not* a YAML key: the value
   * is already present inside `text`, so it's an annotation of the source
   * rather than a fact the file never mentions.
   */
  metric?: string;
}

/* ────────────────────────── metrics ────────────────────────── */

export interface Metric {
  id: string;
  /** What is being measured — "lookup time", "documents indexed". */
  label: string;
  /** Display string, always present. "under 2 min", "200+", "−35%". */
  value: string;
  /**
   * Present if — and ONLY if — this metric is two genuinely commensurable
   * numbers in the same unit, and is therefore safe to draw as proportional
   * geometry. A rate ("2 hrs/week saved"), a ratio ("−35%") and a count
   * ("2 features") all fail that test and must leave this undefined; the
   * renderer then falls back to the value string alone rather than
   * inventing an axis. This field is the single gate on every proportional
   * mark in the pipeline.
   */
  comparison?: {
    from: number;
    to: number;
    unit: string;
  };
}

/* ────────────────────────── stages ─────────────────────────── */

export interface StageState {
  /** One line, present tense — rendered as one side of the −/+ diff pair. */
  summary: string;
}

export interface PipelineStage {
  id: string;
  /** Short, lowercase, log-style: "intake", "extract", "retrieve". */
  label: string;
  /** What this stage *is* — true of the system with or without him. */
  description: string;
  /**
   * The outcome at this stage in one line (≤ ~40 chars), shown in the
   * stage's own column on the axis so all four read at rest without a
   * click. Absent for a stage he didn't change — the column falls back to
   * `description`, which is the honest thing to show when there is no
   * outcome to claim. Model-only; never reaches the YAML.
   */
  claim?: string;
  /**
   * What *he* did here. Absent means he didn't change this stage; it exists
   * for context so the pipeline reads as a real system rather than as a
   * list of his contributions with connectors drawn between them.
   */
  contribution?: string;
  technologies?: string[];
  metrics?: Metric[];
  /** Both optional and independent — a stage may have neither, or only one. */
  before?: StageState;
  after?: StageState;
  /**
   * Indices into the owning Experience's `highlights`. The audit trail from
   * interpretation back to source. Empty for context-only stages.
   */
  sourceHighlights: number[];
}

/**
 * Work that isn't a stage because nothing flows through it — reliability
 * across the whole system, or how the work was delivered. Forcing these
 * into the pipeline would mean inventing a stage that doesn't exist.
 */
export interface SpanningContribution {
  id: string;
  label: string;
  contribution: string;
  technologies?: string[];
  metrics?: Metric[];
  sourceHighlights: number[];
}

/* ─────────────────────── visualizations ────────────────────── */

export interface PipelineVisualizationModel {
  type: 'pipeline';
  /**
   * What moves through the system: "a document, end to end". There is
   * deliberately no accompanying description — the axis below states the
   * workflow, and a sentence explaining what the diagram is about to show
   * is the kind of copy this page exists to make unnecessary.
   */
  title: string;
  /**
   * Rendered verbatim in the footer. The pipeline is an interpretation of
   * work_history.yaml, not instrumentation of a live system, and the page
   * says so rather than implying otherwise.
   */
  derivedFrom: string;
  stages: PipelineStage[];
  spanning?: SpanningContribution[];
}

/**
 * The extension point. A second renderer (timeline, system) would add its
 * own member here and its own branch in ExperienceVisualizationViewer —
 * nothing else changes. Deliberately a union of one until a second dataset
 * actually needs it.
 */
export type ExperienceVisualization = PipelineVisualizationModel;

/* ─────────────────────── experience ────────────────────────── */

export interface WorkExperience {
  id: string;
  company: string;
  /** Official company website — the external-link destination in the header. */
  companyUrl: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string | 'Present';
  /** One sentence: what the system was, and who used it. */
  description: string;
  tech: string[];
  highlights: Highlight[];
  visualization: ExperienceVisualization;
}
