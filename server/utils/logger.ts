import type { Logger, LogMeta } from '../types/logger.types';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  const timestamp = new Date().toISOString();
  const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${suffix}`;

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger: Logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  debug: (message, meta) => write('debug', message, meta),
};
