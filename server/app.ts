import express, { type Express } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { requestLogger, notFoundHandler, errorHandler } from './middleware';
import { apiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use(requestLogger);

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
