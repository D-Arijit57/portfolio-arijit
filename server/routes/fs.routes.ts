import { Router } from 'express';
import { InMemoryFileNodeRepository, workspaceSeed } from '../repositories';
import { FileSystemService } from '../services';
import { BadRequestError } from '../types';

export const fsRouter = Router();

// Composition root for the VFS API layer: the route file is the only place
// that wires a concrete FileNodeRepository into FileSystemService — routes
// call the service exclusively from here on (VFS_DESIGN.md §3/§4).
const repository = new InMemoryFileNodeRepository(workspaceSeed);
const fileSystemService = new FileSystemService(repository);

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
