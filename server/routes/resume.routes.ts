import { Router } from 'express';
import { resumePdfService } from '../composition';
import { logger } from '../utils/logger';

/**
 * Sprint 11: the one endpoint that produces resume PDF bytes. Both the
 * Three.js preview (rendered via pdf.js from these same bytes) and the
 * Download button (which saves these same bytes directly, no client-side
 * regeneration) call this — there is no second code path that produces a
 * resume PDF.
 */
export const resumeRouter = Router();

resumeRouter.get('/resume/:variantId.pdf', async (req, res, next) => {
  logger.info('[Resume] Request received', { variantId: req.params.variantId });
  try {
    const { pdf, variant } = await resumePdfService.getResumePdf(req.params.variantId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${variant.downloadFilename}"`);
    res.status(200).send(pdf);
    logger.info('[Resume] Response complete', { variantId: variant.id, bytesSent: pdf.length });
  } catch (err) {
    next(err);
  }
});
