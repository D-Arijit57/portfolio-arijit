import type { Server } from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { providerRegistry } from './providers';
import { logger } from './utils/logger';

// VFS_DESIGN.md §11.4's "recurring scheduled interval" — deferred at Sprint
// 6B, now implemented (Sprint 10D.4) since generated content is expected to
// stay current for the life of a long-running process, not just refresh
// once at boot. 15 minutes is comfortably inside every provider's rate
// limits: GitHub's Search API (the tightest budget in use) allows 30
// authenticated requests/minute, and one refresh cycle issues at most one
// search request.
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

function registerShutdownHandlers(server: Server, refreshTimer: NodeJS.Timeout): void {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    clearInterval(refreshTimer);
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

  // Startup refresh, deliberately async/non-blocking (VFS_DESIGN.md §11.4):
  // must never gate the server listening or the frontend's vfsLoaded boot gate.
  void providerRegistry.refreshAll();

  const refreshTimer = setInterval(() => {
    void providerRegistry.refreshAll();
  }, REFRESH_INTERVAL_MS);

  registerShutdownHandlers(server, refreshTimer);
}

bootstrap();
