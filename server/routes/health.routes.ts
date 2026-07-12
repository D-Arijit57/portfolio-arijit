import { Router } from 'express';
import type { HealthResponse } from '../types';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const body: HealthResponse = { status: 'ok' };
  res.status(200).json(body);
});
