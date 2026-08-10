import { Router } from 'express';
import { healthRouter } from './health.routes';
import { fsRouter } from './fs.routes';
import { feedbackRouter } from './feedback.routes';
import { visitorRouter } from './visitor.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(fsRouter);
apiRouter.use(feedbackRouter);
apiRouter.use(visitorRouter);
