import type { ResumeData } from '../../../content/resume';
import { fullstackAiResumeData } from '../data/fullstack-ai';

/**
 * Sprint 10F.5: the Resume Registry — the one place a resume variant is
 * declared, and the one place "which resume is canonical right now" is
 * answered. Every consumer (the left-panel overview, RESUME.md's generated
 * markdown) resolves its data through getDefaultResumeVariant() here
 * instead of importing a specific ResumeData directly.
 *
 * Adding a new resume variant (AI Engineer, Backend, Software Engineer,
 * ...) is exactly two steps: add a ResumeData file under ../data/, add one
 * entry to `resumeVariants` below. Nothing in renderer/, specification/,
 * or export/ ever needs to change.
 */
export interface ResumeVariant {
  id: string;
  displayName: string;
  /** Filename the "Download PDF" action saves as — matches the static asset at public/resume/. */
  downloadFilename: string;
  data: ResumeData;
  metadata?: Record<string, unknown>;
}

export const resumeVariants: ResumeVariant[] = [
  {
    id: 'fullstack-ai',
    displayName: 'FullStack+AI',
    downloadFilename: 'Arijit_Das_Resume.pdf',
    data: fullstackAiResumeData,
  },
];

/** The portfolio's canonical public resume — rendered by default everywhere a resume appears (Resume Workspace, Three.js preview, Download PDF, RESUME.md, the left-panel overview). */
export const DEFAULT_RESUME_VARIANT_ID = 'fullstack-ai';

export function getResumeVariant(id: string): ResumeVariant {
  const variant = resumeVariants.find((v) => v.id === id);
  if (!variant) {
    throw new Error(`Unknown resume variant: "${id}"`);
  }  
  return variant;
}

export function getDefaultResumeVariant(): ResumeVariant {
  return getResumeVariant(DEFAULT_RESUME_VARIANT_ID);
}
