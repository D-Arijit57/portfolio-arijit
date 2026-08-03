/**
 * Sprint 10F.5: the resume's shared type layer — the `ResumeData` shape
 * every variant conforms to. This file owns no resume content of its own:
 * each variant's actual data lives under components/resume/data/ (e.g.
 * fullstack-ai.ts), and components/resume/variants/resumeRegistry.ts
 * decides which variant is canonical at any given time.
 *
 * This used to also hold `generateResumeMarkdown()` (produced the left
 * panel's raw markdown from this data) and `getResumeOverview()` (fed the
 * old left-panel resume overview component). Both are gone — the left
 * panel no longer renders a second copy of the resume, it renders
 * hire_me.md's CLI-report artifact instead (see
 * components/resume/HireMeDocumentView.tsx), so there is nothing left to
 * generate from this data for that purpose. `ResumeData`
 * itself survives because the right panel's variant registry
 * (variants/resumeRegistry.ts) still types its `data` field with it; the
 * 3D preview and PDF download remain driven by the static PDF asset, not
 * by this data, as they have been since Sprint 12.
 */

export interface ResumeLink {
  label: string;
  url?: string;
}

export interface ResumeContact {
  phone: string;
  email: string;
  linkedin: ResumeLink;
  github: ResumeLink;
  /** The one geographic fact the resume itself states (current role's location) — not a separate invented field. */
  location: string;
}

export interface ResumeSkillGroup {
  category: string;
  items: string[];
}

export interface ResumeExperience {
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  highlights: string[];
  /** Sprint 12 Phase 2: 1-3 short, scannable metrics already stated in `highlights` (e.g. "35% fewer defects") — not a new claim, currently unconsumed by any renderer. */
  impact?: string[];
}

export interface ResumeProject {
  name: string;
  techStack: string[];
  link?: ResumeLink;
  dateRange: string;
  /** Full bullet list — used verbatim by the full preview/PDF. */
  highlights: string[];
  /** Single-line condensation of `highlights` — derived, not new facts; currently unconsumed by any renderer. */
  oneLiner: string;
  /** Sprint 12 Phase 2: 1-3 short, scannable metrics already stated in `highlights` — not a new claim, currently unconsumed by any renderer. */
  impact?: string[];
}

export interface ResumeEducationEntry {
  institution: string;
  degree: string;
  dateRange: string;
  detail: string;
}

export interface ResumeAchievement {
  title: string;
  description: string;
}

export interface ResumeData {
  basics: {
    name: string;
    /** Sourced from the current/most recent role's title, not invented. */
    title: string;
    contact: ResumeContact;
  };
  summary: string;
  /** Career-highlight labels — themes already present in `experience`/`projects`, not new claims; currently unconsumed by any renderer. */
  highlights: string[];
  skills: ResumeSkillGroup[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducationEntry[];
  achievements: ResumeAchievement[];
}

// Sprint 10F.5: actual resume content has moved to variant files under
// components/resume/data/ (e.g. fullstack-ai.ts) — see
// components/resume/variants/resumeRegistry.ts for which variant is
// canonical. This file no longer holds a resume data object of its own.
