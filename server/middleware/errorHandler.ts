import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../types';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn('Handled request error', {
      path: req.originalUrl,
      status: err.statusCode,
      message: err.message,
    });
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected error';
  logger.error('Unhandled request error', { path: req.originalUrl, message });
  res.status(500).json({ error: message });
}
