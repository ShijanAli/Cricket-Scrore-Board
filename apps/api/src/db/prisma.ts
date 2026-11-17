import { PrismaClient, type Prisma } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/** One client per process (also survives tsx watch reloads). */
export const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma;

/** Either the normal client or a transaction client, so services work inside $transaction. */
export type Db = PrismaClient | Prisma.TransactionClient;
