import { Router } from 'express';
import { healthRouter } from './health.routes';
import { fsRouter } from './fs.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(fsRouter);
