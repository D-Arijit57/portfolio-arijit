import express, { type Express } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { requestLogger, notFoundHandler, errorHandler } from './middleware/index.js';
import { apiRouter } from './routes/index.js';

export function createApp(): Express {
  const app = express();

  // `credentials: true` (Visitor Count requirements iteration): the
  // visitor-ID and owner cookies only round-trip cross-origin (local dev's
  // :3000 frontend calling the :4000 API) with this set — production is
  // same-origin via vercel.json's rewrite and would work either way, but
  // local dev needs it for the counter to be testable at all. Harmless to
  // every other route: none of them read or set cookies.
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(requestLogger);

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
