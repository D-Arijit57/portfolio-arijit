import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}
