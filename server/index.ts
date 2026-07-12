import type { Server } from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { logger } from './utils/logger';

function registerShutdownHandlers(server: Server): void {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

async function bootstrap(): Promise<void> {
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`Backend listening on port ${config.port}`, { nodeEnv: config.nodeEnv });
  });

  registerShutdownHandlers(server);
}

bootstrap();
