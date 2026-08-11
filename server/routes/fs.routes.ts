import { Router } from 'express';
import { fileSystemService } from '../composition.js';
import { providerRegistry } from '../providers/index.js';
import { BadRequestError } from '../types/index.js';

export const fsRouter = Router();

// Reads (not the PUT below, which only ever touches static content) wait for
// the first ContentProvider refresh cycle to finish before serving the tree.
// On a long-running process this resolves almost immediately after boot and
// stays resolved forever, so it's a no-op here in steady state; on Vercel's
// serverless runtime it's what actually keeps the GitHub fetches
// alive long enough to finish — see api/index.ts's comment on refreshAllOnce().
fsRouter.get('/fs/tree', async (_req, res, next) => {
  try {
    await providerRegistry.refreshAllOnce();
    const tree = await fileSystemService.getFullTree();
    res.status(200).json(tree);
  } catch (err) {
    next(err);
  }
});

fsRouter.get('/fs/file/:id', async (req, res, next) => {
  try {
    await providerRegistry.refreshAllOnce();
    const file = await fileSystemService.getFileById(req.params.id);
    res.status(200).json(file);
  } catch (err) {
    next(err);
  }
});

fsRouter.put('/fs/file/:id', async (req, res, next) => {
  try {
    const { content } = req.body as { content?: unknown };
    if (typeof content !== 'string') {
      throw new BadRequestError('Request body must include "content" as a string');
    }
    const file = await fileSystemService.updateFile(req.params.id, content);
    res.status(200).json(file);
  } catch (err) {
    next(err);
  }
});
