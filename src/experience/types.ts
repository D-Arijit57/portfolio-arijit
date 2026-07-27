/**
 * Domain model for the Career Roadmap — the same "structured model is the
 * source of truth, the renderer only reads it" philosophy as the
 * Architecture Platform (src/architecture/types.ts) and the Manifest
 * Viewer (src/manifest/types.ts), applied to work history instead.
 */

/** Subtle accent palette every dashboard section picks from — never a full colored background, just an icon/border tint. */
export type DashboardAccent = 'blue' | 'green' | 'purple' | 'yellow';

export interface ImpactMetric {
  /** Key into src/components/experience/dashboardIcons.ts's icon map. */
  icon: string;
  value: string;
  label: string;
  accent: DashboardAccent;
}

export interface SkillFocusItem {
  label: string;
  /** 0-100. Self-assessed metadata, not derived from the YAML — see the field's own doc comment on WorkExperience. */
  percent: number;
}

export interface WorkExperience {
  company: string;
  /** Official company website — also the external-link destination on the experience card. */
  companyUrl: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string | 'Present';
  tech: string[];
  highlights: string[];

  /**
   * Dashboard-only interpretive layer (Impact Dashboard redesign) — a human
   * reading of the same highlights above, restated as scannable metrics and
   * skill weighting. Intentionally separate from `highlights`: the
   * dashboard is meant to *summarize*, not duplicate, the YAML prose, and
   * `skills[].percent` isn't something a few sentences of prose can be
   * mechanically parsed into. None of this renders in work_history.yaml's
   * displayed source — yamlRenderer.ts never reads these fields, so the
   * left editor is untouched by their presence. Both optional so an
   * experience can omit the dashboard layer entirely.
   */
  impact?: ImpactMetric[];
  skills?: SkillFocusItem[];
}
