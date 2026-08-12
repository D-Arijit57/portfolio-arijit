import type {
  Metric,
  PipelineStage,
  PipelineVisualizationModel,
  SpanningContribution,
  WorkExperience,
} from './types';
import { comparisonGeometry, formatDuration, isContributed, type ComparisonGeometry } from './pipeline';

/**
 * The Engineering Workspace projection — `WorkExperience` in, a set of
 * artifacts and the relationships between them out.
 *
 * The same "model in, view out" contract `renderers/yamlRenderer.ts` has with
 * americanchase.yaml and `modelToMermaid()` has with architecture.mmd, applied
 * to the canvas instead of to a text format. Pure functions only: no React, no
 * JSX, no DOM, and — the rule that actually matters here —
 *
 *   **no American Chase prose is authored in this file.**
 *
 * Every string that reaches the screen is either read straight off
 * `src/content/workHistory.ts` or a deterministic transformation of something
 * that was (a label uppercased, a duration formatted, a percentage computed
 * from two numbers the model already states). `claims.ts` holds itself to the
 * same rule for hire_me.md's evidence map; this is that rule applied to a
 * larger surface. It is what makes the canvas a *view* of the model rather
 * than a second copy of it.
 *
 * Two consequences worth stating, because they are load-bearing:
 *
 *   1. An artifact with no backing data is never emitted. There is no empty
 *      shell, no "N/A", no placeholder — if `spanning` disappeared tomorrow,
 *      `shipped/` and its connectors would simply stop existing.
 *   2. Proportional geometry is gated on `comparisonGeometry()` alone, which
 *      is the one place in this codebase allowed to say "yes, these two
 *      numbers may be drawn as a ratio". Nothing here second-guesses it.
 */

/* ─────────────────────────── artifacts ─────────────────────────── */

export type ArtifactKind = 'architecture' | 'metrics' | 'shipped' | 'source';

/**
 * One block in architecture.ts — a stage seen as *structure* rather than as a
 * step that produced something.
 *
 * The field choice is the whole reason this artifact isn't a second copy of
 * the pipeline: it reads `description` ("what this stage *is* — true of the
 * system with or without him", per the model's own comment) where the
 * pipeline reads `claim ?? description` ("the outcome at this stage"). One
 * says what the system is made of; the other says what changed. A stage with
 * no `claim` — intake — is the single place the two overlap, which is correct:
 * there is nothing there but structure.
 */
export interface ArchitectureBlock {
  /** The stage's own id. */
  id: string;
  label: string;
  /** `stage.description`, verbatim. Never `claim`. */
  description: string;
  technologies: string[];
  /**
   * No declared technologies — the document entering the system rather than a
   * component of it. Rendered as the flow's boundary instead of as a block
   * with an empty technology row.
   */
  boundary: boolean;
  sourceHighlights: number[];
}

/**
 * One measurement in metrics.log, carrying its own provenance.
 *
 * `geometry` is present if and only if `comparisonGeometry()` returned
 * something — i.e. two commensurable numbers in one unit. Every other metric
 * in this dataset (a rate, a ratio, two counts) leaves it undefined and is
 * rendered as its value string. `improvement` is derived from `geometry` and
 * therefore inherits exactly the same gate: there is no path to a percentage
 * that doesn't go through a real comparison first.
 */
export interface MetricReading {
  id: string;
  label: string;
  value: string;
  /** The stage or spanning contribution this measurement belongs to. */
  ownerId: string;
  ownerLabel: string;
  /** True when the owner is a pipeline stage — the only case that can carry a connector. */
  ownerIsStage: boolean;
  sourceHighlights: number[];
  geometry?: ComparisonGeometry;
  /** "−60%", computed from `geometry`. Undefined whenever `geometry` is. */
  improvement?: string;
}

/**
 * One cross-cutting contribution in shipped/ — work that isn't a stage
 * because nothing flows through it (see `SpanningContribution`'s own comment).
 */
export interface ShippedGroup {
  id: string;
  label: string;
  contribution: string;
  technologies: string[];
  metrics: Metric[];
  sourceHighlights: number[];
  /**
   * Deterministic placeholder names generated from a whole-number count
   * metric — `"2"` becomes two entries. The model states *how many* features
   * were delivered and never names them, so these are explicitly not the real
   * names, and the renderer says so. Absent whenever no metric on this group
   * parses as a small whole number.
   */
  deliverables?: string[];
}

interface ArtifactBase {
  id: string;
  title: string;
  /** The `$` line printed as the artifact's first body row. */
  command: string;
  /** Every highlight index this artifact's content traces back to. */
  sourceHighlights: number[];
}

export type Artifact =
  | (ArtifactBase & { kind: 'architecture'; payload: { blocks: ArchitectureBlock[] } })
  | (ArtifactBase & { kind: 'metrics'; payload: { readings: MetricReading[] } })
  | (ArtifactBase & { kind: 'shipped'; payload: { groups: ShippedGroup[] } })
  | (ArtifactBase & { kind: 'source'; payload: { fileId: string } });

/* ───────────────────────── relationships ───────────────────────── */

/**
 * Deliberately three kinds, and deliberately not four.
 *
 * A `uses` relationship (artifact → technology inventory) was considered and
 * dropped: with no separate tech-stack panel, technologies are rendered
 * *inside* architecture.ts, so there is no second artifact for such an edge to
 * terminate on. An edge needs two endpoints that both exist on screen.
 */
export type RelationshipKind = 'describes' | 'measures' | 'evidences';

export interface Relationship {
  /** Stable and readable: "architecture→extract". Never an index, never a uuid. */
  id: string;
  /** Artifact id. */
  from: string;
  /** Pipeline stage id. */
  to: string;
  kind: RelationshipKind;
  /**
   * Why this edge exists, quoted from the model — the sentence or measurement
   * that makes the relationship true. Never a description of the edge written
   * here.
   */
  reason: string;
  /**
   * Drawn at rest, or only while its artifact is hovered/focused.
   *
   * `evidences` is hover-only on purpose: the source file backs every stage on
   * the page, so drawing that set permanently would be four lines from one
   * node to everything — the exact "connector spaghetti" this system exists to
   * avoid. At rest the canvas shows six edges that each say something specific.
   */
  restingVisible: boolean;
}

/* ────────────────────────── the workspace ──────────────────────── */

export interface WorkspaceIdentity {
  company: string;
  companyUrl: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  /** `formatDuration()` — "1y 5m". */
  duration: string;
  techCount: number;
  description: string;
  /** `visualization.title` — "a document, end to end". */
  title: string;
}

export interface ExperienceWorkspace {
  identity: WorkspaceIdentity;
  artifacts: Artifact[];
  relationships: Relationship[];
  /** The canonical stages, passed through untouched for the pipeline column. */
  stages: PipelineStage[];
  /** Every measurement on the page, flattened. The metrics artifact renders this same array. */
  impact: MetricReading[];
  /** `visualization.derivedFrom`, rendered verbatim in the footer. */
  provenance: string;
}

/* ───────────────────────── derivation ──────────────────────────── */

/** "−60%" from a real comparison. The minus is U+2212, matching the model's own "−35%". */
function improvementFrom(geometry: ComparisonGeometry): string | undefined {
  const { from, to } = geometry;
  if (from <= 0) return undefined;
  const delta = Math.round(((to - from) / from) * 100);
  if (delta === 0) return undefined;
  return delta < 0 ? `−${Math.abs(delta)}%` : `+${delta}%`;
}

function readingsFrom(
  owner: { id: string; label: string; metrics?: Metric[]; sourceHighlights: number[] },
  ownerIsStage: boolean,
): MetricReading[] {
  return (owner.metrics ?? []).map((metric) => {
    const geometry = comparisonGeometry(metric);
    return {
      id: metric.id,
      label: metric.label,
      value: metric.value,
      ownerId: owner.id,
      ownerLabel: owner.label,
      ownerIsStage,
      sourceHighlights: owner.sourceHighlights,
      geometry,
      improvement: geometry ? improvementFrom(geometry) : undefined,
    };
  });
}

/** "AI-assisted features" → "ai-assisted-feature". Lowercased, hyphenated, de-pluralised. */
function deliverableBaseName(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.endsWith('s') ? slug.slice(0, -1) : slug;
}

/**
 * Placeholder entries for a count metric — `"2"` → two names. Returns
 * undefined unless some metric on the group is a plain whole number in a
 * sane range, so a value like "5+" or "−35%" can never become a file listing.
 */
function deliverablesFrom(group: SpanningContribution): string[] | undefined {
  for (const metric of group.metrics ?? []) {
    if (!/^\d+$/.test(metric.value.trim())) continue;
    const count = Number(metric.value.trim());
    if (!Number.isInteger(count) || count < 1 || count > 12) continue;
    const base = deliverableBaseName(metric.label);
    if (!base) continue;
    return Array.from({ length: count }, (_, i) => `${base}-${String(i + 1).padStart(2, '0')}`);
  }
  return undefined;
}

function unionHighlights(sets: number[][]): number[] {
  return [...new Set(sets.flat())].sort((a, b) => a - b);
}

function buildArchitecture(visualization: PipelineVisualizationModel): Artifact | undefined {
  const blocks: ArchitectureBlock[] = visualization.stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    description: stage.description,
    technologies: stage.technologies ?? [],
    boundary: (stage.technologies ?? []).length === 0,
    sourceHighlights: stage.sourceHighlights,
  }));

  // Nothing to draw a structure from if no stage declares a single technology.
  if (blocks.every((block) => block.boundary)) return undefined;

  return {
    id: 'architecture',
    kind: 'architecture',
    title: 'architecture.ts',
    command: 'cat architecture.ts',
    sourceHighlights: unionHighlights(blocks.map((block) => block.sourceHighlights)),
    payload: { blocks },
  };
}

function buildMetrics(readings: MetricReading[]): Artifact | undefined {
  if (readings.length === 0) return undefined;
  return {
    id: 'metrics',
    kind: 'metrics',
    title: 'metrics.log',
    command: 'cat metrics.log',
    sourceHighlights: unionHighlights(readings.map((reading) => reading.sourceHighlights)),
    payload: { readings },
  };
}

function buildShipped(visualization: PipelineVisualizationModel): Artifact | undefined {
  const spanning = visualization.spanning ?? [];
  if (spanning.length === 0) return undefined;

  const groups: ShippedGroup[] = spanning
    .map((group) => ({
      id: group.id,
      label: group.label,
      contribution: group.contribution,
      technologies: group.technologies ?? [],
      metrics: group.metrics ?? [],
      sourceHighlights: group.sourceHighlights,
      deliverables: deliverablesFrom(group),
    }))
    // A group with countable deliverables leads, since that is what an
    // artifact called `shipped/` is primarily reporting. Deterministic and
    // stable: the predicate is a property of the data, and groups that agree
    // on it keep their order in the model.
    .sort((a, b) => Number(Boolean(b.deliverables)) - Number(Boolean(a.deliverables)));

  return {
    id: 'shipped',
    kind: 'shipped',
    title: 'shipped/',
    command: 'ls shipped/',
    sourceHighlights: unionHighlights(groups.map((group) => group.sourceHighlights)),
    payload: { groups },
  };
}

function buildSource(experience: WorkExperience, fileId: string): Artifact {
  return {
    id: 'source',
    kind: 'source',
    title: 'americanchase.yaml — source',
    command: 'cat ./americanchase.yaml',
    sourceHighlights: experience.highlights.map((_, index) => index),
    payload: { fileId },
  };
}

/**
 * Relationships, derived rather than enumerated.
 *
 * Each rule below is a predicate over the canonical model — change the model
 * and the edge set changes with it, which is the only way a relationship graph
 * stays honest as the data moves.
 */
function buildRelationships(
  artifacts: Artifact[],
  stages: PipelineStage[],
  readings: MetricReading[],
  highlights: WorkExperience['highlights'],
): Relationship[] {
  const relationships: Relationship[] = [];
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));

  // describes — architecture.ts explains the make-up of a stage he changed.
  // Gated on isContributed: a context-only stage appears in the diagram, but
  // nothing on this page claims to describe work that wasn't done there.
  const architecture = byId.get('architecture');
  if (architecture && architecture.kind === 'architecture') {
    for (const block of architecture.payload.blocks) {
      if (block.boundary) continue;
      const stage = stages.find((candidate) => candidate.id === block.id);
      if (!stage || !isContributed(stage)) continue;
      relationships.push({
        id: `architecture→${stage.id}`,
        from: 'architecture',
        to: stage.id,
        kind: 'describes',
        reason: block.description,
        restingVisible: true,
      });
    }
  }

  // measures — metrics.log reports a measurement a stage actually produced.
  // Spanning metrics are rendered in the artifact but generate no edge: they
  // belong to no single stage, which is what makes them spanning.
  if (byId.has('metrics')) {
    for (const reading of readings) {
      if (!reading.ownerIsStage) continue;
      if (!stages.some((stage) => stage.id === reading.ownerId)) continue;
      relationships.push({
        id: `metrics→${reading.ownerId}·${reading.id}`,
        from: 'metrics',
        to: reading.ownerId,
        kind: 'measures',
        reason: `${reading.label} · ${reading.value}`,
        restingVisible: true,
      });
    }
  }

  // evidences — the source sentence every stage was interpreted from. Never
  // drawn at rest; see Relationship.restingVisible.
  if (byId.has('source')) {
    for (const stage of stages) {
      const index = stage.sourceHighlights[0];
      const highlight = index === undefined ? undefined : highlights[index];
      if (!highlight) continue;
      relationships.push({
        id: `source→${stage.id}`,
        from: 'source',
        to: stage.id,
        kind: 'evidences',
        reason: highlight.text,
        restingVisible: false,
      });
    }
  }

  return relationships;
}

/**
 * The one entry point. Pure: same experience in, same workspace out, no
 * ordering or environment dependence — so a caller can memoize it on the
 * experience alone.
 */
export function buildExperienceWorkspace(experience: WorkExperience): ExperienceWorkspace {
  const visualization = experience.visualization;
  const stages = visualization.stages;

  // Stage measurements first, then spanning — metrics.log reads top to bottom
  // in pipeline order, which is the order a reader has just seen them in.
  const impact: MetricReading[] = [
    ...stages.flatMap((stage) => readingsFrom(stage, true)),
    ...(visualization.spanning ?? []).flatMap((group) => readingsFrom(group, false)),
  ];

  const artifacts = [
    buildArchitecture(visualization),
    buildMetrics(impact),
    buildShipped(visualization),
    buildSource(experience, WORK_HISTORY_FILE_ID),
  ].filter((artifact): artifact is Artifact => artifact !== undefined);

  return {
    identity: {
      company: experience.company,
      companyUrl: experience.companyUrl,
      role: experience.role,
      location: experience.location,
      startDate: experience.startDate,
      endDate: experience.endDate,
      duration: formatDuration(experience.startDate, experience.endDate),
      techCount: experience.tech.length,
      description: experience.description,
      title: visualization.title,
    },
    artifacts,
    relationships: buildRelationships(artifacts, stages, impact, experience.highlights),
    stages,
    impact,
    provenance: visualization.derivedFrom,
  };
}

/**
 * The VFS id americanchase.yaml is seeded under (src/content/workspaceSeed.ts)
 * — the same literal `claims.ts` already passes to `openFile`. Named here so
 * the source artifact's navigation target is stated once.
 */
export const WORK_HISTORY_FILE_ID = 'american_chase';
