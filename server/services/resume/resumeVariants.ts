import type { ResumeData } from './resumeTypes';
import { fullstackAiResumeData } from './data/fullstackAi';

/**
 * Sprint 11: the backend's resume variant registry — mirrors
 * src/components/resume/variants/resumeRegistry.ts's shape and role.
 * Adding a new variant (AI Engineer, Backend, Software Engineer, ...) is
 * two steps: add a ResumeData file under data/, add one entry below.
 * Nothing in latexTemplate.ts or resumeCompiler.ts ever needs to change.
 */
export interface ResumeVariant {
  id: string;
  displayName: string;
  downloadFilename: string;
  data: ResumeData;
}

export const resumeVariants: ResumeVariant[] = [
  {
    id: 'fullstack-ai',
    displayName: 'FullStack+AI',
    downloadFilename: 'FullStack_AI_Arijit.pdf',
    data: fullstackAiResumeData,
  },
];

export const DEFAULT_RESUME_VARIANT_ID = 'fullstack-ai';

export function findResumeVariant(id: string): ResumeVariant | undefined {
  return resumeVariants.find((v) => v.id === id);
}
