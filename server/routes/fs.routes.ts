import { Router } from 'express';
import { fileSystemService } from '../composition';
import { BadRequestError } from '../types';

export const fsRouter = Router();

fsRouter.get('/fs/tree', async (_req, res, next) => {
  try {
    const tree = await fileSystemService.getFullTree();
    res.status(200).json(tree);
  } catch (err) {
    next(err);
  }
});

fsRouter.get('/fs/file/:id', async (req, res, next) => {
  try {
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
