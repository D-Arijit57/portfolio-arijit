/**
 * Sprint 11: the backend's own `ResumeData` shape — deliberately duplicated
 * from src/content/resume.ts's `ResumeData` interface rather than imported,
 * following this repo's existing "no frontend imports in the backend"
 * convention (see server/repositories/seed/workspaceSeed.ts's identical
 * duplication of the generated RESUME_MARKDOWN string, and the frontend
 * comment documenting why). Keep this shape in sync with the frontend
 * interface by hand if either ever changes.
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
  highlights: string[];
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
    title: string;
    contact: ResumeContact;
  };
  summary: string;
  highlights: string[];
  skills: ResumeSkillGroup[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducationEntry[];
  achievements: ResumeAchievement[];
}
