import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  /** "*" or a comma separated list of origins. */
  CORS_ORIGIN: z.string().default('*'),
  /** A scorer lock with no activity for this long can be taken over by someone else. */
  SCORER_LOCK_TTL_SECONDS: z.coerce.number().int().min(30).default(120),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${lines.join('\n')}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();

export const corsOrigins = (e: Env = env): true | string[] =>
  e.CORS_ORIGIN.trim() === '*' ? true : e.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
