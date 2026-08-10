import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { fsRouter } from './fs.routes.js';
import { feedbackRouter } from './feedback.routes.js';
import { visitorRouter } from './visitor.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(fsRouter);
apiRouter.use(feedbackRouter);
apiRouter.use(visitorRouter);
