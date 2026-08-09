import { Router } from 'express';
import { healthRouter } from './health.routes';
import { fsRouter } from './fs.routes';
import { feedbackRouter } from './feedback.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(fsRouter);
apiRouter.use(feedbackRouter);
