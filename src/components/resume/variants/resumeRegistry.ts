import type { ResumeData } from '../../../content/resume';
import { fullstackAiResumeData } from '../data/fullstack-ai';

/**
 * Sprint 10F.5: the Resume Registry — the one place a resume variant is
 * declared, and the one place "which resume is canonical right now" is
 * answered. ResumeRenderer.tsx never imports a specific ResumeData; every
 * consumer (Resume Workspace, the Three.js preview, the PDF export,
 * RESUME.md's generated markdown, the left-panel overview) resolves its
 * data through getDefaultResumeVariant() here instead.
 *
 * Adding a new resume variant (AI Engineer, Backend, Software Engineer,
 * ...) is exactly two steps: add a ResumeData file under ../data/, add one
 * entry to `resumeVariants` below. Nothing in renderer/, specification/,
 * or export/ ever needs to change.
 */
export interface ResumeVariant {
  id: string;
  displayName: string;
  /** Filename the "Download PDF" action saves as — never hardcoded in export/resumeCapture.ts. */
  downloadFilename: string;
  data: ResumeData;
  metadata?: Record<string, unknown>;
}

export const resumeVariants: ResumeVariant[] = [
  {
    id: 'fullstack-ai',
    displayName: 'FullStack+AI',
    downloadFilename: 'FullStack_AI_Arijit.pdf',
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
