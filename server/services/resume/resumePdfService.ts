import { createHash } from 'node:crypto';
import { NotFoundError } from '../../types';
import { logger } from '../../utils/logger';
import { findResumeVariant, type ResumeVariant } from './resumeVariants';
import { generateLatexSource } from './latexTemplate';
import { compileResumePdf } from './resumeCompiler';

/** Sprint 11.2 (lineage audit): a stable content fingerprint of a ResumeData object, independent of the variant's id/filename — lets a log line prove which *data* actually flowed through, not just which id was requested. */
function contentHash(data: unknown): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * Sprint 11: the one authoritative rendering pipeline —
 * ResumeVariant → LaTeX source → compiled PDF. This is the sole producer
 * of resume PDF bytes; both the Three.js preview and the Download button
 * consume its output through resume.routes.ts, never a second
 * implementation of their own (see resumeCompiler.ts's caching for why
 * calling this repeatedly for an unchanged variant is cheap).
 */
export class ResumePdfService {
  async getResumePdf(variantId: string): Promise<{ pdf: Buffer; variant: ResumeVariant }> {
    const variant = findResumeVariant(variantId);
    if (!variant) {
      throw new NotFoundError(`No resume variant found with id "${variantId}"`);
    }
    logger.info('[Resume] Variant resolved', {
      id: variant.id,
      displayName: variant.displayName,
      downloadFilename: variant.downloadFilename,
      dataContentHash: contentHash(variant.data),
    });
    const texSource = generateLatexSource(variant.data);
    logger.info('[Resume] LaTeX source generated', {
      id: variant.id,
      texHash: createHash('sha256').update(texSource).digest('hex'),
      texLength: texSource.length,
    });
    const pdf = await compileResumePdf(variant.id, texSource);
    return { pdf, variant };
  }
}
