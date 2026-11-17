import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './db/prisma';
import { logger } from './lib/logger';
import { LiveGateway } from './modules/live/live.gateway';

async function main() {
  const app = createApp();
  const httpServer = createServer(app);
  const gateway = new LiveGateway(httpServer);
  gateway.attach();

  httpServer.listen(env.PORT, () => logger.info(`API listening on :${env.PORT}`));

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    await gateway.close();
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((e) => {
  logger.error('Failed to start', e);
  process.exit(1);
});
