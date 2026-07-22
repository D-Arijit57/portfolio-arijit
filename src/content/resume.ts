/**
 * Sprint 10F.5: the resume's shared type/utility layer — the `ResumeData`
 * shape every variant conforms to, plus every transform that turns a
 * `ResumeData` into something else (RESUME.md's raw markdown, the
 * left-panel overview model, inline-emphasis parsing). This file owns no
 * resume content of its own anymore: each variant's actual data lives
 * under components/resume/data/ (e.g. fullstack-ai.ts), and
 * components/resume/variants/resumeRegistry.ts decides which variant is
 * canonical at any given time. Every consumer resolves data through that
 * registry (typically `getDefaultResumeVariant().data`) rather than
 * importing one hardcoded object — that's what lets a new variant plug in
 * without touching this file, the renderer, or the spec.
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
}

export interface ResumeProject {
  name: string;
  techStack: string[];
  link?: ResumeLink;
  dateRange: string;
  /** Full bullet list — used verbatim by the full preview/PDF. */
  highlights: string[];
  /** Single-line condensation of `highlights` for the overview only — derived, not new facts. */
  oneLiner: string;
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
  /** Career-highlight labels for the overview only — themes already present in `experience`/`projects`, not new claims. */
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

function bold(text: string): string {
  return `**${text}**`;
}

/**
 * Splits a `**bold**`-marked string into plain/bold segments — the one
 * place that interprets a resume variant's inline emphasis as JSX, reused
 * by ResumeRenderer.tsx (3D/PDF) and ResumeOverview.tsx (left panel) so
 * neither hardcodes its own `<b>` spans. Deliberately not a full markdown
 * parser: resume content only ever uses `**bold**`, nothing else needs
 * support.
 */
export function renderInlineMarkdown(text: string): (string | { bold: string })[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part);
    return match ? { bold: match[1] } : part;
  });
}

/**
 * Regenerates RESUME.md's exact markdown text from a resume variant's
 * `ResumeData` — the VFS file's content is a generated artifact of this
 * data, not hand-typed
 * separately (see workspaceSeed.ts). Output matches the previously
 * hand-written RESUME_MARKDOWN string byte-for-byte; the server's own copy
 * (server/repositories/seed/workspaceSeed.ts) stays a literal duplicate of
 * this function's output, per this repo's existing "no frontend imports in
 * the backend seed" convention — same reasoning as every other seed file.
 */
export function generateResumeMarkdown(data: ResumeData): string {
  const { basics, summary, skills, experience, projects, education, achievements } = data;
  const lines: string[] = [];

  lines.push(`# ${basics.name}`, '');
  lines.push(
    `${basics.contact.phone} | ${basics.contact.email} | [${basics.contact.linkedin.label}](${basics.contact.linkedin.url}) | [${basics.contact.github.label}](${basics.contact.github.url})`,
    ''
  );

  lines.push('## Summary', '', summary, '');

  lines.push('## Education', '');
  for (const edu of education) {
    lines.push(`${bold(edu.institution)} — ${edu.dateRange}`);
    lines.push(`*${edu.degree}* — ${edu.detail}`, '');
  }

  lines.push('## Technical Skills', '');
  lines.push(...skills.map((g) => `- ${bold(g.category + ':')} ${g.items.join(', ')}`), '');

  lines.push('## Experience', '');
  for (const job of experience) {
    lines.push(`${bold(job.company)} — ${job.startDate} – ${job.endDate}`);
    lines.push(`*${job.role}* — ${job.location}`, '');
    lines.push(...job.highlights.map((h) => `- ${h}`), '');
  }

  lines.push('## Projects', '');
  for (const project of projects) {
    const linkPart = project.link ? ` | [${project.link.label}]` : '';
    lines.push(`${bold(project.name)} | ${project.techStack.join(', ')}${linkPart} — ${project.dateRange}`, '');
    lines.push(...project.highlights.map((h) => `- ${h}`), '');
  }

  lines.push('## Achievements & Certifications', '');
  lines.push(...achievements.map((a) => `- ${bold(a.title + ':')} ${a.description}`));

  return lines.join('\n') + '\n';
}

export interface ResumeOverviewModel {
  name: string;
  title: string;
  contact: ResumeContact;
  summary: string;
  highlights: string[];
  skills: ResumeSkillGroup[];
  featuredProjects: { name: string; oneLiner: string; techStack: string[] }[];
  education: { institution: string; degree: string; dateRange: string }[];
}

const MAX_FEATURED_PROJECTS = 3;

/**
 * Condensed view for the left-panel overview (ResumeOverview.tsx) — the
 * "Parser/Transformer -> Overview Model" step. Never hand-authored
 * separately from the selected variant's data: featured projects/
 * education/skills are all sliced or reshaped from the same arrays the
 * full preview reads, so they can't drift out of sync with a resume update.
 */
export function getResumeOverview(data: ResumeData): ResumeOverviewModel {
  return {
    name: data.basics.name,
    title: data.basics.title,
    contact: data.basics.contact,
    summary: data.summary,
    highlights: data.highlights,
    skills: data.skills,
    featuredProjects: data.projects.slice(0, MAX_FEATURED_PROJECTS).map((p) => ({
      name: p.name,
      oneLiner: p.oneLiner,
      techStack: p.techStack,
    })),
    education: data.education.map((e) => ({ institution: e.institution, degree: e.degree, dateRange: e.dateRange })),
  };
}
