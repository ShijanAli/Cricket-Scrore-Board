import { PrismaClient, type Prisma } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/** One client per process (also survives tsx watch reloads). */
export const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma;

/**
 * Opening a database connection can take seconds when the database is far away (Neon cold start + TLS),
 * and the first request after an idle period pays that. So: open a few connections up front, and ping them
 * so neither the pool nor a serverless database goes to sleep between requests.
 */
const WARM_CONNECTIONS = 4;
const KEEP_ALIVE_MS = 30_000;

export async function warmDatabase(): Promise<void> {
  const ping = () => Promise.all(Array.from({ length: WARM_CONNECTIONS }, () => prisma.$queryRaw`SELECT 1`));
  await ping();
  setInterval(() => void ping().catch(() => undefined), KEEP_ALIVE_MS).unref();
}

/** Either the normal client or a transaction client, so services work inside $transaction. */
export type Db = PrismaClient | Prisma.TransactionClient;
